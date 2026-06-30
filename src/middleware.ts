import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Public routes that don't require auth
  const publicPaths = ["/", "/sign-in", "/sign-up", "/forgot-password", "/reset-password", "/verify-request", "/api/auth", "/api/v1", "/api/shared", "/new-space", "/shared", "/public", "/embed"];
  const isPublic = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isPublic) return;

  // Redirect unauthenticated users to sign-in
  if (!req.auth) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(signInUrl);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|opengraph-image|twitter-image|icon).*)"],
};
