"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Backdrop from "../components/Backdrop";
import { api, formatDate, formatDuration, tone, type HistoryData } from "@/lib/client";

export default function HistoryPage() {
  const [data, setData] = useState<HistoryData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<HistoryData>("/api/interview/history")
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load history"));
  }, []);

  const trend = data
    ? data.sessions.filter((s) => s.status === "completed").slice(0, 10).reverse()
    : [];

  return (
    <main className="page">
      <Backdrop opacity={0.28} />
      <div className="wrap fade-in">
        <span className="eyebrow">History</span>
        <h1 className="h1" style={{ margin: "10px 0 32px" }}>
          Every interview you have taken
        </h1>

        {error && <p className="error">{error}</p>}
        {!data && !error && <div className="skeleton" style={{ height: 240 }} />}

        {data && data.sessions.length === 0 && (
          <div className="panel" style={{ textAlign: "center", padding: "48px 24px" }}>
            <p className="lede" style={{ margin: "0 auto 22px" }}>
              Completed interviews will be listed here.
            </p>
            <Link href="/setup" className="btn btn-primary">
              Start an interview
            </Link>
          </div>
        )}

        {trend.length > 1 && (
          <div className="panel-flat" style={{ marginBottom: 24 }}>
            <p className="stat-label" style={{ marginBottom: 18 }}>
              Score over your last {trend.length} interviews
            </p>
            <div
              role="img"
              aria-label="Bar chart of recent interview scores"
              style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 110 }}
            >
              {trend.map((s) => (
                <div
                  key={s.id}
                  title={`${Math.round(s.score)} on ${formatDate(s.createdAt)}`}
                  style={{
                    flex: 1,
                    height: `${Math.max(s.score, 4)}%`,
                    borderRadius: "6px 6px 2px 2px",
                    background:
                      s.score >= 75 ? "var(--green)" : s.score >= 50 ? "var(--amber)" : "var(--coral)",
                    opacity: 0.9,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {data && data.sessions.length > 0 && (
          <div className="panel-flat" style={{ padding: "8px 24px" }}>
            {data.sessions.map((s) => {
              const done = s.status === "completed";
              return (
                <Link
                  key={s.id}
                  href={done ? `/results/${s.id}` : `/interview/${s.id}`}
                  className="list-row"
                >
                  <div>
                    <p style={{ fontWeight: 600 }}>{s.role}</p>
                    <p className="dim" style={{ fontSize: "0.85rem" }}>
                      {formatDate(s.createdAt)} · {s.questions} answered
                      {done ? ` · ${formatDuration(s.durationSec)}` : ""}
                    </p>
                  </div>
                  {done ? (
                    <span className="hide-sm mono dim" style={{ fontSize: "0.82rem" }}>
                      T {Math.round(s.technicalScore)} · C {Math.round(s.communicationScore)}
                    </span>
                  ) : (
                    <span className="pill pill-partial">In progress</span>
                  )}
                  {done ? (
                    <span className={`score-chip ${tone(s.score)}`}>{Math.round(s.score)}</span>
                  ) : (
                    <span className="mono dim">Resume</span>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {data && data.topics.length > 0 && (
          <div className="panel-flat" style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: "1.1rem", marginBottom: 20 }}>Topic proficiency</h2>
            <div className="cols-2" style={{ columnGap: 40 }}>
              {data.topics.map((t) => (
                <div key={t.id} style={{ marginBottom: 14 }}>
                  <div className="row between" style={{ marginBottom: 6, fontSize: "0.92rem" }}>
                    <span>{t.name}</span>
                    <span className="mono dim">{Math.round(t.proficiency)}</span>
                  </div>
                  <div className="bar">
                    <i className={tone(t.proficiency)} style={{ width: `${t.proficiency}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
