// Style reminder: this is a calm, gold-accented announcement card on the existing midnight K.A Juniors surface—clear, focused, and friendly on mobile.
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Notice = { enabled: boolean; message: string; buttonLabel: string; version: string };

export default function SiteNotice() {
  const pathname = usePathname();
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (pathname?.startsWith("/admin")) return;
    let active = true;
    void fetch("/api/site-notice", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        const next = data?.notice as Notice | undefined;
        if (!active || !next?.enabled || !next.message || !next.version) return;
        if (window.localStorage.getItem(`ka_site_notice_seen_${next.version}`)) return;
        setNotice(next);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [pathname]);

  if (!notice) return null;
  const acknowledge = () => {
    window.localStorage.setItem(`ka_site_notice_seen_${notice.version}`, "1");
    setNotice(null);
  };

  return (
    <div className="site-notice-overlay" role="dialog" aria-modal="true" aria-labelledby="site-notice-title">
      <section className="site-notice-card">
        <div className="site-notice-icon" aria-hidden="true">!</div>
        <span className="site-notice-kicker">تنبيه من K.A Juniors</span>
        <h2 id="site-notice-title">خد بالك</h2>
        <p>{notice.message}</p>
        <button type="button" className="site-notice-acknowledge" onClick={acknowledge}>{notice.buttonLabel}</button>
      </section>
    </div>
  );
}
