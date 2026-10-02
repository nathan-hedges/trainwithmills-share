import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe base config. It contains ONLY things that work in the Edge runtime
 * (where the middleware runs): no Prisma, no `pg`, no bcrypt. The middleware
 * builds a NextAuth instance from this alone, so it never drags Node-only
 * modules into the Edge bundle.
 *
 * The full config in `auth.ts` spreads this and adds the Prisma adapter + the
 * Credentials provider (which need Node), and runs only in the Node runtime.
 */
export default {
  pages: { signIn: "/login", error: "/auth/error" },
  session: { strategy: "jwt" },
  // Google is edge-safe. The Credentials provider (bcrypt + Prisma) is added in auth.ts.
  providers: [Google],
  callbacks: {
    // Persist role + plan + a display name on the token so middleware/UI can read
    // them without a DB hit.
    jwt({ token, user }) {
      if (user) {
        const u = user as {
          role?: string;
          plan?: string | null;
          firstName?: string | null;
          lastName?: string | null;
          name?: string | null;
        };
        token.role = u.role;
        token.plan = u.plan;
        const derived = [u.firstName, u.lastName].filter(Boolean).join(" ");
        token.name = u.name || derived || token.name;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { role?: unknown }).role = token.role;
        (session.user as { plan?: unknown }).plan = token.plan;
        if (token.name) session.user.name = token.name as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
