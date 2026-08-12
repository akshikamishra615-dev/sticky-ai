import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
  providers: [],
  callbacks: {
    async session({ session, token }) {
      if (token.sub && session.user) {
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
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
      }
      return token;
    }
  }
} satisfies NextAuthConfig;
