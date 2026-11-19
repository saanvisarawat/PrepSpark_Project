import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { unauthorized } from "@/lib/session";
import type { Turn } from "@/lib/types";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const [sessions, topics, mistakes] = await Promise.all([
    prisma.interviewSession.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.topicPerformance.findMany({
      where: { userId: user.id },
      orderBy: { proficiency: "desc" },
    }),
    prisma.mistakeLog.findMany({
      where: { userId: user.id, resolved: false },
      orderBy: { frequency: "desc" },
      take: 6,
    }),
  ]);

  const list = sessions.map((s) => ({
    id: s.id,
    role: s.role,
    status: s.status,
    score: s.score,
    technicalScore: s.technicalScore,
    communicationScore: s.communicationScore,
    durationSec: s.durationSec,
    questions: (s.turns as unknown as Turn[]).filter((t) => t.answer).length,
    createdAt: s.createdAt.toISOString(),
  }));

  const completed = list.filter((s) => s.status === "completed");
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const average = completed.length
    ? completed.reduce((sum, s) => sum + s.score, 0) / completed.length
    : 0;

  return Response.json({
    sessions: list,
    topics: topics.map((t) => ({
      id: t.id,
      name: t.topicName,
      proficiency: t.proficiency,
      lastTested: t.lastTested.toISOString(),
    })),
    mistakes: mistakes.map((m) => ({ id: m.id, detail: m.mistakeDetail, frequency: m.frequency })),
    stats: {
      total: completed.length,
      average: Math.round(average),
      best: completed.length ? Math.max(...completed.map((s) => s.score)) : 0,
      thisMonth: completed.filter((s) => new Date(s.createdAt) >= monthStart).length,
    },
  });
}
