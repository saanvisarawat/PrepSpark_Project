"use client";

import Link from "next/link";
import { useState } from "react";
import Backdrop from "./Backdrop";
import { api, safeNext } from "@/lib/client";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const isSignup = mode === "signup";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(isSignup ? { name, email, password } : { email, password }),
      });
      const next = safeNext(new URLSearchParams(window.location.search).get("next"));
      window.location.assign(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  };

  return (
    <main className="page" style={{ display: "grid", placeItems: "center" }}>
      <Backdrop />
      <form className="panel fade-in" style={{ width: "100%", maxWidth: 440 }} onSubmit={submit}>
        <span className="eyebrow">{isSignup ? "New account" : "Welcome back"}</span>
        <h1 className="h2" style={{ margin: "10px 0 6px" }}>
          {isSignup ? "Start practising" : "Log in to PrepSpark"}
        </h1>
        <p className="muted" style={{ marginBottom: 26, lineHeight: 1.5 }}>
          {isSignup
            ? "Your interviews and progress are saved to your account."
            : "Pick up where your last interview left off."}
        </p>

        {isSignup && (
          <div className="field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              maxLength={60}
            />
          </div>
        )}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            minLength={isSignup ? 8 : undefined}
          />
          {isSignup && <span className="dim" style={{ fontSize: "0.8rem" }}>At least 8 characters</span>}
        </div>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>
          {busy ? "Please wait..." : isSignup ? "Create account" : "Log in"}
        </button>

        <p className="muted" style={{ marginTop: 20, fontSize: "0.92rem", textAlign: "center" }}>
          {isSignup ? "Already have an account? " : "New here? "}
          <Link
            href={isSignup ? "/login" : "/signup"}
            style={{ color: "var(--green)", fontWeight: 600 }}
          >
            {isSignup ? "Log in" : "Create one"}
          </Link>
        </p>
      </form>
    </main>
  );
}
