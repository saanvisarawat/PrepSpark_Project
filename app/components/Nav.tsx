"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface User {
  name: string;
}

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active) setUser(data?.user ?? null);
      })
      .catch(() => {})
      .finally(() => active && setReady(true));
    return () => {
      active = false;
    };
  }, [pathname]);

  if (pathname.startsWith("/interview/")) return null;

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  };

  const link = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      className={`nav-link${pathname === href ? " active" : ""}`}
    >
      {label}
    </Link>
  );

  return (
    <header className="nav">
      <Link href={user ? "/dashboard" : "/"} className="brand">
        Prep<span>Spark</span>
      </Link>
      <nav className="nav-links" aria-label="Main">
        {ready && user && (
          <>
            {link("/dashboard", "Dashboard")}
            {link("/setup", "New interview")}
            {link("/history", "History")}
            <button className="nav-link" onClick={logout}>
              Log out
            </button>
          </>
        )}
        {ready && !user && (
          <>
            {link("/login", "Log in")}
            <Link href="/signup" className="btn btn-primary btn-sm">
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
