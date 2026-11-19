import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { setAuthCookie } from "@/lib/auth";

const DUMMY_HASH = bcrypt.hashSync("prepspark-placeholder", 10);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    const user = await prisma.user.findUnique({ where: { email } });
    const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !valid) {
      return Response.json({ error: "Email or password is incorrect" }, { status: 401 });
    }

    await setAuthCookie(user.id);
    return Response.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error("login", error);
    return Response.json({ error: "Could not sign in" }, { status: 500 });
  }
}
