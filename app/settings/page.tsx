"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";
import ShakeButton from "../../components/ShakeButton";
import { SCHOOLS } from "../../lib/schools";

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

export default function SettingsPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [instagram, setInstagram] = useState("");
  const [school, setSchool] = useState("");

  async function load() {
    const res = await fetch("/api/me", { cache: "no-store" });
    const data = await res.json();
    setMe(data.user);
    if (data.user) {
      setFullName(data.user.full_name || "");
      setNickname(data.user.nickname || "");
      setInstagram(data.user.instagram_username || "");
      setSchool(data.user.school || SCHOOLS[0].name);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, nickname, instagram, school })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "حصل خطأ");
        setSaving(false);
        return;
      }
      setSuccess("اتحفظ بنجاح ✦");
      setMe((prev) =>
        prev
          ? { ...prev, full_name: data.user.full_name, nickname: data.user.nickname, instagram_username: data.user.instagram_username, school: data.user.school }
          : prev
      );
      router.refresh();
    } catch {
      setError("حصل خطأ، جرب تاني");
    }
    setSaving(false);
  }

  return (
    <AppShell
      nickname={me?.nickname}
      coins={me?.coins}
      points={me?.points}
      dailyPoints={me?.daily_points}
      avatarUrl={me?.avatar_url}
      frameColor={me?.equippedFrameColor}
    >
      <div className="title-row">
        <div>
          <h2 style={{ margin: 0 }}>الإعدادات</h2>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            غيّر اسمك أو لقبك أو يوزر الانستا بتاعك
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card empty">جاري التحميل...</div>
      ) : !me ? (
        <div className="card empty">حصل خطأ في تحميل البيانات</div>
      ) : (
        <div className="card">
          {error && <div className="error-text">{error}</div>}
          {success && <div className="success-text">{success}</div>}

          <div className="field">
            <label>الاسم ثلاثي</label>
            <input
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="مثال: محمد أحمد علي"
            />
          </div>

          <div className="field">
            <label>اللقب (اللي بيظهر في الترتيب)</label>
            <input
              className="input"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="اللقب بتاعك"
            />
          </div>

          <div className="field">
            <label>يوزر الانستا</label>
            <input
              className="input"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="مثال: mohamed_ahmed (من غير @)"
              dir="ltr"
              style={{ textAlign: "right" }}
            />
          </div>

          <div className="field">
            <label>المدرسة</label>
            <select className="input" value={school} onChange={(e) => setSchool(e.target.value)}>
              {SCHOOLS.map((item) => (
                <option key={item.name} value={item.name}>{item.name}</option>
              ))}
            </select>
          </div>

          <ShakeButton className="btn btn-gold" onClick={save} disabled={saving}>
            {saving ? "جاري الحفظ..." : "احفظ التعديلات"}
          </ShakeButton>

          <p className="subtitle" style={{ textAlign: "center", marginTop: 14, marginBottom: 0 }}>
            المدرسة الجديدة هتظهر فورًا في بروفايلك وفي ترتيب أفضل مدرسة وكل الترتيبات
          </p>
        </div>
      )}
    </AppShell>
  );
}
