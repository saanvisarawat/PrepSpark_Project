import Groq from "groq-sdk";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL = "openai/gpt-oss-120b";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chatJson<T>(
  messages: Message[],
  temperature: number
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const completion = await client.chat.completions.create({
        model: MODEL,
        messages,
        temperature,
        response_format: { type: "json_object" },
      });
      const raw = completion.choices[0]?.message?.content ?? "";
      return JSON.parse(raw) as T;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function transcribeAudio(file: File) {
  const result = await client.audio.transcriptions.create({
    file,
    model: "whisper-large-v3",
    response_format: "json",
  });
  return result.text;
}
