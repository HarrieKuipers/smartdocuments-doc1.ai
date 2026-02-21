import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadPublicFile, deleteFile } from "@/lib/storage";
import { nanoid } from "nanoid";
import connectDB from "@/lib/db";
import User from "@/models/User";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Niet geautoriseerd." },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Geen bestand ontvangen." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Alleen JPG, PNG en WebP afbeeldingen zijn toegestaan." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Afbeelding is te groot. Maximum is 5MB." },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { error: "Gebruiker niet gevonden." },
        { status: 404 }
      );
    }

    // Delete old avatar from DO Spaces if applicable
    if (user.image && user.image.includes("avatars/")) {
      try {
        const oldKey = user.image.includes("avatars/")
          ? "avatars/" + user.image.split("avatars/")[1]
          : user.image;
        await deleteFile(oldKey);
      } catch {
        // Ignore deletion errors for old avatar
      }
    }

    const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
    const key = `avatars/${session.user.id}/${nanoid()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const imageUrl = await uploadPublicFile(key, buffer, file.type);

    user.image = imageUrl;
    await user.save();

    return NextResponse.json({ image: imageUrl });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { error: "Upload mislukt." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Niet geautoriseerd." },
        { status: 401 }
      );
    }

    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { error: "Gebruiker niet gevonden." },
        { status: 404 }
      );
    }

    if (user.image && user.image.includes("avatars/")) {
      try {
        const key = "avatars/" + user.image.split("avatars/")[1];
        await deleteFile(key);
      } catch {
        // Ignore deletion errors
      }
    }

    user.image = undefined;
    await user.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Avatar delete error:", error);
    return NextResponse.json(
      { error: "Verwijderen mislukt." },
      { status: 500 }
    );
  }
}
