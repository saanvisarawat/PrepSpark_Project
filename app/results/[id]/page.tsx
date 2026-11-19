"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import Backdrop from "../../components/Backdrop";
import ScoreRing from "../../components/ScoreRing";
import { api, formatDate, formatDuration, tone } from "@/lib/client";
import type { SessionView } from "@/lib/types";

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [session, setSession] = useState<SessionView | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ session: SessionView }>(`/api/interview/${id}`)
      .then((d) => setSession(d.session))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load results"));
  }, [id]);

  if (error) {
    return (
      <main className="page">
        <div className="wrap-narrow">
          <p className="error">{error}</p>
          <Link href="/dashboard" className="btn btn-quiet btn-sm">
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="page">
        <div className="wrap">
          <div className="skeleton" style={{ height: 220, marginBottom: 20 }} />
          <div className="skeleton" style={{ height: 320 }} />
        </div>
      </main>
    );
  }

  const ev = session.evaluation;

  if (!ev || session.status !== "completed") {
    return (
      <main className="page">
        <div className="wrap-narrow">
          <h1 className="h2" style={{ marginBottom: 14 }}>
            This interview is not finished
          </h1>
          <Link href={`/interview/${session.id}`} className="btn btn-primary">
            Continue interview
          </Link>
        </div>
      </main>
    );
  }

  const spoken = session.turns.filter((t) => t.source === "voice" && t.wpm > 0);
  const avgWpm = spoken.length
    ? Math.round(spoken.reduce((s, t) => s + t.wpm, 0) / spoken.length)
    : 0;
  const fillers = spoken.reduce((s, t) => s + t.fillerCount, 0);

  const breakdown = [
    ["Technical", ev.technicalScore],
    ["Communication", ev.communicationScore],
    ["Confidence", ev.confidenceScore],
    ["Problem solving", ev.problemSolvingScore],
  ] as const;

  return (
    <main className="page">
      <Backdrop opacity={0.28} />
      <div className="wrap fade-in">
        <span className="eyebrow">
          {session.role} · {formatDate(session.createdAt)} · {formatDuration(session.durationSec)}
        </span>
        <h1 className="h1" style={{ margin: "10px 0 32px" }}>
          Interview results
        </h1>

        <div className="panel" style={{ marginBottom: 20 }}>
          <div
            className="row"
            style={{ gap: 40, alignItems: "center", flexWrap: "wrap" }}
          >
            <ScoreRing score={ev.overallScore} />
            <div style={{ flex: 1, minWidth: 260 }}>
              <p style={{ lineHeight: 1.65, color: "var(--body)", marginBottom: 22 }}>
                {ev.summary}
              </p>
              <div className="cols-2" style={{ columnGap: 32, rowGap: 14 }}>
                {breakdown.map(([label, value]) => (
                  <div key={label}>
                    <div className="row between" style={{ marginBottom: 6, fontSize: "0.9rem" }}>
                      <span className="muted">{label}</span>
                      <span className="mono">{value}</span>
                    </div>
                    <div className="bar">
                      <i className={tone(value)} style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {spoken.length > 0 && (
          <div className="cols-4" style={{ marginBottom: 20 }}>
            <div className="stat">
              <p className="stat-label">Speaking pace</p>
              <p className="stat-value">
                {avgWpm}
                <small>wpm</small>
              </p>
            </div>
            <div className="stat">
              <p className="stat-label">Filler words</p>
              <p className="stat-value">{fillers}</p>
            </div>
            <div className="stat">
              <p className="stat-label">Spoken answers</p>
              <p className="stat-value">
                {spoken.length}
                <small>of {session.turns.length}</small>
              </p>
            </div>
            <div className="stat">
              <p className="stat-label">Speaking time</p>
              <p className="stat-value" style={{ fontSize: "1.5rem" }}>
                {formatDuration(spoken.reduce((s, t) => s + t.durationSec, 0))}
              </p>
            </div>
          </div>
        )}

        <div className="cols-2" style={{ marginBottom: 20, alignItems: "start" }}>
          <div className="panel-flat">
            <h2 style={{ fontSize: "1.1rem", marginBottom: 16 }}>What went well</h2>
            {ev.strengths.length ? (
              <ul className="bullets">
                {ev.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">Nothing stood out this time.</p>
            )}
          </div>
          <div className="panel-flat">
            <h2 style={{ fontSize: "1.1rem", marginBottom: 16 }}>Where it fell short</h2>
            {ev.weaknesses.length ? (
              <ul className="bullets warn">
                {ev.weaknesses.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">No clear weak spots.</p>
            )}
          </div>
        </div>

        {ev.suggestions.length > 0 && (
          <div className="panel-flat" style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: "1.1rem", marginBottom: 16 }}>What to practise next</h2>
            <ul className="bullets tip">
              {ev.suggestions.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {ev.topics.length > 0 && (
          <div className="panel-flat" style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: "1.1rem", marginBottom: 20 }}>Topics in this interview</h2>
            <div className="cols-2" style={{ columnGap: 40 }}>
              {ev.topics.map((t) => (
                <div key={t.name} style={{ marginBottom: 14 }}>
                  <div className="row between" style={{ marginBottom: 6, fontSize: "0.92rem" }}>
                    <span>{t.name}</span>
                    <span className="mono dim">{t.score}</span>
                  </div>
                  <div className="bar">
                    <i className={tone(t.score)} style={{ width: `${t.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="panel-flat" style={{ padding: "8px 28px" }}>
          <h2 style={{ fontSize: "1.1rem", padding: "20px 0 4px" }}>Transcript</h2>
          {session.turns.map((t, i) => (
            <div className="transcript-item" key={i}>
              <div className="row between" style={{ marginBottom: 10 }}>
                <p className="who">Question {i + 1}</p>
                {t.rating && <span className={`pill pill-${t.rating}`}>{t.rating}</span>}
              </div>
              <p style={{ fontWeight: 600, lineHeight: 1.5, marginBottom: 16 }}>{t.question}</p>
              <p className="who">Your answer{t.source === "voice" ? " (spoken)" : ""}</p>
              <p style={{ color: "var(--body)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                {t.answer}
              </p>
              {t.feedback && (
                <div className="inset" style={{ marginTop: 14 }}>
                  <p className="who">Feedback</p>
                  <p style={{ lineHeight: 1.6 }}>{t.feedback}</p>
                </div>
              )}
              {t.source === "voice" && t.wpm > 0 && (
                <p className="mono dim" style={{ fontSize: "0.78rem", marginTop: 10 }}>
                  {t.wpm} wpm · {t.fillerCount} fillers · {formatDuration(t.durationSec)}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="row" style={{ gap: 12, marginTop: 28, flexWrap: "wrap" }}>
          <Link href="/setup" className="btn btn-primary">
            Practise again
          </Link>
          <Link href="/history" className="btn btn-quiet">
            View history
          </Link>
        </div>
      </div>
    </main>
  );
}
