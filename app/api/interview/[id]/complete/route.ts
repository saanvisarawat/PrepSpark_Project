import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { finalEvaluation } from "@/lib/engine";
import { applyEvaluationToMemory } from "@/lib/memory";
import { getOwnedSession, notFound, toView, unauthorized } from "@/lib/session";
import type { Turn } from "@/lib/types";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { id } = await params;
    const session = await getOwnedSession(id, user.id);
    if (!session) return notFound();

    if (session.status === "completed") {
      return Response.json({ session: toView(session) });
    }

    const answered = (session.turns as unknown as Turn[]).filter((t) => t.answer);
    if (answered.length === 0) {
      return Response.json({ error: "Answer at least one question first" }, { status: 400 });
    }

    const openMistakes = await prisma.mistakeLog.findMany({
      where: { userId: user.id, resolved: false },
      select: { id: true, mistakeDetail: true },
      take: 8,
    });

    const { evaluation, resolvedIds } = await finalEvaluation({
      role: session.role,
      resume: session.resumeText,
      turns: answered,
      openMistakes,
    });

    const now = new Date();
    const updated = await prisma.interviewSession.update({
      where: { id },
      data: {
        turns: answered as unknown as object,
        evaluation: evaluation as unknown as object,
        status: "completed",
        score: evaluation.overallScore,
        technicalScore: evaluation.technicalScore,
        communicationScore: evaluation.communicationScore,
        confidence: evaluation.confidenceScore,
        durationSec: Math.min(
          Math.round((now.getTime() - session.createdAt.getTime()) / 1000),
          60 * 60 * 3
        ),
        completedAt: now,
      },
    });

    await applyEvaluationToMemory(user.id, evaluation.topics, evaluation.mistakes, resolvedIds);

    return Response.json({ session: toView(updated) });
  } catch (error) {
    console.error("complete", error);
    return Response.json({ error: "Could not generate the evaluation" }, { status: 500 });
  }
}
