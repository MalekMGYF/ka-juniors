"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ShakeButton from "../../components/ShakeButton";
import { SCHOOLS } from "../../lib/schools";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [instagram, setInstagram] = useState("");
  const [school, setSchool] = useState(SCHOOLS[0].name);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refCode, setRefCode] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setRefCode(ref);
  }, []);

  async function submit() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, nickname, instagram, school, password, ref: refCode || undefined })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "حصل خطأ");
        setLoading(false);
        return;
      }
      router.push("/profile");
      router.refresh();
    } catch {
      setError("حصل خطأ، جرب تاني");
      setLoading(false);
    }
  }

  return (
    <div className="center-page">
      <div className="card" style={{ maxWidth: 420, width: "100%" }}>
        <div className="logo-mark" style={{ justifyContent: "center", width: "100%", marginBottom: 6 }}>
          <span className="spark">✦</span>
          K.A Juniors
        </div>
        <p className="subtitle" style={{ textAlign: "center" }}>
          سجل بياناتك وابدأ تلعب وتتصدر
        </p>

        {error && <div className="error-text">{error}</div>}
        {refCode && (
          <div className="success-text" style={{ textAlign: "center" }}>
            🎁 اتدعيت بلينك صاحبك، هتاخد 10 كوينات هدية لما تسجل
          </div>
        )}

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
          <label>اللقب</label>
          <input
            className="input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="اللقب اللي هيظهر في الترتيب"
          />
        </div>

        <div className="field">
          <label>يوزر الانستا بتاعك</label>
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
          <select
            className="input"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
          >
            {SCHOOLS.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>الباسورد</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6 حروف/أرقام على الأقل"
          />
        </div>

        <ShakeButton className="btn btn-gold" onClick={submit} disabled={loading}>
          {loading ? "جاري التسجيل..." : "سجل دلوقتي"}
        </ShakeButton>

        <p className="subtitle" style={{ textAlign: "center", marginTop: 16, marginBottom: 0 }}>
          عندك حساب؟ <a href="/login" style={{ color: "var(--gold)" }}>سجل دخول</a>
        </p>
      </div>
    </div>
  );
}
