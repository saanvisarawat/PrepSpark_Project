"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Backdrop from "../components/Backdrop";
import { api, formatDate, tone, type HistoryData } from "@/lib/client";

interface Me {
  user: { name: string };
}

export default function DashboardPage() {
  const [data, setData] = useState<HistoryData | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api<HistoryData>("/api/interview/history"), api<Me>("/api/auth/me")])
      .then(([history, me]) => {
        setData(history);
        setName(me.user.name.split(" ")[0]);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load your data"));
  }, []);

  const recent = data?.sessions.filter((s) => s.status === "completed").slice(0, 4) ?? [];
  const weakest = data ? [...data.topics].sort((a, b) => a.proficiency - b.proficiency).slice(0, 5) : [];

  return (
    <main className="page">
      <Backdrop opacity={0.28} />
      <div className="wrap fade-in">
        <div className="row between" style={{ flexWrap: "wrap", gap: 20, marginBottom: 36 }}>
          <div>
            <span className="eyebrow">Dashboard</span>
            <h1 className="h1" style={{ marginTop: 10 }}>
              {name ? `Hi, ${name}` : "Dashboard"}
            </h1>
          </div>
          <Link href="/setup" className="btn btn-primary">
            Start a new interview
          </Link>
        </div>

        {error && <p className="error">{error}</p>}

        {!data && !error && (
          <div className="cols-4" style={{ marginBottom: 28 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 96 }} />
            ))}
          </div>
        )}

        {data && (
          <>
            <div className="cols-4" style={{ marginBottom: 28 }}>
              <Stat label="Interviews" value={data.stats.total} />
              <Stat label="Average" value={data.stats.total ? data.stats.average : "-"} unit="/100" />
              <Stat label="Best" value={data.stats.total ? Math.round(data.stats.best) : "-"} unit="/100" />
              <Stat label="This month" value={data.stats.thisMonth} />
            </div>

            {data.stats.total === 0 ? (
              <div className="panel" style={{ textAlign: "center", padding: "56px 24px" }}>
                <h2 className="h2" style={{ marginBottom: 12 }}>
                  No interviews yet
                </h2>
                <p className="lede" style={{ margin: "0 auto 24px" }}>
                  Your first session takes about fifteen minutes. Scores, weak topics and
                  repeated mistakes will show up here afterwards.
                </p>
                <Link href="/setup" className="btn btn-primary">
                  Start your first interview
                </Link>
              </div>
            ) : (
              <div className="cols-2" style={{ alignItems: "start" }}>
                <div className="panel-flat">
                  <div className="row between" style={{ marginBottom: 8 }}>
                    <h2 style={{ fontSize: "1.1rem" }}>Recent interviews</h2>
                    <Link href="/history" className="muted" style={{ fontSize: "0.9rem" }}>
                      View all
                    </Link>
                  </div>
                  {recent.map((s) => (
                    <Link href={`/results/${s.id}`} key={s.id} className="list-row">
                      <div>
                        <p style={{ fontWeight: 600 }}>{s.role}</p>
                        <p className="dim" style={{ fontSize: "0.85rem" }}>
                          {formatDate(s.createdAt)}
                        </p>
                      </div>
                      <span className="hide-sm" />
                      <span className={`score-chip ${tone(s.score)}`}>{Math.round(s.score)}</span>
                    </Link>
                  ))}
                </div>

                <div className="panel-flat">
                  <h2 style={{ fontSize: "1.1rem", marginBottom: 18 }}>Topics to revisit</h2>
                  {weakest.length === 0 && <p className="muted">Nothing tracked yet.</p>}
                  {weakest.map((t) => (
                    <div key={t.id} style={{ marginBottom: 16 }}>
                      <div className="row between" style={{ marginBottom: 6, fontSize: "0.92rem" }}>
                        <span>{t.name}</span>
                        <span className="mono dim">{Math.round(t.proficiency)}</span>
                      </div>
                      <div className="bar">
                        <i className={tone(t.proficiency)} style={{ width: `${t.proficiency}%` }} />
                      </div>
                    </div>
                  ))}

                  {data.mistakes.length > 0 && (
                    <>
                      <h3
                        style={{ fontSize: "0.95rem", margin: "26px 0 12px", color: "var(--muted)" }}
                      >
                        Mistakes you keep making
                      </h3>
                      <ul className="bullets warn">
                        {data.mistakes.slice(0, 3).map((m) => (
                          <li key={m.id}>
                            {m.detail}
                            {m.frequency > 1 && (
                              <span className="mono dim" style={{ fontSize: "0.78rem" }}>
                                {" "}
                                x{m.frequency}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value, unit }: { label: string; value: number | string; unit?: string }) {
  return (
    <div className="stat">
      <p className="stat-label">{label}</p>
      <p className="stat-value">
        {value}
        {unit && <small>{unit}</small>}
      </p>
    </div>
  );
}
