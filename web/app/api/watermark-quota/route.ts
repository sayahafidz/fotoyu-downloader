import { abuseResponse, rateLimit, watermarkQuota } from "@/lib/abuse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await rateLimit(req, "quota", 30);
    const { cookie, ...quota } = await watermarkQuota(req);
    return Response.json(quota, { headers: { "Cache-Control": "no-store", "Set-Cookie": cookie } });
  } catch (error) { return abuseResponse(error); }
}
