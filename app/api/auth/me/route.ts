import { getCurrentUser } from "@/lib/auth";
import { unauthorized } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  return Response.json({ user });
}
