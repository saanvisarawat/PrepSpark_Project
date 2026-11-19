import type { InterviewSession } from "@prisma/client";
import prisma from "./prisma";
import type { Evaluation, SessionView, Turn } from "./types";

export function toView(session: InterviewSession): SessionView {
  return {
    id: session.id,
    role: session.role,
    status: session.status,
    turns: (session.turns as unknown as Turn[]) ?? [],
    evaluation: (session.evaluation as unknown as Evaluation | null) ?? null,
    score: session.score,
    technicalScore: session.technicalScore,
    communicationScore: session.communicationScore,
    confidence: session.confidence,
    durationSec: session.durationSec,
    createdAt: session.createdAt.toISOString(),
    completedAt: session.completedAt ? session.completedAt.toISOString() : null,
  };
}

export async function getOwnedSession(id: string, userId: string) {
  return prisma.interviewSession.findFirst({ where: { id, userId } });
}

export const unauthorized = () =>
  Response.json({ error: "Not signed in" }, { status: 401 });

export const notFound = () =>
  Response.json({ error: "Interview not found" }, { status: 404 });
