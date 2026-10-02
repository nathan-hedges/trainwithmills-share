import NextAuth from "next-auth";
import authConfig from "@/auth.config";

// Next 16 renamed `middleware` -> `proxy`. Proxy runs in the Node.js runtime by
// default, but we still build it from the edge-safe base config (no Prisma/pg/bcrypt)
// so route protection stays fast: JWT sessions are verified from the cookie using
// AUTH_SECRET, with no database access on every request.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = (req.auth?.user as { role?: string } | undefined)?.role;

  if (pathname.startsWith("/admin") && role !== "COACH") {
    return Response.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/portal") && !req.auth) {
    return Response.redirect(new URL("/login", req.url));
  }
});

export const config = { matcher: ["/admin/:path*", "/portal/:path*"] };
