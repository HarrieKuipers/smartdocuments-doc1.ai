import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import connectDB from "./db";
import User from "@/models/User";
import Organization from "@/models/Organization";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log("[auth] Missing email or password");
            return null;
          }

          console.log("[auth] Attempting login for:", credentials.email);
          await connectDB();
          const user = await User.findOne({ email: credentials.email });

          if (!user) {
            console.log("[auth] User not found:", credentials.email);
            return null;
          }
          if (!user.passwordHash) {
            console.log("[auth] User has no passwordHash:", credentials.email);
            return null;
          }

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash
          );
          console.log("[auth] Password valid:", isValid);
          if (!isValid) return null;

          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            image: user.image,
          };
        } catch (error) {
          console.error("[auth] Authorize error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await connectDB();
        const existingUser = await User.findOne({ email: user.email });
        if (!existingUser) {
          const slug = user.name
            ?.toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "") || "my-org";

          const org = await Organization.create({
            name: user.name ? `${user.name}'s Organisatie` : "Mijn Organisatie",
            slug: `${slug}-${Date.now().toString(36)}`,
            ownerId: "temp",
          });

          const newUser = await User.create({
            name: user.name || "Gebruiker",
            email: user.email!,
            image: user.image || undefined,
            provider: "google",
            organizationId: org._id,
            role: "owner",
          });

          org.ownerId = newUser._id;
          org.members = [{ userId: newUser._id, role: "owner", addedAt: new Date() }];
          await org.save();
        }
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      try {
        if (user || trigger === "update") {
          console.log("[auth] JWT callback: initial token creation for", user?.email || token.userId);
          await connectDB();
          const dbUser = await User.findOne(
            user?.email ? { email: user.email } : { _id: token.userId as string }
          );
          if (dbUser) {
            token.userId = dbUser._id.toString();
            token.organizationId = dbUser.organizationId?.toString();
            token.role = dbUser.role;
            token.plan = dbUser.plan;
            token.isSuperAdmin = dbUser.isSuperAdmin || false;
            token.picture = dbUser.image || null;
            console.log("[auth] JWT token populated for userId:", token.userId, "orgId:", token.organizationId);
          } else {
            console.error("[auth] JWT callback: user NOT found in DB for", user?.email || token.userId);
          }
        } else if (token.userId) {
          await connectDB();
          const dbUser = await User.findOne({ _id: token.userId }).select("isSuperAdmin").lean();
          if (dbUser) {
            token.isSuperAdmin = dbUser.isSuperAdmin || false;
          }
        }
      } catch (error) {
        console.error("[auth] JWT callback error:", error);
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.organizationId = token.organizationId as string;
        session.user.role = token.role as string;
        session.user.plan = token.plan as string;
        session.user.isSuperAdmin = (token.isSuperAdmin as boolean) || false;
        session.user.image = token.picture as string | null;
      }
      return session;
    },
  },
});
