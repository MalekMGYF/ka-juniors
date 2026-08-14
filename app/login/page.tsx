"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ShakeButton from "../../components/ShakeButton";

export default function LoginPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, password })
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
      <div className="card" style={{ maxWidth: 400, width: "100%" }}>
        <div className="logo-mark" style={{ justifyContent: "center", width: "100%", marginBottom: 6 }}>
          <span className="spark">✦</span>
          K.A Juniors
        </div>
        <p className="subtitle" style={{ textAlign: "center" }}>سجل دخولك</p>

        {error && <div className="error-text">{error}</div>}

        <div className="field">
          <label>اللقب</label>
          <input
            className="input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>

        <div className="field">
          <label>الباسورد</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <ShakeButton className="btn btn-gold" onClick={submit} disabled={loading}>
          {loading ? "جاري الدخول..." : "دخول"}
        </ShakeButton>

        <p className="subtitle" style={{ textAlign: "center", marginTop: 16, marginBottom: 0 }}>
          لسه مسجلتش؟ <a href="/register" style={{ color: "var(--gold)" }}>اعمل حساب</a>
        </p>
      </div>
    </div>
  );
}
