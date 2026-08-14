// Style reminder: error states stay quiet, Arabic, and charcoal so they feel like part of K.A Juniors rather than a framework fallback.

import type { NextPageContext } from "next";

export default function ErrorPage({ statusCode }: { statusCode?: number }) {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#08080a", color: "#f3f1ea", textAlign: "center" }}>
      <div>
        <div style={{ color: "#f5b942", fontFamily: "Marhey, sans-serif", fontSize: 18 }}>K.A Juniors ✦</div>
        <h1 style={{ margin: "18px 0 8px", fontFamily: "Marhey, sans-serif", fontSize: 32 }}>{statusCode || 500}</h1>
        <p style={{ margin: 0, color: "#9a9aa1", fontFamily: "Cairo, sans-serif" }}>حصلت لخبطة صغيرة… جرّب تفتح الصفحة تاني.</p>
        <a href="/" style={{ display: "inline-block", marginTop: 20, padding: "10px 16px", borderRadius: 999, background: "#f5b942", color: "#201400", fontFamily: "Cairo, sans-serif", fontWeight: 800 }}>ارجع للبداية</a>
      </div>
    </main>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => ({ statusCode: res?.statusCode || err?.statusCode || 500 });
