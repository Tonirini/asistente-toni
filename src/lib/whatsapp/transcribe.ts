import OpenAI, { toFile } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transcribeAudioBase64(
  base64: string,
  mimetype = "audio/ogg"
): Promise<string> {
  const buffer = Buffer.from(base64, "base64");
  const ext = mimetype.includes("ogg") ? "ogg" : "mp3";
  const file = await toFile(buffer, `audio.${ext}`, { type: mimetype });

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "es",
  });

  return transcription.text;
}
