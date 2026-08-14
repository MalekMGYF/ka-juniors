"use client";

import { useEffect, useState } from "react";

const STEPS = [
  {
    icon: "🎯",
    title: "خمن الطالب",
    text: "من التاب بار تحت، افتح \"خمن الطالب\" واقرا الوصف واكتب اسم الطالب. كل إجابة صح = 5 كوين ونقطة."
  },
  {
    icon: "📅",
    title: "السؤال اليومي",
    text: "كل يوم فيه سؤال جديد. جاوب وانتظر موافقة الأدمن — أول 5 يجاوبوا صح ياخدوا نقط إضافية."
  },
  {
    icon: "🏆",
    title: "الترتيب",
    text: "كل ما تجمع نقط، ترتيبك بيتقدم ولقبك بيترقى. دوس على أي حد في الترتيب تشوف بروفايله كامل."
  }
];

const STORAGE_KEY = "ka_onboarded_v1";

export default function Onboarding() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      const done = localStorage.getItem(STORAGE_KEY);
      if (!done) setShow(true);
    } catch {
      // تجاهل لو الموبايل بيمنع localStorage
    }
  }, []);

  function finish() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setShow(false);
  }

  if (!show) return null;

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="onboarding-overlay">
      <div className="card" style={{ maxWidth: 360, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 46, marginBottom: 14 }}>{s.icon}</div>
        <h3 style={{ marginTop: 0, marginBottom: 10 }}>{s.title}</h3>
        <p className="muted" style={{ fontSize: 14, lineHeight: 1.8 }}>{s.text}</p>

        <div className="onboarding-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={`onboarding-dot ${i === step ? "active" : ""}`} />
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <button className="btn btn-outline" onClick={finish}>
            تخطي
          </button>
          <button
            className="btn btn-gold"
            onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
          >
            {isLast ? "يلا نبدأ" : "التالي"}
          </button>
        </div>
      </div>
    </div>
  );
}
