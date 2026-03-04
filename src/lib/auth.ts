import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens, invitations, spaceMembers } from "@/db/schema";
import { authConfig } from "./auth.config";
import { gladeEmail } from "@/lib/email-templates";
import { Resend as ResendClient } from "resend";

export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email || !process.env.SUPER_ADMIN_EMAILS) return false;
  const allowed = process.env.SUPER_ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase());
  return allowed.includes(email.toLowerCase());
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  events: {
    async signIn({ user }) {
      // Consume any pending invitations for this user's email
      if (!user.email) return;
      const pending = await db
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.email, user.email.toLowerCase().trim()),
            eq(invitations.status, "pending"),
          )
        );

      for (const inv of pending) {
        if (inv.expiresAt < new Date()) continue;

        // Check not already a member
        const [existing] = await db
          .select({ id: spaceMembers.id })
          .from(spaceMembers)
          .where(
            and(
              eq(spaceMembers.spaceId, inv.spaceId),
              eq(spaceMembers.userId, user.id!),
            )
          );

        if (!existing) {
          await db.insert(spaceMembers).values({
            spaceId: inv.spaceId,
            userId: user.id!,
            role: inv.role,
          });
        }

        await db
          .update(invitations)
          .set({ status: "accepted" })
          .where(eq(invitations.id, inv.id));
      }
    },
  },
  providers: [
    ...authConfig.providers,

    // Email magic link (Node-only — requires DB adapter for verification tokens)
    ...(process.env.AUTH_RESEND_KEY
      ? [
          Resend({
            from: "Glade <noreply@ourglade.app>",
            async sendVerificationRequest({ identifier: email, url }) {
              const resend = new ResendClient(process.env.AUTH_RESEND_KEY!);
              await resend.emails.send({
                from: "Glade <noreply@ourglade.app>",
                to: email,
                subject: "Sign in to Glade",
                html: gladeEmail({
                  preview: "Your sign-in link for Glade",
                  heading: "Sign in to Glade",
                  body: "Click the button below to sign in to your Glade account. This link expires in 24 hours.",
                  cta: { label: "Sign in to Glade", url },
                  footer: "If you didn't request this email, you can safely ignore it.",
                }),
              });
            },
          }),
        ]
      : []),

    // Email + password (Node.js only — not available in Edge middleware)
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;

        if (!email || !password) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
});
