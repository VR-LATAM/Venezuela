import { type AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import axios from 'axios';

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:      { label: 'Email',    type: 'email' },
        password:   { label: 'Password', type: 'password' },
        totpCode:   { label: '2FA Code', type: 'text' },
        setupToken: { label: 'Setup Token', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const backendUrl = process.env.BACKEND_URL ?? 'NOT_SET';
        console.log('[auth] BACKEND_URL:', backendUrl);

        try {
          // Flujo normal: email + password (+ totpCode si ya tiene 2FA)
          const { data } = await axios.post(
            `${backendUrl}/auth/admin-login`,
            {
              email:    credentials.email,
              password: credentials.password,
              totpCode: credentials.totpCode || undefined,
            }
          );

          const { user, tokens } = data.data;
          if (user.role !== 'admin') return null;

          return {
            id:           user.id,
            name:         user.name,
            email:        user.email,
            role:         user.role,
            accessToken:  tokens?.accessToken,
            refreshToken: tokens?.refreshToken,
          };
        } catch (err: any) {
          const code = err.response?.data?.code;

          // 2FA no configurado → pasar el setupToken al cliente vía error de next-auth
          if (code === 'MFA_SETUP_REQUIRED') {
            const setupToken = err.response.data.data?.setupToken ?? '';
            throw new Error(`MFA_SETUP_REQUIRED:${setupToken}`);
          }

          // 2FA configurado pero no enviado el código
          if (code === 'TOTP_REQUIRED') {
            throw new Error('TOTP_REQUIRED');
          }

          console.error('[auth] error:', err.response?.status, JSON.stringify(err.response?.data));
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken  = (user as unknown as { accessToken: string }).accessToken;
        token.refreshToken = (user as unknown as { refreshToken: string }).refreshToken;
        token.role         = (user as unknown as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken  = token.accessToken as string;
      session.user.role    = token.role as string;
      return session;
    },
  },

  pages: {
    signIn: '/login',
    error:  '/login',
  },

  session: { strategy: 'jwt', maxAge: 8 * 3600 },
  secret: process.env.NEXTAUTH_SECRET,
};
