import { redirect } from "react-router-dom";
import authClient from "./auth";

export type AuthSession = {
  session: unknown;
  user: unknown;
};

export async function getSession(): Promise<AuthSession | null> {
  try {
    const { data } = await authClient.getSession();
    const session = data?.session;
    const user = data?.user;

    if (!session || !user) return null;

    return { session, user };
  } catch {
    return null;
  }
}

export async function requireAuthLoader() {
  const auth = await getSession();

  if (!auth) {
    throw redirect("/");
  }

  return auth;
}
