import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const userSession = req.cookies.get("ka_session")?.value;
  const adminSession = req.cookies.get("ka_admin_session")?.value;

  // صفحات الأدمن (بما فيها تسجيل دخول الأدمن) بتدخل عادي دايمًا، حتى قبل موعد الإطلاق
  const isAdminPath = pathname.startsWith("/admin");

  // حماية صفحات الأدمن (ما عدا صفحة تسجيل دخول الأدمن)
  if (isAdminPath && pathname !== "/admin/login") {
    if (!adminSession) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  // بوابة عداد الإطلاق: أي حد (حتى لو مسجل دخول) بيشوف صفحة العداد لو لسه قبل الموعد
  if (!isAdminPath && pathname !== "/countdown") {
    try {
      const statusRes = await fetch(new URL("/api/launch-status", req.url), {
        cache: "no-store"
      });
      if (statusRes.ok) {
        const status = await statusRes.json();
        if (status.isBeforeLaunch) {
          const url = new URL("/countdown", req.url);
          url.searchParams.set("next", pathname);
          return NextResponse.redirect(url);
        }
      }
    } catch {
      // لو حصل أي خطأ في التحقق من الموعد، سيب الموقع يشتغل عادي بدل ما يقفل بالغلط
    }
  }

  // حماية صفحات اللاعبين
  const protectedPaths = [
    "/game",
    "/leaderboard",
    "/profile",
    "/daily",
    "/levels",
    "/achievements",
    "/cheer",
    "/shop",
    "/settings",
    "/auction",
    "/memory",
    "/wheel",
    "/pictionary"
  ];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !userSession) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"
  ]
};
