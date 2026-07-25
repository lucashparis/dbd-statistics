import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth-helpers";
import { getPublicProfiles } from "@/lib/community";
import { parsePage, parsePerspective, parseSeason } from "@/lib/api";
import type { CommunityPage } from "@/types/profile";

const PAGE_SIZE = 12;

export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const sp = new URL(req.url).searchParams;
    const page = parsePage(sp.get("page"));
    const perspective = parsePerspective(sp.get("perspective"));
    const season = parseSeason(sp.get("season"));
    const upTo = page * PAGE_SIZE;
    const all = await getPublicProfiles({ limit: upTo + 1, perspective, season });
    const start = (page - 1) * PAGE_SIZE;
    const payload: CommunityPage = {
      profiles: all.slice(start, upTo),
      hasMore: all.length > upTo,
    };
    return NextResponse.json(payload);
  } catch (e) {
    console.error("community profiles route failed", e);
    return NextResponse.json({ error: "Failed to fetch community" }, { status: 500 });
  }
}
