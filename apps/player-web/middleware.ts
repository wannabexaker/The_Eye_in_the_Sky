/**
 * Runtime middleware:
 * - proxies /_api/* to API_INTERNAL_URL/*
 * - applies frame-ancestors CSP for the player shell
 *
 * Middleware runs at request time, so process.env is read from the actual
 * container environment instead of being baked at build time.
 */
import { type NextRequest, NextResponse } from "next/server";

const API_PREFIX = "/_api";
const DEFAULT_FRAME_ANCESTORS = "'self' https://olamov.com https://*.olamov.com";

// Evaluated at module load (server startup) and picks up runtime env vars.
const API_URL = (
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3200"
).replace(/\/$/, "");

const getFrameAncestorsDirective = () => {
  const sources = process.env.PLAYER_FRAME_ANCESTORS?.trim() || DEFAULT_FRAME_ANCESTORS;
  return `frame-ancestors ${sources}`;
};

const withFrameAncestors = (response: NextResponse) => {
  const currentCsp = response.headers.get("Content-Security-Policy");
  if (currentCsp?.toLowerCase().includes("frame-ancestors")) {
    return response;
  }

  const frameAncestors = getFrameAncestorsDirective();
  response.headers.set(
    "Content-Security-Policy",
    currentCsp ? `${currentCsp}; ${frameAncestors}` : frameAncestors
  );
  return response;
};

export async function middleware(req: NextRequest): Promise<NextResponse> {
  if (!req.nextUrl.pathname.startsWith(API_PREFIX)) {
    return withFrameAncestors(NextResponse.next());
  }

  const path = req.nextUrl.pathname.slice(API_PREFIX.length) || "/";
  const upstream = `${API_URL}${path}${req.nextUrl.search}`;

  const isBodyMethod = !["GET", "HEAD"].includes(req.method);
  const body = isBodyMethod ? await req.arrayBuffer() : undefined;

  const headers = new Headers(req.headers);
  // Strip hop-by-hop and browser-only headers. The API must not see the
  // browser Origin or it will apply CORS rules to a server-to-server request.
  headers.delete("host");
  headers.delete("connection");
  headers.delete("origin");
  headers.delete("referer");

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
  matcher: ["/_api/:path*", "/((?!_api|_next/static|_next/image|favicon.ico).*)"],
};
