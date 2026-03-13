import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";

export async function GET(req: NextRequest) {
  try {
    // Auth check
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
    }

    await connectDB();

    const now = new Date();

    const documents = await DocumentModel.find({
      scheduledPublishAt: { $lte: now },
      isDraft: true,
      status: "ready",
    });

    let publishedCount = 0;

    for (const doc of documents) {
      await DocumentModel.findByIdAndUpdate(doc._id, {
        $set: {
          isDraft: false,
          publishedAt: now,
        },
        $unset: {
          scheduledPublishAt: "",
        },
      });
      publishedCount++;
    }

    return NextResponse.json({
      message: `${publishedCount} document(en) gepubliceerd.`,
      publishedCount,
    });
  } catch (error) {
    console.error("Cron publish-scheduled error:", error);
    return NextResponse.json(
      { error: "Kon geplande publicaties niet verwerken." },
      { status: 500 }
    );
  }
}
