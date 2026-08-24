// Style reminder: profile shortcuts are a compact personal control panel—only distinct destinations appear here, with balanced touch targets on mobile.
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";
import ShakeButton from "../../components/ShakeButton";
import Onboarding from "../../components/Onboarding";
import PlayerCard from "../../components/PlayerCard";
import { getLevel, getLevelIndex, getNextLevel, LEVELS } from "../../lib/levels";
import { getSchoolColor } from "../../lib/schools";

type Me = {
  nickname: string;
  full_name: string;
  school: string;
  points: number;
  coins: number;
  avatar_url?: string | null;
  daily_points?: number;
  instagram_username?: string | null;
  equippedTitle?: string | null;
  equippedFrameColor?: string | null;
} | null;

function resizeImage(file: File, maxSize = 500): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject("no ctx");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

type ReferralStats = {
  referralCode: string | null;
  invitedCount: number;
  coinsEarned: number;
} | null;

type VaultItem = { id: string; name: string; description: string; type: "title" | "frame"; value: string; owned: boolean; active: boolean };

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [referral, setReferral] = useState<ReferralStats>(null);
  const [referralLink, setReferralLink] = useState("");
  const [copyLabel, setCopyLabel] = useState("انسخ");
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [vaultBusyId, setVaultBusyId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/me", { cache: "no-store" });
    const data = await res.json();
    setMe(data.user);
    setLoading(false);
  }

  async function loadReferral() {
    const res = await fetch("/api/referrals", { cache: "no-store" });
    const data = await res.json();
    setReferral(data);
    if (data.referralCode && typeof window !== "undefined") {
      setReferralLink(`${window.location.origin}/register?ref=${data.referralCode}`);
    }
  }

  async function loadVault() {
    const res = await fetch("/api/shop", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setVaultItems(data.items || []);
  }

  useEffect(() => {
    load();
    loadReferral();
    loadVault();
    try {
      setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    } catch {}
  }, []);

  function setAppearance(nextTheme: "dark" | "light") {
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    try { localStorage.setItem("ka_theme_preference", nextTheme); } catch {}
  }

  async function toggleVaultItem(item: VaultItem) {
    if (!item.owned || vaultBusyId) return;
    setVaultBusyId(item.id);
    const res = await fetch("/api/shop/equip", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId: item.id, activate: !item.active }) });
    if (res.ok) {
      setVaultItems((items) => items.map((entry) => entry.type === item.type ? { ...entry, active: entry.id === item.id ? !item.active : false } : entry));
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "حصلت مشكلة في تجهيز العنصر");
    }
    setVaultBusyId(null);
  }

  async function copyReferralLink() {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopyLabel("اتنسخ ✓");
      setTimeout(() => setCopyLabel("انسخ"), 1800);
    } catch {
      setCopyLabel("مقدرتش أنسخ");
      setTimeout(() => setCopyLabel("انسخ"), 1800);
    }
  }

  async function shareReferralLink() {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: "K.A Juniors",
          text: "سجل معايا في K.A Juniors وخد 10 كوينات هدية!",
          url: referralLink
        });
        return;
      } catch {
        // المستخدم لغى المشاركة أو حصل خطأ، جرب النسخ بدالها
      }
    }
    copyReferralLink();
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const dataUrl = await resizeImage(file);
      const res = await fetch("/api/profile/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: dataUrl })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "حصل خطأ في رفع الصورة");
      } else {
        setMe((prev) => (prev ? { ...prev, avatar_url: data.avatarUrl } : prev));
      }
    } catch {
      setError("حصل خطأ، جرب صورة تانية");
    }
    setUploading(false);
  }

  const initial = me?.nickname ? me.nickname.trim().charAt(0) : "؟";
  const totalPoints = (me?.points || 0) + (me?.daily_points || 0);
  const level = getLevel(totalPoints);
  const levelIdx = getLevelIndex(totalPoints);
  const nextLevel = getNextLevel(totalPoints);
  const isLegendary = levelIdx >= LEVELS.length - 3;
  const schoolColor = getSchoolColor(me?.school);

  const progressPct = nextLevel
    ? Math.min(
        100,
        Math.round(
          ((totalPoints - level.minPoints) / (nextLevel.minPoints - level.minPoints)) * 100
        )
      )
    : 100;

  return (
    <AppShell
      nickname={me?.nickname}
      coins={me?.coins}
      points={me?.points}
      dailyPoints={me?.daily_points}
      avatarUrl={me?.avatar_url} frameColor={me?.equippedFrameColor}
    >
      <Onboarding />

      <div className="title-row">
        <div>
          <h2 style={{ margin: 0 }}>البروفايل بتاعك</h2>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            بياناتك ونقطك وكويناتك في مكان واحد
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card empty">جاري التحميل...</div>
      ) : !me ? (
        <div className="card empty">حصل خطأ في تحميل البيانات</div>
      ) : (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          <PlayerCard
            nickname={me.nickname}
            school={me.school}
            initial={initial}
            avatarUrl={me.avatar_url}
            frameColor={me.equippedFrameColor}
            equippedTitle={me.equippedTitle}
            level={level}
            totalPoints={totalPoints}
            coins={me.coins}
            points={me.points || 0}
            dailyPoints={me.daily_points || 0}
            nextLevel={nextLevel}
            progressPct={progressPct}
            isLegendary={isLegendary}
            editable
            uploading={uploading}
            onAvatarClick={() => fileInputRef.current?.click()}
          />

          {error && <div className="error-text">{error}</div>}
          <p className="ka-player-card-helper">اضغط على صورتك لتغييرها، والبطاقة دي هي الشكل اللي أصحابك هيشوفوه عنك.</p>

          <div className="profile-quick-links">
            <button type="button" className="btn btn-gold ka-vault-launch" onClick={() => setVaultOpen(true)}>
              <span>🗄️</span><span><b>خزنتي</b><small>إطارات وألقابك</small></span>
            </button>
            <a href="/levels" className="btn btn-outline" style={{ textAlign: "center" }}>
              🏅 المستويات
            </a>
            <a href="/achievements" className="btn btn-outline" style={{ textAlign: "center" }}>
              🎖️ الإنجازات
            </a>
            <a href="/shop" className="btn btn-outline" style={{ textAlign: "center" }}>
              🛍️ المتجر
            </a>
            <a href="/auction" className="btn btn-outline" style={{ textAlign: "center" }}>
              🏺 المزاد
            </a>
          </div>

          {vaultOpen && (
            <div className="ka-vault-overlay" role="dialog" aria-modal="true" aria-label="خزنتي" onClick={() => setVaultOpen(false)}>
              <section className="ka-vault-card" onClick={(event) => event.stopPropagation()}>
                <header><div><span>مقتنياتك</span><h3>خزنتي</h3><p>اختار لقب وإطار واحد عشان يظهروا في بروفايلك.</p></div><button type="button" onClick={() => setVaultOpen(false)} aria-label="إغلاق الخزنة">×</button></header>
                {vaultItems.filter((item) => item.owned).length === 0 ? (
                  <div className="ka-vault-empty"><span>🔒</span><b>الخزنة لسه فاضية</b><p>اكسب كوينات واشتري ألقاب أو إطارات من المتجر عشان يظهروا هنا.</p><a href="/shop" onClick={() => setVaultOpen(false)}>روح المتجر</a></div>
                ) : (
                  <div className="ka-vault-groups">
                    {(["title", "frame"] as const).map((type) => {
                      const items = vaultItems.filter((item) => item.owned && item.type === type);
                      return items.length ? <section key={type}><h4>{type === "title" ? "الألقاب" : "الإطارات"}</h4><div className="ka-vault-items">{items.map((item) => <article className={item.active ? "active" : ""} key={item.id}><span className={type === "frame" ? "vault-frame-preview" : "vault-title-preview"} style={type === "frame" ? { borderColor: item.value } : undefined}>{type === "frame" ? "صورتك" : "✦"}</span><div><b>{item.name}</b><p>{item.description}</p></div><button type="button" disabled={vaultBusyId === item.id} onClick={() => void toggleVaultItem(item)}>{vaultBusyId === item.id ? "لحظة…" : item.active ? "مجهّز ✓" : "تجهيز"}</button></article>)}</div></section> : null;
                    })}
                  </div>
                )}
              </section>
            </div>
          )}

          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0, marginBottom: 4, fontSize: 16 }}>ادعُ أصحابك 🎁</h3>
            <p className="muted" style={{ fontSize: 13, marginTop: 0, marginBottom: 12 }}>
              كل واحد يسجل بلينكك، الاتنين ياخدوا 10 كوينات هدية فورًا
            </p>

            {referral?.referralCode ? (
              <>
                <div className="field">
                  <label>لينك الدعوة بتاعك</label>
                  <input className="input" readOnly value={referralLink} dir="ltr" style={{ textAlign: "right", fontSize: 13 }} />
                </div>
                <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  <button className="btn btn-outline" onClick={copyReferralLink}>
                    {copyLabel}
                  </button>
                  <button className="btn btn-gold" onClick={shareReferralLink}>
                    شير
                  </button>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <div className="profile-stat">
                    <div className="profile-stat-value" style={{ color: "var(--mint)" }}>
                      {referral.invitedCount}
                    </div>
                    <div className="profile-stat-label">دخلوا بلينكك</div>
                  </div>
                  <div className="profile-stat">
                    <div className="profile-stat-value" style={{ color: "var(--gold)" }}>
                      {referral.coinsEarned}
                    </div>
                    <div className="profile-stat-label">كسبت منهم كوين</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="muted" style={{ fontSize: 13 }}>جاري تجهيز لينك الدعوة بتاعك...</div>
            )}
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>البيانات الشخصية</h3>
            <div className="info-row">
              <span className="label">الاسم بالكامل</span>
              <span>{me.full_name}</span>
            </div>
            <div className="info-row">
              <span className="label">اللقب</span>
              <span>{me.nickname}</span>
            </div>
            <div className="info-row">
              <span className="label">المدرسة</span>
              <span>{me.school}</span>
            </div>
            <div className="info-row">
              <span className="label">يوزر الانستا</span>
              <span>{me.instagram_username ? `@${me.instagram_username}` : "-"}</span>
            </div>
          </div>

          <section className="appearance-card" aria-label="مظهر الموقع">
            <div>
              <span className="appearance-eyebrow">مظهر الموقع</span>
              <h3>اختار الجو اللي يريح عينك</h3>
              <p>اختيارك بيتحفظ على نفس الجهاز لكل صفحات الموقع.</p>
            </div>
            <div className="appearance-options" role="group" aria-label="تبديل وضع الموقع">
              <button type="button" className={theme === "dark" ? "active" : ""} onClick={() => setAppearance("dark")} aria-pressed={theme === "dark"}><span>🌙</span><b>Dark Mode</b><small>الوضع الداكن</small></button>
              <button type="button" className={theme === "light" ? "active" : ""} onClick={() => setAppearance("light")} aria-pressed={theme === "light"}><span>☀️</span><b>Light Mode</b><small>الوضع الفاتح</small></button>
            </div>
          </section>

          <a href="/settings" className="btn btn-outline" style={{ marginBottom: 16, display: "flex", textDecoration: "none" }}>
            ⚙️ تعديل بياناتي
          </a>

          <ShakeButton className="btn btn-danger" onClick={logout}>
            تسجيل الخروج
          </ShakeButton>
        </>
      )}
    </AppShell>
  );
}
