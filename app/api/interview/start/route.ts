import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { firstQuestion } from "@/lib/engine";
import { loadMemory, memoryToPrompt } from "@/lib/memory";
import { unauthorized } from "@/lib/session";
import { ROLES, type Turn } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const body = await req.json();
    const role = String(body.role ?? "");
    const resumeText = String(body.resumeText ?? "").trim();

    if (!ROLES.some((r) => r.id === role)) {
      return Response.json({ error: "Choose a valid role" }, { status: 400 });
    }
    if (resumeText.length < 40) {
      return Response.json({ error: "Upload a resume first" }, { status: 400 });
    }

    const memory = await loadMemory(user.id);
    const first = await firstQuestion(role, resumeText, memoryToPrompt(memory));

    const turn: Turn = {
      question: first.question,
      topic: first.topic,
      answer: "",
      source: "typed",
      feedback: "",
      rating: "",
      wpm: 0,
      fillerCount: 0,
      durationSec: 0,
    };

    const session = await prisma.interviewSession.create({
      data: {
        userId: user.id,
        role,
        resumeText: resumeText.slice(0, 20000),
        turns: [turn] as unknown as object,
      },
    });

    return Response.json({ id: session.id });
  } catch (error) {
    console.error("start", error);
    return Response.json({ error: "Could not start the interview" }, { status: 500 });
  }
}
