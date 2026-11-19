import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const data = await req.formData();
    const file = data.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: "Resume must be smaller than 5 MB" }, { status: 413 });
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return Response.json({ error: "Upload a PDF file" }, { status: 415 });
    }

    const blob = new Blob([await file.arrayBuffer()], { type: "application/pdf" });
    const docs = await new PDFLoader(blob).load();
    const text = docs
      .map((doc) => doc.pageContent)
      .join("\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (text.length < 40) {
      return Response.json(
        { error: "No readable text found. Scanned PDFs are not supported." },
        { status: 422 }
      );
    }

    return Response.json({ text: text.slice(0, 20000), name: file.name });
  } catch (error) {
    console.error("resume", error);
    return Response.json({ error: "Failed to parse the PDF" }, { status: 500 });
  }
}
