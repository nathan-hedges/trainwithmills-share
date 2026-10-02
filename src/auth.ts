import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/ratelimit";
import authConfig from "@/auth.config";

// Full (Node-runtime) config: the edge-safe base + the Prisma adapter and the
// Credentials provider (which use Node-only deps). Used by the /api/auth route
// handlers and server-side signIn/auth() calls.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (creds, req) => {
        const email = String(creds?.email ?? "").toLowerCase();

        // Brute-force protection: strict limit per IP AND per account (so an
        // attacker can't hammer one email from many IPs, or many emails from
        // one IP). Fails open if Upstash isn't configured, like the other
        // rate-limited routes. Returning null = generic "sign in failed".
        if (await rateLimit(req, "login-ip", "strict")) return null;
        if (email && (await rateLimit(req, "login-acct", "strict", email))) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null; // no password = Google-only or no account
        const ok = await bcrypt.compare(String(creds?.password ?? ""), user.passwordHash);
        return ok ? user : null;
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true; // credentials path is already validated
      const email = user.email?.toLowerCase();
      if (!email) return false;
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return true; // returning user
      const invite = await prisma.invite.findFirst({ where: { email, status: "PENDING" } });
      return !!invite; // first-time Google sign-in: allow only if there's a pending invite
    },
  },
  events: {
    // The adapter creates the Google user, then we attach their plan + consume the invite.
    async createUser({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return;
      const invite = await prisma.invite.findFirst({ where: { email, status: "PENDING" } });
      if (!invite) return;
      // Split the Google display name; prefer the names the coach set on the invite.
      const parts = (user.name ?? "").trim().split(/\s+/);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          role: "CLIENT",
          plan: invite.plan,
          firstName: invite.firstName ?? parts[0] ?? null,
          lastName: invite.lastName ?? (parts.slice(1).join(" ") || null),
        },
      });
      await prisma.invite.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED", acceptedAt: new Date() },
      });
    },
  },
});
