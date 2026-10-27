import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import type { Adapter } from 'next-auth/adapters';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { rateLimit } from './rate-limit';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as unknown as Adapter,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      async authorize(credentials, req) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const ip = (req?.headers as any)?.get?.('x-forwarded-for')?.split(',')[0]?.trim() || (req?.headers as any)?.get?.('x-real-ip') || 'unknown';
        const rl = rateLimit(`login:${ip}:${email.toLowerCase()}`, 5, 60_000);
        if (!rl.ok) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      const authToken = token as unknown as { id?: string; role?: string };
      if (session.user) {
        session.user.id = authToken.id ?? '';
        session.user.role = authToken.role ?? 'SALES_REP';
      }
      return session;
    },
  },
});
