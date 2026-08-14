"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";
import ShakeButton from "../../components/ShakeButton";
import Onboarding from "../../components/Onboarding";
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

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [referral, setReferral] = useState<ReferralStats>(null);
  const [referralLink, setReferralLink] = useState("");
  const [copyLabel, setCopyLabel] = useState("انسخ");

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

  useEffect(() => {
    load();
    loadReferral();
  }, []);

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
          <div
            className="public-profile-hero"
            style={{
              background: `radial-gradient(circle at 50% 0%, ${level.color}22, var(--surface) 70%)`,
              border: `1px solid ${level.color}44`
            }}
          >
            <div
              className={`public-profile-avatar-wrap ${isLegendary && !me.equippedFrameColor ? "frame-legendary" : ""}`}
              style={{ border: `3px solid ${me.equippedFrameColor || level.color}`, cursor: "pointer" }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="avatar avatar-lg">
                {me.avatar_url ? (
                  <img
                    src={me.avatar_url}
                    alt={me.nickname}
                    style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                  />
                ) : (
                  initial
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />

            <div style={{ fontFamily: "Marhey, sans-serif", fontWeight: 700, fontSize: 22 }}>
              {me.nickname}
            </div>
            {me.equippedTitle && (
              <div style={{ fontSize: 13, color: "var(--gold)", fontWeight: 700, marginTop: 2 }}>
                ✦ {me.equippedTitle}
              </div>
            )}
            <div style={{ fontSize: 13, color: level.color, fontWeight: 700, marginTop: 4 }}>
              {level.icon} {level.name}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                marginTop: 10,
                fontSize: 13
              }}
            >
              <span className="school-dot" style={{ background: schoolColor }} />
              <span className="muted">{me.school}</span>
            </div>

            <button
              className="btn btn-outline"
              style={{ width: "auto", padding: "6px 14px", fontSize: 12, marginTop: 14 }}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "جاري الرفع..." : "غيّر الصورة"}
            </button>
          </div>

          {error && <div className="error-text">{error}</div>}

          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <div className="profile-stat">
                <div className="profile-stat-value" style={{ color: "var(--mint)" }}>
                  {totalPoints}
                </div>
                <div className="profile-stat-label">إجمالي النقط ⭐</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-value" style={{ color: "var(--gold)" }}>
                  {me.coins}
                </div>
                <div className="profile-stat-label">الكوينات 🪙</div>
              </div>
            </div>

            {nextLevel ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                  <span className="muted">باقي {nextLevel.minPoints - totalPoints} نقطة على {nextLevel.name}</span>
                  <span className="muted">{progressPct}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${progressPct}%`, background: nextLevel.color }} />
                </div>
              </>
            ) : (
              <div className="success-text" style={{ textAlign: "center", marginBottom: 0 }}>
                🎉 وصلت لأعلى مستوى في الموقع
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <div className="profile-stat">
                <div className="profile-stat-value" style={{ color: "var(--text)", fontSize: 15 }}>
                  {me.points || 0}
                </div>
                <div className="profile-stat-label">نقاط خمن الطالب</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-value" style={{ color: "var(--text)", fontSize: 15 }}>
                  {me.daily_points || 0}
                </div>
                <div className="profile-stat-label">نقاط السؤال اليومي</div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <a href="/levels" className="btn btn-outline" style={{ textAlign: "center" }}>
              🏅 المستويات
            </a>
            <a href="/achievements" className="btn btn-outline" style={{ textAlign: "center" }}>
              🎖️ الإنجازات
            </a>
            <a href="/shop" className="btn btn-outline" style={{ textAlign: "center" }}>
              🛍️ المتجر
            </a>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <a href="/auction" className="btn btn-outline" style={{ textAlign: "center" }}>
              🏺 المزاد
            </a>
            <a href="/memory" className="btn btn-outline" style={{ textAlign: "center" }}>
              🧠 تحدي الذاكرة
            </a>
            <a href="/wheel" className="btn btn-outline" style={{ textAlign: "center" }}>
              🎡 عجلة الحظ
            </a>
          </div>

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
