export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body && !(init.body instanceof FormData)
      ? { "Content-Type": "application/json", ...init.headers }
      : init?.headers,
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : "Something went wrong";
    throw new Error(message);
  }
  return data as T;
}

export const tone = (score: number) =>
  score >= 75 ? "" : score >= 50 ? "amber" : "coral";

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDuration(seconds: number) {
  if (!seconds) return "-";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}

export function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export interface HistoryData {
  sessions: {
    id: string;
    role: string;
    status: string;
    score: number;
    technicalScore: number;
    communicationScore: number;
    durationSec: number;
    questions: number;
    createdAt: string;
  }[];
  topics: { id: string; name: string; proficiency: number; lastTested: string }[];
  mistakes: { id: string; detail: string; frequency: number }[];
  stats: { total: number; average: number; best: number; thisMonth: number };
}
