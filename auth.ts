import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { ALLOWED_ADMIN_EMAIL } from "@/lib/auth-config";

export { ALLOWED_ADMIN_EMAIL };

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || "",
    }),
  ],
  secret: process.env.AUTH_SECRET || "development-cube-secret-key-32chars-min",
});
