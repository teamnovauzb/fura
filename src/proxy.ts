import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Edge-safe proxy (Next 16's renamed middleware): uses only the lightweight
// config, which keeps bcrypt/Prisma out of the edge runtime.
export const { auth: proxy } = NextAuth(authConfig);

export default proxy;

export const config = {
  // Run on everything except Next internals, the auth API, and static files.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
