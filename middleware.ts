import { auth } from "~/server/auth";

export default auth((req) => {
  // If user is NOT logged in and trying to access /dashboard
  if (!req.auth && req.nextUrl.pathname.startsWith("/dashboard")) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.href);
    return Response.redirect(loginUrl);
  }

  // Otherwise allow
  return undefined;
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
