import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID || "ARIOBKJtltx2F7r1TMzI"; // Dirk - Dutch voice

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

    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Tekst is verplicht." },
        { status: 400 }
      );
    }

    // Limit text length to prevent abuse (ElevenLabs charges per character)
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
        { error: "Spraaksynthese mislukt." },
        { status: 502 }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json(
      { error: "Kon spraak niet genereren." },
      { status: 500 }
    );
  }
}
