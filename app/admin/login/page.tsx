"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ShakeButton from "../../../components/ShakeButton";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError("");
    setLoading(true);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "حصل خطأ");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="center-page login-gate admin-gate">
      <div className="card login-gate-card" style={{ maxWidth: 380, width: "100%" }}>
        <div className="login-gate-mark" aria-hidden="true"><span>✎</span><i>✦</i></div>
        <div className="logo-mark" style={{ justifyContent: "center", width: "100%", marginBottom: 6 }}>لوحة التحكم</div>
        <h1>جهّز الجولة الجاية</h1>
        <p className="subtitle" style={{ textAlign: "center" }}>هنا بتضيف التحديات وبتخلي اللعبة أحلى.</p>

        {error && <div className="error-text">{error}</div>}

        <div className="field">
          <label>باسورد الأدمن</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>

        <ShakeButton className="btn btn-gold" onClick={submit} disabled={loading}>
          {loading ? "جاري الدخول..." : "دخول"}
        </ShakeButton>
      </div>
    </div>
  );
}
