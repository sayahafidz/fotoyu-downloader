import { abuseResponse, checkSameOrigin, rateLimit } from "@/lib/abuse";
import { adminCookie, loginAdmin, logoutAdmin, requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try { await requireAdmin(req); return Response.json({ authenticated: true }, { headers: { "Cache-Control": "no-store" } }); } catch (error) { return abuseResponse(error); }
}
export async function POST(req: Request) {
  try {
    checkSameOrigin(req); await rateLimit(req, "admin-login", 5, 900);
    const body = await req.json();
    const token = await loginAdmin(body.password);
    return Response.json({ authenticated: true }, { headers: { "Set-Cookie": adminCookie(req, token), "Cache-Control": "no-store" } });
  } catch (error) { return abuseResponse(error); }
}
export async function DELETE(req: Request) {
  try { checkSameOrigin(req); await logoutAdmin(req); return Response.json({ authenticated: false }, { headers: { "Set-Cookie": adminCookie(req, "", 0), "Cache-Control": "no-store" } }); } catch (error) { return abuseResponse(error); }
}
