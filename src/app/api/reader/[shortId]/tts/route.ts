import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import { uploadPublicFile } from "@/lib/storage";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID || "ARIOBKJtltx2F7r1TMzI"; // Dirk - Dutch voice

export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ shortId: string }> }
) {
  try {
    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: "TTS niet geconfigureerd." },
        { status: 503 }
      );
    }

    const { shortId } = await params;

    await connectDB();

    // Check if audio already exists
    const doc = await DocumentModel.findOne({ shortId })
      .select("ttsAudioUrl content.summary.original")
      .lean();

    if (!doc) {
      return NextResponse.json(
        { error: "Document niet gevonden." },
        { status: 404 }
      );
    }

    // If audio already generated, return the URL
    if (doc.ttsAudioUrl) {
      return NextResponse.json({ audioUrl: doc.ttsAudioUrl });
    }

    // Generate new audio
    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Tekst is verplicht." },
        { status: 400 }
      );
    }

    const maxChars = 5000;
    const trimmedText = text.slice(0, maxChars);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: trimmedText,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("ElevenLabs API error:", response.status, errorText);
      return NextResponse.json(
        {
          error: `Spraaksynthese mislukt (${response.status}): ${errorText || "ElevenLabs API fout"}`,
        },
        { status: 502 }
      );
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const storageKey = `tts/${shortId}.mp3`;
    const audioUrl = await uploadPublicFile(storageKey, audioBuffer, "audio/mpeg");

    // Save URL on document
    await DocumentModel.findOneAndUpdate(
      { shortId },
      { $set: { ttsAudioUrl: audioUrl } }
    );

    return NextResponse.json({ audioUrl });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json(
      { error: "Kon spraak niet genereren." },
      { status: 500 }
    );
  }
}
