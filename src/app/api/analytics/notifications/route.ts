import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import AnalyticsNotification from "@/models/AnalyticsNotification";

// GET — Fetch notifications for the current user
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const unreadOnly = req.nextUrl.searchParams.get("unread") === "true";
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20", 10);

    const filter: Record<string, unknown> = { userId: session.user.id };
    if (unreadOnly) filter.read = false;

    const [notifications, unreadCount] = await Promise.all([
      AnalyticsNotification.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      AnalyticsNotification.countDocuments({
        userId: session.user.id,
        read: false,
      }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Notifications error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// PATCH — Mark notifications as read
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const { notificationIds, markAllRead } = body;

    if (markAllRead) {
      await AnalyticsNotification.updateMany(
        { userId: session.user.id, read: false },
        { $set: { read: true } }
      );
    } else if (notificationIds?.length) {
      await AnalyticsNotification.updateMany(
        { _id: { $in: notificationIds }, userId: session.user.id },
        { $set: { read: true } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark notifications error:", error);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}
