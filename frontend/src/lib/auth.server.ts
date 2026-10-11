/**
 * Demo authentication store.
 *
 * Users live in memory on the server (they reset when the server restarts).
 * Swap `users` for a real database later — the exported helpers keep the
 * same shape.
 */

export type DemoUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  memberSince: string; // ISO date
  ecoPoints: number;
  badgeCount: number;
  plantCount: number;
};

export type PublicUser = Omit<DemoUser, "passwordHash">;

const encoder = new TextEncoder();

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): string {
  const pad = str.replace(/-/g, "+").replace(/_/g, "/");
  return atob(pad + "=".repeat((4 - (pad.length % 4)) % 4));
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function secret(): string {
  return process.env["AUTH_JWT_SECRET"] ?? "plantpal-demo-secret";
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return b64url(await crypto.subtle.sign("HMAC", key, encoder.encode(data)));
}

export async function hashPassword(password: string): Promise<string> {
  return sha256Hex(`plantpal:${password}`);
}

export async function signToken(userId: string): Promise<string> {
  const header = b64url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = b64url(
    encoder.encode(
      JSON.stringify({
        sub: userId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
      }),
    ),
  );
  const body = `${header}.${payload}`;
  return `${body}.${await hmac(body)}`;
}

export async function verifyToken(token: string): Promise<string | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  if (!header || !payload || !signature) return null;
  if ((await hmac(`${header}.${payload}`)) !== signature) return null;
  try {
    const claims = JSON.parse(b64urlDecode(payload)) as { sub?: string; exp?: number };
    if (!claims.sub) return null;
    if (claims.exp && claims.exp * 1000 < Date.now()) return null;
    return claims.sub;
  } catch {
    return null;
  }
}

/* ----------------------------- user store ----------------------------- */

const users = new Map<string, DemoUser>();

/** Seeded demo account so the expo booth can log in without registering. */
let seeded = false;
async function seed() {
  if (seeded) return;
  seeded = true;
  const id = "u-demo";
  users.set(id, {
    id,
    name: "Aisha Green",
    email: "demo@plantpal.app",
    passwordHash: await hashPassword("plantpal"),
    memberSince: "2025-03-14",
    ecoPoints: 1280,
    badgeCount: 4,
    plantCount: 6,
  });
}

export function toPublic(user: DemoUser): PublicUser {
  const { passwordHash: _ignored, ...rest } = user;
  return rest;
}

export async function findByEmail(email: string): Promise<DemoUser | undefined> {
  await seed();
  const normalized = email.trim().toLowerCase();
  return [...users.values()].find((u) => u.email === normalized);
}

export async function findById(id: string): Promise<DemoUser | undefined> {
  await seed();
  return users.get(id);
}

export async function createUser(
  name: string,
  email: string,
  password: string,
): Promise<DemoUser> {
  await seed();
  const id = `u-${crypto.randomUUID()}`;
  const user: DemoUser = {
    id,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash: await hashPassword(password),
    memberSince: new Date().toISOString().slice(0, 10),
    ecoPoints: 0,
    badgeCount: 0,
    plantCount: 6,
  };
  users.set(id, user);
  return user;
}

export async function userFromRequest(request: Request): Promise<DemoUser | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  const userId = await verifyToken(token);
  if (!userId) return null;
  return (await findById(userId)) ?? null;
}
