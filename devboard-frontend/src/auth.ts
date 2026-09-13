import { createAuthClient } from '@neondatabase/auth';

const neonAuthUrl = import.meta.env.NEON_AUTH_URL;
console.log(import.meta.env);
if (!neonAuthUrl) {
  throw new Error('Missing NEON_AUTH_URL. Add your Neon Auth URL in the frontend .env file.');
}

export const authClient = createAuthClient(neonAuthUrl);

export default authClient;
