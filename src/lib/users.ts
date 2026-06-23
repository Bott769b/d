import "server-only";
import { db } from "./db";
import { hashPassword, verifyPassword } from "./password";
import { authConfig, type Role } from "./session";

export interface PublicUser {
  id: string;
  username: string;
  role: Role;
}

// Usernames are matched case-insensitively; we store the lowercased form.
function normalize(username: string): string {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9_.-]{2,32}$/i.test(username.trim());
}

export async function findUserByUsername(username: string) {
  const uname = normalize(username);
  if (!uname) return null;
  return db.user.findUnique({ where: { username: uname } });
}

export async function createUser(
  username: string,
  password: string,
  role: Role = "user",
): Promise<PublicUser> {
  const user = await db.user.create({
    data: { username: normalize(username), passwordHash: hashPassword(password), role },
  });
  return { id: user.id, username: user.username, role: user.role === "admin" ? "admin" : "user" };
}

/** Seed the admin account from env if it doesn't exist yet. Idempotent. */
export async function ensureAdminUser(): Promise<void> {
  const { adminUsername, adminPassword } = authConfig();
  const uname = normalize(adminUsername);
  const existing = await db.user.findUnique({ where: { username: uname } });
  if (!existing) {
    await db.user.create({
      data: { username: uname, passwordHash: hashPassword(adminPassword), role: "admin" },
    });
  }
}

/** Validate credentials against the DB. Returns the public user or null. */
export async function authenticate(username: string, password: string): Promise<PublicUser | null> {
  const user = await findUserByUsername(username);
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return { id: user.id, username: user.username, role: user.role === "admin" ? "admin" : "user" };
}
