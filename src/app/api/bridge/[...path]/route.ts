import { NextRequest } from "next/server";

export const runtime = "nodejs"; // ensure Node runtime for streaming
export const dynamic = "force-dynamic"; // never cache proxy responses

function buildTargetUrl(req: NextRequest, path: string): string {
  // Prefer existing Railway envs that were already configured in production
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL ?? process.env.BACKEND_URL;
  if (!backend) {
    throw new Error("NEXT_PUBLIC_BACKEND_URL (or BACKEND_URL) is not configured on the server.");
  }
  const trimmed = path.startsWith("/") ? path : `/${path}`;
  const search = req.nextUrl.search || "";
  return `${backend}${trimmed}${search}`;
}

async function forward(req: NextRequest, pathSegments: string[]) {
  const path = pathSegments.join("/");
  let target: string;
  try {
    target = buildTargetUrl(req, path);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(message, { status: 500 });
  }

  const headers = new Headers(req.headers);
  // Remove host header to avoid mismatch
  headers.delete("host");

  // Ensure Accept header for reads
  if (!headers.get("accept")) {
    headers.set("accept", "application/json");
  }

  // Ensure x-api-key if not present, using server token fallback
  // Prefer existing Railway envs for API key
  const fallbackToken = process.env.NEXT_PUBLIC_BACKEND_TOKEN ?? process.env.BACKEND_TOKEN;
  if (fallbackToken && !headers.get("x-api-key")) {
    headers.set("x-api-key", fallbackToken);
  }

  const init: RequestInit = {
    method: req.method,
    headers
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    // Pass through the request body
    const body = await req.arrayBuffer();
    init.body = body as ArrayBuffer;
  }

  const resp = await fetch(target, init);

  // Stream the response back to the client with original headers/status
  const respHeaders = new Headers(resp.headers);
  return new Response(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers: respHeaders
  });
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(req, params.path);
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(req, params.path);
}

export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(req, params.path);
}

export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(req, params.path);
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(req, params.path);
}

export async function HEAD(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(req, params.path);
}

export async function OPTIONS() {
  // Same-origin requests generally don't require CORS preflight handling here,
  // but respond OK to be safe.
  return new Response(null, { status: 200 });
}