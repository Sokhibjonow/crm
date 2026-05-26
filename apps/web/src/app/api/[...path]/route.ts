// Route handler that proxies every /api/* request to the NestJS backend.
// Browser sees same-origin (no CORS), and this handler forwards the body
// and method to the real API. Replaces a fragile next.config.mjs rewrite
// that failed to forward POST bodies to absolute-URL destinations.

import { NextRequest, NextResponse } from 'next/server';

const API_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'https://crm-api-wine-beta.vercel.app';

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  // Let fetch decide encoding/length on its own — passing through breaks streaming.
  'content-encoding',
  'content-length',
]);

function filterHeaders(src: Headers): Headers {
  const out = new Headers();
  src.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) out.append(key, value);
  });
  return out;
}

async function proxy(req: NextRequest): Promise<NextResponse> {
  const incoming = new URL(req.url);
  const target = new URL(incoming.pathname + incoming.search, API_URL);

  const headers = filterHeaders(req.headers);
  const body =
    req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.text();

  const upstream = await fetch(target.toString(), {
    method: req.method,
    headers,
    body,
    redirect: 'manual',
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: filterHeaders(upstream.headers),
  });
}

export async function GET(req: NextRequest) {
  return proxy(req);
}
export async function POST(req: NextRequest) {
  return proxy(req);
}
export async function PUT(req: NextRequest) {
  return proxy(req);
}
export async function PATCH(req: NextRequest) {
  return proxy(req);
}
export async function DELETE(req: NextRequest) {
  return proxy(req);
}
export async function OPTIONS(req: NextRequest) {
  return proxy(req);
}
export async function HEAD(req: NextRequest) {
  return proxy(req);
}
