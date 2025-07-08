import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(request) {
  const token = request.cookies.get("token")?.value;

  if (!token) {
    const redirectURL = new URL("/", request.url);
    redirectURL.searchParams.set("unauthorized", "true");
    return NextResponse.redirect(redirectURL);
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    const redirectURL = new URL("/", request.url);
    redirectURL.searchParams.set("unauthorized", "true");
    return NextResponse.redirect(redirectURL);
  }
}

export const config = {
  matcher: ["/edit_map"],
};
