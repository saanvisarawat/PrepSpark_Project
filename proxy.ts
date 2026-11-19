import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "prepspark_token";
const PROTECTED = ["/dashboard", "/setup", "/interview", "/results", "/history"];
const GUEST_ONLY = ["/login", "/signup"];

async function isSignedIn(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsAuth = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const guestOnly = GUEST_ONLY.includes(pathname);

  if (!needsAuth && !guestOnly) return NextResponse.next();

  const signedIn = await isSignedIn(request);

  if (needsAuth && !signedIn) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (guestOnly && signedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/setup/:path*",
    "/interview/:path*",
    "/results/:path*",
    "/history/:path*",
    "/login",
    "/signup",
  ],
};
