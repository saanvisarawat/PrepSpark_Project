"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Backdrop from "../components/Backdrop";
import { api } from "@/lib/client";
import { QUESTION_LIMIT, ROLES } from "@/lib/types";

export default function SetupPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [role, setRole] = useState<string>(ROLES[0].id);
  const [resumeText, setResumeText] = useState("");
  const [resumeName, setResumeName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = setTimeout(() => {
      try {
        setResumeText(localStorage.getItem("resumeText") ?? "");
        setResumeName(localStorage.getItem("resumeName") ?? "");
        const savedRole = localStorage.getItem("role");
        if (savedRole && ROLES.some((r) => r.id === savedRole)) setRole(savedRole);
      } catch {}
    }, 0);
    return () => clearTimeout(load);
  }, []);

  const upload = async (file: File) => {
    setParsing(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const data = await api<{ text: string; name: string }>("/api/resume", {
        method: "POST",
        body,
      });
      setResumeText(data.text);
      setResumeName(data.name);
      localStorage.setItem("resumeText", data.text);
      localStorage.setItem("resumeName", data.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that PDF");
    } finally {
      setParsing(false);
    }
  };

  const begin = async () => {
    setStarting(true);
    setError("");
    try {
      localStorage.setItem("role", role);
      const data = await api<{ id: string }>("/api/interview/start", {
        method: "POST",
        body: JSON.stringify({ role, resumeText }),
      });
      router.push(`/interview/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the interview");
      setStarting(false);
    }
  };

  return (
    <main className="page">
      <Backdrop opacity={0.3} />
      <div className="wrap-narrow fade-in">
        <span className="eyebrow">New interview</span>
        <h1 className="h1" style={{ margin: "10px 0 12px" }}>
          Set up your session
        </h1>
        <p className="lede" style={{ marginBottom: 36 }}>
          {QUESTION_LIMIT} questions, about fifteen minutes. Pick a role and confirm the resume
          the questions should come from.
        </p>

        <div className="panel" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.15rem", marginBottom: 16 }}>Resume</h2>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
              e.target.value = "";
            }}
          />
          <div className="row between" style={{ flexWrap: "wrap", gap: 16 }}>
            <div>
              <p style={{ fontWeight: 600 }}>
                {parsing ? "Reading PDF..." : resumeName || "No resume uploaded"}
              </p>
              <p className="dim mono" style={{ fontSize: "0.8rem", marginTop: 4 }}>
                {resumeText ? `${resumeText.length.toLocaleString()} characters read` : "PDF, up to 5 MB"}
              </p>
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => inputRef.current?.click()}
              disabled={parsing}
            >
              {resumeText ? "Replace" : "Upload PDF"}
            </button>
          </div>
        </div>

        <div className="panel" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: "1.15rem", marginBottom: 16 }}>Target role</h2>
          <div role="radiogroup" aria-label="Target role" style={{ display: "grid", gap: 10 }}>
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={role === r.id}
                className="role-option"
                onClick={() => setRole(r.id)}
              >
                <span className="radio" />
                <span>
                  <span style={{ display: "block", fontWeight: 600 }}>{r.id}</span>
                  <span className="muted" style={{ fontSize: "0.9rem" }}>
                    {r.blurb}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
          <button
            className="btn btn-primary"
            onClick={begin}
            disabled={!resumeText || parsing || starting}
          >
            {starting ? "Preparing your first question..." : "Begin interview"}
          </button>
          <Link href="/dashboard" className="btn btn-quiet">
            Cancel
          </Link>
        </div>
      </div>
    </main>
  );
}
