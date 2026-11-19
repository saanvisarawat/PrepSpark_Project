import { getCurrentUser } from "@/lib/auth";
import { transcribeAudio } from "@/lib/groq";
import { unauthorized } from "@/lib/session";

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const formData = await req.formData();
    const audio = formData.get("file");

    if (!(audio instanceof File) || audio.size === 0) {
      return Response.json({ error: "No audio file provided" }, { status: 400 });
    }
    if (audio.size > MAX_BYTES) {
      return Response.json({ error: "Recording is too large" }, { status: 413 });
    }

    const text = await transcribeAudio(audio);
    return Response.json({ text: text.trim() });
  } catch (error) {
    console.error("transcribe", error);
    return Response.json({ error: "Failed to transcribe audio" }, { status: 500 });
  }
}
