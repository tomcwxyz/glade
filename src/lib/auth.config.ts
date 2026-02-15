import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraId from "next-auth/providers/microsoft-entra-id";
import Resend from "next-auth/providers/resend";

/**
 * Edge-compatible auth config — used by middleware.
 * Does NOT include Credentials provider (bcrypt is Node-only).
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
    newUser: "/dashboard",
  },
  providers: [
    // Email magic link
    ...(process.env.AUTH_RESEND_KEY
      ? [
          Resend({
            from: "Glade <noreply@glade.app>",
          }),
        ]
      : []),

    // Google OAuth
    ...(process.env.AUTH_GOOGLE_ID
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),

    // Microsoft Entra ID
    ...(process.env.AUTH_MICROSOFT_ENTRA_ID_ID
      ? [
          MicrosoftEntraId({
            clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
            clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
            issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
