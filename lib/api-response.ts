import { NextResponse } from "next/server";

// بيضمن إن أي رد JSON من الـ API ميتخزنش في أي كاش (متصفح أو شبكة توصيل المحتوى)
export function noStoreJson(data: any, init?: { status?: number }) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
    }
  });
}
