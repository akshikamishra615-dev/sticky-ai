import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

console.log("Auth.js initialization - AUTH_SECRET present:", Boolean(process.env.AUTH_SECRET));

async function getSessionVersion(passwordHash?: string | null): Promise<string> {
  if (!passwordHash) return "oauth";
  const encoder = new TextEncoder();
  const data = encoder.encode(passwordHash);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user || !user.password) return null;

          const passwordsMatch = await bcrypt.compare(password, user.password);
          if (passwordsMatch) return user;
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token.sub && session.user) {
        // If the token was invalidated (pwHash mismatch), do not populate the session
        if (token.invalidated) {
          session.user.id = "";
          return session;
        }
        
        session.user.id = token.sub;
        session.user.name = (token.name as string) || "";
        session.user.email = (token.email as string) || "";
        session.user.image = (token.picture as string) || "";
      }
      return session;
    },
    async jwt({ token, user, trigger }) {
      // 1. Initial Sign-in
      if (user) {
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
        token.pwHash = await getSessionVersion((user as unknown as { password?: string | null }).password);
      }
      
      // 2. Validate existing token against current database password
      if (token.sub && !user) {
        const dbUser = await prisma.user.findUnique({ 
          where: { id: token.sub },
          select: { password: true, name: true, email: true, image: true }
        });
        
        if (!dbUser) {
          token.invalidated = true;
          return token;
        }

        const currentPwHash = await getSessionVersion(dbUser.password);
        if (token.pwHash && token.pwHash !== currentPwHash) {
          // Password has changed since this token was issued
          token.invalidated = true;
          return token;
        }
        
        // 3. Handle session update requests
        if (trigger === "update") {
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.picture = dbUser.image;
        }
      }
      
      return token;
    }
  }
});
