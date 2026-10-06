import { abuseResponse, checkSameOrigin, rateLimit, abuseStore, AbuseError } from "@/lib/abuse";
import { requireAdmin } from "@/lib/admin";
import { createRedeemCode, listRedeemCodes, codeKey } from "@/lib/credits";
import { readJsonBody } from "@/lib/request-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try { await requireAdmin(req); return Response.json({ codes: await listRedeemCodes() }, { headers: { "Cache-Control": "no-store" } }); } catch (error) { return abuseResponse(error); }
}
export async function POST(req: Request) {
  try {
    checkSameOrigin(req); await requireAdmin(req); await rateLimit(req, "admin-create-code", 30);
    const { credits, maxUses, days } = await readJsonBody(req, 2048);
    return Response.json({ code: await createRedeemCode(credits, maxUses, days) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return abuseResponse(error); }
}
export async function DELETE(req: Request) {
  try {
    checkSameOrigin(req); await requireAdmin(req);
    const { code } = await readJsonBody(req, 2048);
    if (typeof code !== "string" || !/^FOTO-[A-F0-9]{16}$/.test(code)) throw new AbuseError("Kode tidak valid.", 400);
    const store = await abuseStore();
    if (await store.exists(codeKey(code))) await store.hSet(codeKey(code), "active", "0");
    return Response.json({ success: true });
  } catch (error) { return abuseResponse(error); }
}
