import { chatJson } from "./groq";
import { QUESTION_LIMIT, type Evaluation, type Rating, type Turn } from "./types";

const clamp = (value: unknown, fallback = 0) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
};

const strings = (value: unknown, limit: number) =>
  Array.isArray(value)
    ? value
        .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
        .map((v) => v.trim())
        .slice(0, limit)
    : [];

const FALLBACK_QUESTIONS = [
  "Pick a project from your resume and walk me through the part you are least happy with, and what you would change.",
  "Describe a bug that took you a while to find. How did you narrow it down?",
  "If the app you built doubled its traffic tomorrow, what would break first and why?",
];

const resumeBlock = (resume: string) => resume.trim().slice(0, 9000) || "No resume text was provided.";

const transcript = (turns: Turn[]) =>
  turns
    .map(
      (t, i) =>
        `Q${i + 1} [${t.topic || "general"}]: ${t.question}\nA${i + 1}: ${t.answer || "(no answer)"}`
    )
    .join("\n\n");

export async function firstQuestion(role: string, resume: string, memory: string) {
  const system = `You are a senior engineer interviewing a candidate for a ${role} position.
Resume:
${resumeBlock(resume)}
${memory ? `\nHistory from earlier practice sessions:\n${memory}\nUse it only when it fits the role and the resume.` : ""}

Ask ONE opening technical question grounded in a specific skill or project from the resume and relevant to the role. Be concrete, name the technology or project, and keep it under 40 words. Do not greet the candidate.
Reply as JSON: {"question": string, "topic": string}`;

  try {
    const data = await chatJson<{ question?: string; topic?: string }>(
      [{ role: "system", content: system }, { role: "user", content: "Begin." }],
      0.6
    );
    if (data.question?.trim()) {
      return { question: data.question.trim(), topic: (data.topic || "General").trim() };
    }
  } catch {}
  return {
    question: `Tell me about the project on your resume that is most relevant to a ${role} role and the main technical decision you made in it.`,
    topic: "Projects",
  };
}

export interface AnswerResult {
  rating: Rating;
  topic: string;
  feedback: string;
  nextQuestion: string;
  nextTopic: string;
}

export async function reviewAnswer(params: {
  role: string;
  resume: string;
  memory: string;
  turns: Turn[];
  wantNext: boolean;
}): Promise<AnswerResult> {
  const { role, resume, memory, turns, wantNext } = params;
  const answered = turns.length;
  const covered = Array.from(new Set(turns.map((t) => t.topic).filter(Boolean))).join(", ");

  const system = `You are a senior engineer running a live ${role} interview with exactly ${QUESTION_LIMIT} questions. ${answered} answered so far.
Resume:
${resumeBlock(resume)}
${memory ? `\nHistory from earlier practice sessions:\n${memory}\n` : ""}
Topics covered so far: ${covered || "none"}.

Judge the candidate's latest answer as "strong", "partial" or "weak" for technical accuracy and depth.
Write "feedback": one or two plain sentences addressed to the candidate. Say what was right or missing. Do not give the full model answer and do not mention ratings.
${
  wantNext
    ? `Write "nextQuestion" using these rules:
- weak: stay on the same topic, simplify or diagnose the missing fundamental.
- partial: ask a targeted question about the exact missing piece.
- strong: raise the difficulty on the same topic or move to a different skill from the resume.
- If the answer repeats a recurring mistake from the history, approach that concept from another angle.
- Never repeat a question already asked. Under 40 words. One question only.`
    : `This was the final question, so set "nextQuestion" to an empty string.`
}
Reply as JSON: {"rating": "strong"|"partial"|"weak", "topic": string, "feedback": string, "nextQuestion": string, "nextTopic": string}
"topic" names the concept the latest answer was about. "nextTopic" names the concept of the next question.`;

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: system },
  ];
  turns.forEach((t) => {
    messages.push({ role: "assistant", content: t.question });
    if (t.answer) messages.push({ role: "user", content: t.answer });
  });

  const fallbackQuestion = FALLBACK_QUESTIONS[answered % FALLBACK_QUESTIONS.length];

  try {
    const data = await chatJson<Partial<AnswerResult>>(messages, 0.5);
    const rating: Rating =
      data.rating === "strong" || data.rating === "partial" || data.rating === "weak"
        ? data.rating
        : "partial";
    const nextQuestion = wantNext ? data.nextQuestion?.trim() || fallbackQuestion : "";
    return {
      rating,
      topic: (data.topic || turns[turns.length - 1]?.topic || "General").trim(),
      feedback: data.feedback?.trim() || "Answer recorded.",
      nextQuestion,
      nextTopic: (data.nextTopic || "General").trim(),
    };
  } catch {
    return {
      rating: "",
      topic: turns[turns.length - 1]?.topic || "General",
      feedback: "Answer recorded.",
      nextQuestion: wantNext ? fallbackQuestion : "",
      nextTopic: "General",
    };
  }
}

export async function finalEvaluation(params: {
  role: string;
  resume: string;
  turns: Turn[];
  openMistakes: { id: string; mistakeDetail: string }[];
}): Promise<{ evaluation: Evaluation; resolvedIds: string[] }> {
  const { role, resume, turns, openMistakes } = params;

  const speech = turns
    .filter((t) => t.source === "voice" && t.wpm > 0)
    .map((t, i) => `Voice answer ${i + 1}: ${t.wpm} wpm, ${t.fillerCount} filler words`)
    .join("\n");

  const system = `You are a strict but fair interview evaluator reviewing a completed ${role} mock interview.
Resume:
${resumeBlock(resume)}

Transcript:
${transcript(turns)}

${speech ? `Speech metrics:\n${speech}\n` : ""}
${
  openMistakes.length
    ? `Open mistakes from earlier sessions:\n${openMistakes.map((m) => `${m.id}: ${m.mistakeDetail}`).join("\n")}\n`
    : ""
}
Score every value from 0 to 100. Compare answers against the difficulty of each question; a strong answer to a hard follow up counts for more than a memorised definition. Do not score on length. Judge communication on clarity and structure, and use speech metrics only as supporting evidence.
Reply as JSON:
{
 "overallScore": number,
 "technicalScore": number,
 "communicationScore": number,
 "confidenceScore": number,
 "problemSolvingScore": number,
 "summary": "two sentences",
 "strengths": [string, up to 4],
 "weaknesses": [string, up to 4],
 "suggestions": [string, up to 4, specific things to practise],
 "topics": [{"name": string, "score": number}],
 "mistakes": [string, up to 3, concrete technical errors the candidate made],
 "resolvedMistakeIds": [ids from the open mistakes that the candidate clearly got right this time]
}`;

  const data = await chatJson<Record<string, unknown>>(
    [{ role: "system", content: system }, { role: "user", content: "Evaluate the interview." }],
    0.2
  );

  const topics = Array.isArray(data.topics)
    ? data.topics
        .map((t) => {
          const item = t as { name?: unknown; score?: unknown };
          return { name: typeof item.name === "string" ? item.name : "", score: clamp(item.score, 50) };
        })
        .filter((t) => t.name.trim())
        .slice(0, 8)
    : [];

  const valid = new Set(openMistakes.map((m) => m.id));
  const resolvedIds = strings(data.resolvedMistakeIds, 10).filter((id) => valid.has(id));

  return {
    evaluation: {
      overallScore: clamp(data.overallScore),
      technicalScore: clamp(data.technicalScore),
      communicationScore: clamp(data.communicationScore),
      confidenceScore: clamp(data.confidenceScore),
      problemSolvingScore: clamp(data.problemSolvingScore),
      summary: typeof data.summary === "string" ? data.summary : "",
      strengths: strings(data.strengths, 4),
      weaknesses: strings(data.weaknesses, 4),
      suggestions: strings(data.suggestions, 4),
      topics,
      mistakes: strings(data.mistakes, 3),
    },
    resolvedIds,
  };
}
