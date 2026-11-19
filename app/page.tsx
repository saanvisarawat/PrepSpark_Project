"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Strands from "./components/Strands";

const STEPS = [
  {
    t: "Upload your resume",
    d: "The PDF is read on the server and kept as the context for every question. Project names, stacks and internships stay intact.",
  },
  {
    t: "Pick the role you are aiming for",
    d: "Frontend, backend, full stack, data or ML. The role decides which of your skills matter and which get ignored.",
  },
  {
    t: "Answer five questions",
    d: "Each question is written after your previous answer. Weak answers get a narrower follow up on the same concept; strong ones move on or get harder.",
  },
  {
    t: "Type it or say it",
    d: "Record with your microphone and the transcript lands in the same box. Fix any mistakes before you submit.",
  },
  {
    t: "Review, then come back",
    d: "You get scores, a transcript with feedback beside each answer, and a list of what to revise. The next interview starts from there.",
  },
];

const RULES = [
  ["Incorrect", "Stays on the topic and simplifies", "Confirms the fundamental before moving on"],
  ["Shallow", "Asks for the missing detail", "Checks there is understanding behind the keywords"],
  ["Partly correct", "Targets the exact gap", "Separates good intuition from what is missing"],
  ["Strong", "Raises difficulty or changes skill", "Spends the remaining time covering more ground"],
  ["Repeated mistake", "Comes at it from another angle", "Tests whether the error is still there"],
];

const MEMORY = [
  ["Role", "Backend Developer", "Prioritises APIs, databases and server design"],
  ["Resume skill", "FastAPI", "Opens the door to a project question on it"],
  ["Weak topic", "SQL indexing", "Likely database follow up when it fits"],
  ["Open mistake", "Authentication vs authorization", "A diagnostic question on the distinction"],
];

export default function Home() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [resume, setResume] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const start = async () => {
    if (!resume) return;
    setBusy(true);
    setNote("");
    try {
      const body = new FormData();
      body.append("file", resume);
      const res = await fetch("/api/resume", { method: "POST", body });
      const data = await res.json();
      if (!res.ok || !data.text) {
        throw new Error(data.error || "Could not read that PDF");
      }
      localStorage.setItem("resumeText", data.text);
      localStorage.setItem("resumeName", data.name || resume.name);
      router.push("/setup");
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Upload failed. Try another file.");
      setBusy(false);
    }
  };

  return (
    <main>
      <div className="backdrop" aria-hidden="true">
        <Strands
          colors={["#00FF87", "#20E3B2", "#0CEBEB", "#29FFC6"]}
          count={4}
          speed={0.4}
          intensity={0.4}
          thickness={0.6}
          glow={1.5}
          spread={2}
          opacity={0.6}
          taper={0}
        />
      </div>

      <section className="hero">
        <div className="hero-badge">Powered by AI</div>
        <h1 className="hero-title">
          Prep<span className="grad">Spark</span>
        </h1>
        <p className="hero-sub">Next-gen interview prep for next-level careers</p>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setResume(file);
              setNote("");
            }
          }}
        />

        <div className="hero-actions">
          <button className="btn btn-outline" onClick={() => inputRef.current?.click()}>
            {resume ? "Change Resume" : "Choose PDF Resume"}
          </button>
          <button className="btn btn-primary" onClick={start} disabled={!resume || busy}>
            {busy ? "Reading resume..." : "Start Interview"}
          </button>
        </div>
        <p className="hero-note" role="status">
          {note || (resume ? resume.name : "PDF only, up to 5 MB")}
        </p>
      </section>

      <section className="section" id="how">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">How a session runs</span>
            <h2 className="h2">Five questions, each one written after your last answer</h2>
            <p className="lede">
              Most practice tools hand you a list. This one behaves like an interviewer who is
              reading your resume while you talk.
            </p>
          </div>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li className="step" key={s.t}>
                <span className="step-n">{String(i + 1).padStart(2, "0")}</span>
                <span className="step-t">{s.t}</span>
                <span className="step-d">{s.d}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Adaptive questioning</span>
            <h2 className="h2">What happens after you answer</h2>
            <p className="lede">
              You never see a score mid-interview. You see one line of feedback and the next
              question, which is chosen like this.
            </p>
          </div>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Your answer</th>
                  <th>Next move</th>
                  <th>Why</th>
                </tr>
              </thead>
              <tbody>
                {RULES.map((r) => (
                  <tr key={r[0]}>
                    <td>{r[0]}</td>
                    <td>{r[1]}</td>
                    <td>{r[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="cols-2" style={{ gap: 56, alignItems: "start" }}>
            <div>
              <span className="eyebrow">Memory</span>
              <h2 className="h2" style={{ margin: "12px 0 14px" }}>
                Practice that remembers where you slipped
              </h2>
              <p className="lede">
                After every interview PrepSpark updates a proficiency score per topic and keeps
                a list of mistakes you keep repeating. Next time, the first question already
                knows where to dig. Get a topic right and it drops off the list.
              </p>
            </div>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Signal</th>
                    <th>Example</th>
                    <th>Effect</th>
                  </tr>
                </thead>
                <tbody>
                  {MEMORY.map((r) => (
                    <tr key={r[0]}>
                      <td>{r[0]}</td>
                      <td className="mono" style={{ fontSize: "0.85rem" }}>
                        {r[1]}
                      </td>
                      <td>{r[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="cols-2" style={{ gap: 56, alignItems: "start" }}>
            <div>
              <span className="eyebrow">Voice</span>
              <h2 className="h2" style={{ margin: "12px 0 14px" }}>
                A correct answer can still be hard to follow
              </h2>
              <p className="lede">
                When you speak your answers, PrepSpark measures how you said it as well as what
                you said, so you can tell a knowledge gap from a delivery problem.
              </p>
            </div>
            <ul className="bullets" style={{ alignSelf: "center" }}>
              <li>Words per minute, to catch rushing or long pauses</li>
              <li>Filler words counted from the transcript</li>
              <li>Answer length and duration</li>
              <li>The interviewer reads each question aloud if you want it to</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section" style={{ textAlign: "center" }}>
        <div className="wrap-narrow">
          <h2 className="h2">Run your first one</h2>
          <p className="lede" style={{ margin: "14px auto 28px" }}>
            It takes about fifteen minutes and costs nothing. Your history starts building from
            the first session.
          </p>
          <div className="hero-actions">
            <Link href="/signup" className="btn btn-primary">
              Create an account
            </Link>
            <Link href="/login" className="btn btn-outline">
              Log in
            </Link>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="wrap row between" style={{ flexWrap: "wrap" }}>
          <span>
            Prep<span style={{ color: "var(--green)" }}>Spark</span>
          </span>
          <span>Built at Indira Gandhi Delhi Technical University for Women</span>
        </div>
      </footer>
    </main>
  );
}
