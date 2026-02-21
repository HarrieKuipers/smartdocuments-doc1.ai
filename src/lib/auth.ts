import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import connectDB from "./db";
import User from "@/models/User";
import Organization from "@/models/Organization";

export const { handlers, signIn, signOut, auth } = NextAuth({
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
        if (!credentials?.email || !credentials?.password) return null;

        await connectDB();
        const user = await User.findOne({ email: credentials.email });
        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!isValid) return null;

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image,
        };
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
    async jwt({ token, user }) {
      if (user) {
        await connectDB();
        const dbUser = await User.findOne({ email: user.email });
        if (dbUser) {
          token.userId = dbUser._id.toString();
          token.organizationId = dbUser.organizationId?.toString();
          token.role = dbUser.role;
          token.plan = dbUser.plan;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.organizationId = token.organizationId as string;
        session.user.role = token.role as string;
        session.user.plan = token.plan as string;
      }
      return session;
    },
  },
});
