import prisma from "./prisma";
import type { TopicScore } from "./types";

export async function loadMemory(userId: string) {
  const [weakTopics, activeMistakes] = await Promise.all([
    prisma.topicPerformance.findMany({
      where: { userId },
      orderBy: { proficiency: "asc" },
      take: 3,
    }),
    prisma.mistakeLog.findMany({
      where: { userId, resolved: false },
      orderBy: { frequency: "desc" },
      take: 5,
    }),
  ]);
  return { weakTopics, activeMistakes };
}

export function memoryToPrompt(memory: Awaited<ReturnType<typeof loadMemory>>) {
  const lines: string[] = [];
  if (memory.weakTopics.length) {
    const list = memory.weakTopics
      .map((t) => `${t.topicName} (${Math.round(t.proficiency)}/100)`)
      .join(", ");
    lines.push(`Previously weak topics: ${list}.`);
  }
  if (memory.activeMistakes.length) {
    const list = memory.activeMistakes.map((m) => m.mistakeDetail).join("; ");
    lines.push(`Recurring mistakes not yet resolved: ${list}.`);
  }
  return lines.join("\n");
}

export async function applyEvaluationToMemory(
  userId: string,
  topics: TopicScore[],
  mistakes: string[],
  resolvedIds: string[]
) {
  const cleanTopics = topics
    .map((t) => ({ name: t.name.trim().slice(0, 60), score: t.score }))
    .filter((t) => t.name)
    .slice(0, 8);

  const existing = await prisma.topicPerformance.findMany({
    where: { userId, topicName: { in: cleanTopics.map((t) => t.name) } },
  });
  const current = new Map(existing.map((t) => [t.topicName, t.proficiency]));

  for (const topic of cleanTopics) {
    const previous = current.get(topic.name);
    const next =
      previous === undefined ? topic.score : previous * 0.6 + topic.score * 0.4;
    await prisma.topicPerformance.upsert({
      where: { userId_topicName: { userId, topicName: topic.name } },
      update: { proficiency: Math.round(next * 10) / 10 },
      create: { userId, topicName: topic.name, proficiency: topic.score },
    });
  }

  if (resolvedIds.length) {
    await prisma.mistakeLog.updateMany({
      where: { userId, id: { in: resolvedIds } },
      data: { resolved: true },
    });
  }

  for (const raw of mistakes.slice(0, 5)) {
    const detail = raw.trim().slice(0, 240);
    if (!detail) continue;
    const match = await prisma.mistakeLog.findFirst({
      where: {
        userId,
        resolved: false,
        mistakeDetail: { equals: detail, mode: "insensitive" },
      },
    });
    if (match) {
      await prisma.mistakeLog.update({
        where: { id: match.id },
        data: { frequency: { increment: 1 } },
      });
    } else {
      await prisma.mistakeLog.create({ data: { userId, mistakeDetail: detail } });
    }
  }
}
