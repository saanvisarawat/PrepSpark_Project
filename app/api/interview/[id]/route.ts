import { getCurrentUser } from "@/lib/auth";
import { getOwnedSession, notFound, toView, unauthorized } from "@/lib/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const session = await getOwnedSession(id, user.id);
  if (!session) return notFound();

  return Response.json({ session: toView(session) });
}
