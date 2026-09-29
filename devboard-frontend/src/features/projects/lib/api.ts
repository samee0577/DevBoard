import authClient from "../../../auth";

const API_URL = import.meta.env.VITE_API_URL;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function authFetch(path: string, options: RequestInit = {}) {
  const { data } = await authClient.getSession();
  const token = data?.session?.token;

  if (!token) throw new ApiError(401, "Not authenticated");

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    throw new ApiError(res.status, `Request failed with status ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: (path: string) => authFetch(path),
  post: (path: string, body: unknown) =>
    authFetch(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path: string, body: unknown) =>
    authFetch(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path: string) => authFetch(path, { method: "DELETE" }),
};