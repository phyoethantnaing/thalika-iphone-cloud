import { NextRequest, NextResponse } from "next/server";
import { allowRequest, allowedOrigin, configured, sessionCookie, validInternal, validSession } from "@/lib/security/session";

export async function proxy(request: NextRequest) {
  const route = request.nextUrl.pathname;
  const api = route.startsWith("/api/");
  const mutation = !["GET", "HEAD", "OPTIONS"].includes(request.method);
  const reject = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
  if (route === "/api/health" && !mutation) return NextResponse.next();
  if (route === "/api/internal/runtime") {
    if (!validInternal(request.headers.get("authorization"))) return reject("Unauthorized", 401);
    return NextResponse.next();
  }
  if (!configured()) {
    if (route === "/login") return NextResponse.next();
    return reject("Owner authentication is not configured. Run npm run setup:owner.", 503);
  }
  const loginRoute = route === "/login" || route === "/api/auth/login";
  if (!loginRoute && !validSession(request.cookies.get(sessionCookie)?.value)) {
    return api ? reject("Sign in required", 401) : NextResponse.redirect(new URL("/login", request.url));
  }
  if (mutation) {
    if (!allowedOrigin(request)) return reject("Invalid request origin", 403);
    if (!allowRequest("mutations", 180)) return reject("Too many requests", 429);
    const maximum = loginRoute ? 8192 : 15 * 1024 * 1024;
    if (Number(request.headers.get("content-length") || 0) > maximum) return reject("Upload exceeds 15 MB request limit", 413);
    // Also enforce the cap for chunked requests with no Content-Length.
    const reader = request.clone().body?.getReader();
    if (reader) {
      let bytes = 0;
      for (;;) {
        const part = await reader.read();
        if (part.done) break;
        bytes += part.value.byteLength;
        if (bytes > maximum) { void reader.cancel(); return reject("Upload exceeds request limit", 413); }
      }
    }
  }
  if (loginRoute) return NextResponse.next();
  if (process.env.THALIKA_ROLE === "control" && !api && route !== "/settings") return NextResponse.redirect(new URL("/settings", request.url));
  if (process.env.THALIKA_ROLE === "control" && api && !/^\/api\/(cloud\/|auth\/)/.test(route)) return reject("Studio is available on the GPU Pod", 404);
  if (process.env.THALIKA_CLOUD === "1" && mutation && ["/api/voxcpm-local", "/api/settings/voxcpm2-endpoint"].includes(route)) return reject("Container supervisor manages the model in cloud mode", 409);
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store");
  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|fonts/|manifest.webmanifest|sw.js|offline.html).*)"] };
