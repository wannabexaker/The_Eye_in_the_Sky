/**
 * API proxy middleware: /_api/* → API_INTERNAL_URL/*
 *
 * Middleware runs at request time in Node.js (standalone mode), so
 * process.env.API_INTERNAL_URL is read at server startup from the actual
 * container environment — not baked at build time like next.config rewrites.
 */
import { type NextRequest, NextResponse } from "next/server";

// Evaluated at module load (server startup) — picks up the runtime env var.
const API_URL = (
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3200"
).replace(/\/$/, "");

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const path = req.nextUrl.pathname.slice("/_api".length) || "/";
  const upstream = `${API_URL}${path}${req.nextUrl.search}`;

  const isBodyMethod = !["GET", "HEAD"].includes(req.method);

  const body = isBodyMethod ? await req.arrayBuffer() : undefined;

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("connection");

  const upstreamRes = await fetch(upstream, {
    method: req.method,
    headers,
    body,
  });

  const resHeaders = new Headers(upstreamRes.headers);
  resHeaders.delete("content-encoding");
  resHeaders.delete("transfer-encoding");

  return new NextResponse(upstreamRes.body, {
    status: upstreamRes.status,
    headers: resHeaders,
  });
}

export const config = {
  matcher: "/_api/:path*",
};
