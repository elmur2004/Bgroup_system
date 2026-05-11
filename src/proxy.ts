import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const publicPaths = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/api/auth",
  "/book", // public booking pages
  "/jobs", // public job posts
  "/api/health", // observability probe
];

// Public API endpoints that bypass module gates entirely.
const PUBLIC_API_PATTERNS = [
  /^\/api\/hr\/jobs\/[^/]+\/apply$/, // public application submission
  /^\/api\/v1\/.*/, // versioned public REST API uses API-key auth
];

function isPublic(pathname: string): boolean {
  if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return true;
  }
  return PUBLIC_API_PATTERNS.some((re) => re.test(pathname));
}

export async function proxy(request: NextRequest) {
  // Use NextAuth to get session
  const session = await auth();
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // Allow static files, _next, favicon
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Not authenticated → API routes return JSON 401; pages redirect to login
  if (!session?.user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const modules = session.user.modules || [];

  // Module access enforcement — pages
  if (pathname.startsWith("/hr") && !modules.includes("hr")) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (pathname.startsWith("/crm") && !modules.includes("crm")) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (pathname.startsWith("/partners") && !modules.includes("partners")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Module access enforcement — API routes
  if (pathname.startsWith("/api/hr") && !modules.includes("hr")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (pathname.startsWith("/api/crm") && !modules.includes("crm")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (pathname.startsWith("/api/partners") && !modules.includes("partners")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
