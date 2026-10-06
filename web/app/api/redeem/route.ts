import { abuseResponse, checkSameOrigin, rateLimit } from "@/lib/abuse";
import { redeemCredits } from "@/lib/credits";
import { readJsonBody } from "@/lib/request-body";

export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    checkSameOrigin(req); await rateLimit(req, "redeem", 5, 60); await rateLimit(req, "redeem-hour", 20, 3600);
    const { code } = await readJsonBody(req, 2048);
    const { balance, cookie } = await redeemCredits(req, code);
    return Response.json({ balance }, { headers: { "Set-Cookie": cookie, "Cache-Control": "no-store" } });
  } catch (error) { return abuseResponse(error); }
}
