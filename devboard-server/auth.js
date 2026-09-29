import "dotenv/config";
import { createRemoteJWKSet, jwtVerify } from "jose";

const NEON_AUTH_BASE_URL = process.env.NEON_AUTH_BASE_URL;

if (!NEON_AUTH_BASE_URL) {
  throw new Error("Missing NEON_AUTH_BASE_URL. Add it to the server .env file.");
}

const JWKS_URL = `${NEON_AUTH_BASE_URL}/.well-known/jwks.json`;

let jwks = createRemoteJWKSet(new URL(JWKS_URL));

async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, jwks, {
      algorithms: ["EdDSA"],
    });
    return payload;
  } catch (err) {
    if (err.code === "ERR_JWKS_NO_MATCHING_KEY") {
      jwks = createRemoteJWKSet(new URL(JWKS_URL));
      const { payload } = await jwtVerify(token, jwks, {
        algorithms: ["EdDSA"],
      });
      return payload;
    }
    throw err;
  }
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = header.slice(7);

  try {
    const payload = await verifyToken(token);
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export async function assertProjectOwner(client, projectId, userId) {
  const result = await client.query(
    "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
    [projectId, userId]
  );

  if (result.rows.length === 0) {
    const err = new Error("Project not found");
    err.status = 404;
    throw err;
  }
}
