import { createAuthClient } from '@neondatabase/auth';

const neonAuthUrl = import.meta.env.VITE_NEON_AUTH_URL;
if (!neonAuthUrl) {
  throw new Error('Missing VITE_NEON_AUTH_URL. Add your Neon Auth URL in the frontend .env file.');
}

export const authClient = createAuthClient(neonAuthUrl);

export default authClient;
