import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "as_session";

function getSecret() {
  const secret = process.env.AUTH_SECRET || "dev-only-insecure-secret-change-me-0000000000";
  return new TextEncoder().encode(secret);
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  let valid = false;
  if (token) {
    try {
      await jwtVerify(token, getSecret());
      valid = true;
    } catch {
      valid = false;
    }
  }

  const { pathname } = req.nextUrl;
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (!valid && pathname.startsWith("/dashboard")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (valid && isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
};
