import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { setAuthCookie } from "@/lib/auth";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!name || name.length > 60) {
      return Response.json({ error: "Enter your name" }, { status: 400 });
    }
    if (!EMAIL.test(email)) {
      return Response.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    if (password.length < 8 || password.length > 128) {
      return Response.json({ error: "Password must be 8 to 128 characters" }, { status: 400 });
    }

    const taken = await prisma.user.findUnique({ where: { email } });
    if (taken) {
      return Response.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { name, email, passwordHash } });
    await setAuthCookie(user.id);

    return Response.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error("signup", error);
    return Response.json({ error: "Could not create the account" }, { status: 500 });
  }
}
