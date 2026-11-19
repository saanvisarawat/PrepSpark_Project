import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { reviewAnswer } from "@/lib/engine";
import { loadMemory, memoryToPrompt } from "@/lib/memory";
import { getOwnedSession, notFound, unauthorized } from "@/lib/session";
import { QUESTION_LIMIT, type Turn } from "@/lib/types";

const num = (value: unknown, max: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n), max) : 0;
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { id } = await params;
    const session = await getOwnedSession(id, user.id);
    if (!session) return notFound();
    if (session.status !== "active") {
      return Response.json({ error: "This interview is already finished" }, { status: 409 });
    }

    const body = await req.json();
    const answer = String(body.answer ?? "").trim().slice(0, 6000);
    if (!answer) {
      return Response.json({ error: "Write or record an answer first" }, { status: 400 });
    }

    const turns = (session.turns as unknown as Turn[]).map((t) => ({ ...t }));
    const index = turns.length - 1;
    const current = turns[index];
    if (!current || current.answer) {
      return Response.json({ error: "No open question" }, { status: 409 });
    }

    const metrics = body.speechMetrics ?? {};
    current.answer = answer;
    current.source = body.source === "voice" ? "voice" : "typed";
    current.wpm = num(metrics.wpm, 400);
    current.fillerCount = num(metrics.fillerCount, 200);
    current.durationSec = num(metrics.durationSec, 1200);

    await prisma.interviewSession.update({
      where: { id },
      data: { turns: turns as unknown as object },
    });

    const isLast = turns.length >= QUESTION_LIMIT;
    const memory = await loadMemory(user.id);
    const review = await reviewAnswer({
      role: session.role,
      resume: session.resumeText,
      memory: memoryToPrompt(memory),
      turns,
      wantNext: !isLast,
    });

    current.rating = review.rating;
    current.feedback = review.feedback;
    if (review.topic) current.topic = review.topic;

    if (!isLast) {
      turns.push({
        question: review.nextQuestion,
        topic: review.nextTopic,
        answer: "",
        source: "typed",
        feedback: "",
        rating: "",
        wpm: 0,
        fillerCount: 0,
        durationSec: 0,
      });
    }

    await prisma.interviewSession.update({
      where: { id },
      data: { turns: turns as unknown as object },
    });

    return Response.json({
      feedback: review.feedback,
      rating: review.rating,
      nextQuestion: isLast ? null : review.nextQuestion,
      done: isLast,
      answered: index + 1,
    });
  } catch (error) {
    console.error("answer", error);
    return Response.json({ error: "Could not process the answer" }, { status: 500 });
  }
}
