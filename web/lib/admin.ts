import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { abuseStore, AbuseError } from "./abuse.ts";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export const adminCookie = (req: Request, token: string, age = 28800) => `fotoyu_admin=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https" ? "; Secure" : ""}`;
const sessionToken = (req: Request) => req.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith("fotoyu_admin="))?.slice(13) || "";

export async function requireAdmin(req: Request) {
  const token = sessionToken(req);
  if (!/^[a-f0-9]{64}$/.test(token) || !await (await abuseStore()).get(`admin:session:${hash(token)}`)) throw new AbuseError("Silakan login admin.", 401, 0, "ADMIN_REQUIRED");
}
export async function loginAdmin(password: unknown) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 16) throw new AbuseError("ADMIN_PASSWORD server belum diatur (minimal 16 karakter).", 503, 0, "ADMIN_NOT_CONFIGURED");
  if (typeof password !== "string" || password.length > 512 || !timingSafeEqual(Buffer.from(hash(password)), Buffer.from(hash(expected)))) throw new AbuseError("Password admin tidak cocok.", 401, 0, "INVALID_PASSWORD");
  const token = randomBytes(32).toString("hex");
  await (await abuseStore()).set(`admin:session:${hash(token)}`, "1", { EX: 28800 });
  return token;
}
export async function logoutAdmin(req: Request) {
  const token = sessionToken(req);
  if (token) await (await abuseStore()).del(`admin:session:${hash(token)}`);
}
