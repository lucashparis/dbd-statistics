import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth-helpers";
import { getRankedProfiles } from "@/lib/community";
import { parsePage, parsePerspective } from "@/lib/api";
import type { RankPage } from "@/types/profile";

const metricSchema = z.enum(["matches", "wins", "winRate"]).catch("matches");
const RANK_PAGE_SIZE = 10;
const MAX_SEARCH_LENGTH = 60;

export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const sp = new URL(req.url).searchParams;
    const metric = metricSchema.parse(sp.get("metric"));
    const page = parsePage(sp.get("page"));
    const perspective = parsePerspective(sp.get("perspective"));
    const search = (sp.get("search") ?? "").slice(0, MAX_SEARCH_LENGTH);
    const payload = await getRankedProfiles({
      metric,
      search,
      page,
      pageSize: RANK_PAGE_SIZE,
      viewerId: userId,
      perspective,
    });
    return NextResponse.json(payload satisfies RankPage);
  } catch (e) {
    console.error("rank route failed", e);
    return NextResponse.json({ error: "Failed to fetch rank" }, { status: 500 });
  }
}
