"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Backdrop from "../../components/Backdrop";
import { api } from "@/lib/client";
import { QUESTION_LIMIT, type SessionView } from "@/lib/types";

const FILLERS = /\b(um+|uh+|er+|ah+|like|you know|basically|actually|literally|sort of|kind of)\b/gi;

interface AnswerResponse {
  feedback: string;
  rating: "strong" | "partial" | "weak" | "";
  nextQuestion: string | null;
  done: boolean;
}

type Phase = "loading" | "answering" | "submitting" | "feedback" | "finishing" | "error";

export default function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("loading");
  const [question, setQuestion] = useState("");
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [source, setSource] = useState<"typed" | "voice">("typed");
  const [feedback, setFeedback] = useState<AnswerResponse | null>(null);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [speak, setSpeak] = useState(false);
  const [typed, setTyped] = useState({ text: "", count: 0 });
  const shown = typed.text === question ? question.slice(0, typed.count) : "";

  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const spokenSeconds = useRef(0);

  const finish = useCallback(async () => {
    setPhase("finishing");
    try {
      await api(`/api/interview/${id}/complete`, { method: "POST" });
      router.replace(`/results/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate your results");
      setPhase("error");
    }
  }, [id, router]);

  useEffect(() => {
    let active = true;
    api<{ session: SessionView }>(`/api/interview/${id}`)
      .then(({ session }) => {
        if (!active) return;
        if (session.status === "completed") {
          router.replace(`/results/${id}`);
          return;
        }
        const open = session.turns.findIndex((t) => !t.answer);
        if (open === -1) {
          finish();
          return;
        }
        setQuestion(session.turns[open].question);
        setIndex(open);
        setPhase("answering");
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Could not load this interview");
        setPhase("error");
      });
    const pref = setTimeout(() => {
      try {
        setSpeak(localStorage.getItem("speak") === "1");
      } catch {}
    }, 0);
    return () => {
      active = false;
      clearTimeout(pref);
    };
  }, [id, router, finish]);

  useEffect(() => {
    if (!question) return;
    let i = 0;
    const tick = setInterval(() => {
      i += 2;
      setTyped({ text: question, count: i });
      if (i >= question.length) clearInterval(tick);
    }, 18);
    return () => clearInterval(tick);
  }, [question]);

  useEffect(() => {
    if (!speak || !question || phase !== "answering") return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(question));
    return () => window.speechSynthesis.cancel();
  }, [speak, question, phase]);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      stream.current?.getTracks().forEach((t) => t.stop());
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    },
    []
  );

  const toggleSpeak = () => {
    const next = !speak;
    setSpeak(next);
    try {
      localStorage.setItem("speak", next ? "1" : "0");
    } catch {}
    if (!next && "speechSynthesis" in window) window.speechSynthesis.cancel();
  };

  const startRecording = async () => {
    setError("");
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = media;
      chunks.current = [];
      const rec = new MediaRecorder(media);
      recorder.current = rec;
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = async () => {
        media.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size < 1000) {
          setError("That recording was too short. Try again.");
          return;
        }
        setTranscribing(true);
        try {
          const body = new FormData();
          body.append("file", new File([blob], "answer.webm", { type: blob.type }));
          const data = await api<{ text: string }>("/api/transcribe", { method: "POST", body });
          setAnswer((prev) => (prev.trim() ? `${prev.trim()} ${data.text}` : data.text));
          setSource("voice");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Transcription failed");
        } finally {
          setTranscribing(false);
        }
      };
      rec.start();
      setSeconds(0);
      setRecording(true);
      timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError("Microphone access was blocked. You can still type your answer.");
    }
  };

  const stopRecording = () => {
    if (timer.current) clearInterval(timer.current);
    spokenSeconds.current += seconds;
    setRecording(false);
    recorder.current?.stop();
  };

  const submit = async () => {
    const text = answer.trim();
    if (!text) return;
    setPhase("submitting");
    setError("");

    const words = text.split(/\s+/).filter(Boolean).length;
    const duration = spokenSeconds.current;
    const metrics =
      source === "voice" && duration > 0
        ? {
            wpm: Math.round(words / (duration / 60)),
            fillerCount: (text.match(FILLERS) ?? []).length,
            durationSec: duration,
          }
        : {};

    try {
      const data = await api<AnswerResponse>(`/api/interview/${id}/answer`, {
        method: "POST",
        body: JSON.stringify({ answer: text, source, speechMetrics: metrics }),
      });
      setFeedback(data);
      setPhase("feedback");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your answer");
      setPhase("answering");
    }
  };

  const next = () => {
    if (!feedback) return;
    if (feedback.done || !feedback.nextQuestion) {
      finish();
      return;
    }
    setQuestion(feedback.nextQuestion);
    setIndex((i) => i + 1);
    setAnswer("");
    setSource("typed");
    setFeedback(null);
    spokenSeconds.current = 0;
    setPhase("answering");
  };

  const exit = () => {
    if (window.confirm("Leave this interview? You can resume it later from your history.")) {
      router.push("/dashboard");
    }
  };

  const busy = phase === "submitting" || transcribing;
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  if (phase === "loading" || phase === "finishing") {
    return (
      <main className="page" style={{ display: "grid", placeItems: "center" }}>
        <Backdrop />
        <div style={{ textAlign: "center" }}>
          <p className="h2" style={{ marginBottom: 10 }}>
            {phase === "loading" ? "Loading your interview" : "Marking your interview"}
          </p>
          <p className="muted">
            {phase === "loading"
              ? "One moment."
              : "Scoring each answer and updating your progress. This takes a few seconds."}
          </p>
        </div>
      </main>
    );
  }

  if (phase === "error" && !question) {
    return (
      <main className="page" style={{ display: "grid", placeItems: "center" }}>
        <Backdrop />
        <div className="panel" style={{ maxWidth: 440, textAlign: "center" }}>
          <p className="error" role="alert">
            {error}
          </p>
          <div className="row" style={{ justifyContent: "center", gap: 12 }}>
            <button className="btn btn-primary btn-sm" onClick={finish}>
              Retry
            </button>
            <Link href="/dashboard" className="btn btn-quiet btn-sm">
              Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page" style={{ paddingTop: 40 }}>
      <Backdrop opacity={0.25} />
      <div className="wrap-narrow">
        <div className="row between" style={{ marginBottom: 32, flexWrap: "wrap", gap: 14 }}>
          <span className="brand">
            Prep<span>Spark</span>
          </span>
          <div className="row" style={{ gap: 18 }}>
            <button className="nav-link" onClick={toggleSpeak} aria-pressed={speak}>
              {speak ? "Voice on" : "Voice off"}
            </button>
            <button className="nav-link" onClick={exit}>
              Exit
            </button>
          </div>
        </div>

        <div className="row between" style={{ marginBottom: 14 }}>
          <span className="eyebrow">
            Question {Math.min(index + 1, QUESTION_LIMIT)} of {QUESTION_LIMIT}
          </span>
          <div className="progress" aria-hidden="true">
            {Array.from({ length: QUESTION_LIMIT }, (_, i) => (
              <i key={i} className={i < index ? "done" : i === index ? "now" : ""} />
            ))}
          </div>
        </div>

        <div className="panel fade-in" key={index}>
          <p
            className={`question${shown.length < question.length ? " caret" : ""}`}
            aria-label={question}
          >
            {shown}
          </p>

          {phase !== "feedback" && (
            <>
              <textarea
                className="input"
                style={{ marginTop: 24, minHeight: 180 }}
                placeholder="Type your answer, or record it with the microphone."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={busy || recording}
                maxLength={6000}
                aria-label="Your answer"
              />

              {error && (
                <p className="error" role="alert" style={{ marginTop: 12 }}>
                  {error}
                </p>
              )}

              <div
                className="row between"
                style={{ marginTop: 18, flexWrap: "wrap", gap: 14 }}
              >
                <div className="row" style={{ gap: 14 }}>
                  {!recording ? (
                    <button
                      className="btn btn-quiet btn-sm"
                      onClick={startRecording}
                      disabled={busy}
                    >
                      {transcribing ? "Transcribing..." : "Record answer"}
                    </button>
                  ) : (
                    <>
                      <button className="btn btn-danger btn-sm" onClick={stopRecording}>
                        Stop
                      </button>
                      <span className="row mono" style={{ gap: 10, fontSize: "0.9rem" }}>
                        <span className="rec-dot" />
                        {mm}:{ss}
                      </span>
                      <div className="wave" aria-hidden="true">
                        {[0.1, 0.35, 0.2, 0.5, 0.05, 0.4, 0.25, 0.45].map((d, i) => (
                          <i
                            key={i}
                            style={{ height: 34, animationDelay: `${d * 1.4}s` }}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <button
                  className="btn btn-primary"
                  onClick={submit}
                  disabled={!answer.trim() || busy || recording}
                >
                  {phase === "submitting" ? "Reviewing..." : "Submit answer"}
                </button>
              </div>
            </>
          )}

          {phase === "feedback" && feedback && (
            <div style={{ marginTop: 26 }}>
              <div className="feedback">
                <p className="stat-label" style={{ marginBottom: 8 }}>
                  Interviewer note
                </p>
                <p style={{ lineHeight: 1.6 }}>{feedback.feedback}</p>
              </div>
              <div className="row" style={{ justifyContent: "flex-end", marginTop: 20 }}>
                <button className="btn btn-primary" onClick={next}>
                  {feedback.done ? "Finish and see results" : "Next question"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
