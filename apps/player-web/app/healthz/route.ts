/*
Purpose: public health endpoint at https://eye.olamov.com/healthz.
Layer: frontend (player-web), route handler.

The API is not published to the internet, so this route is the public face of
its /healthz: one request proves tunnel → web → api → database. The response
is the API's { status, version, commit, database } plus this web image's own
build under `web` (images are rebuilt independently, so they can differ).
Never cached; 503 whenever the API or the database is not healthy.
*/

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_URL = (
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3200"
).replace(/\/$/, "");

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  const web = {
    version: process.env.APP_VERSION?.trim() || "dev",
    commit: process.env.GIT_COMMIT?.trim() || "unknown"
  };

  try {
    const upstream = await fetch(`${API_URL}/healthz`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000)
    });
    const body = (await upstream.json().catch(() => ({}))) as Record<string, unknown>;
    return NextResponse.json(
      { ...body, web },
      { status: upstream.ok ? 200 : 503, headers: NO_STORE }
    );
  } catch {
    return NextResponse.json(
      { status: "down", api: "unreachable", web },
      { status: 503, headers: NO_STORE }
    );
  }
}
