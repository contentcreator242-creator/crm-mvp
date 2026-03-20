import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/organization/create(.*)",
  "/api/health(.*)",
  "/api/stripe/webhook(.*)",
  "/api/lead-capture(.*)",
  "/embed(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Protect everything except explicit public endpoints.
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  const { userId, orgId } = await auth();
  const path = req.nextUrl.pathname;
  const isApi = path.startsWith("/api");
  const isOrgCreate = path.startsWith("/organization/create");

  // Enforce active organization for all signed-in app pages.
  if (userId && !orgId && !isApi && !isOrgCreate && !isPublicRoute(req)) {
    const url = new URL("/organization/create", req.url);
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: [
    // Skip static files and Next internals.
    "/((?!.*\\..*|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};

