import { getSessionFromCookies } from "../lib/auth";

export default function Home() {
  const session = getSessionFromCookies();

  return (
    <div className="hero">
      <div className="hero-top">
        <div className="logo-mark">
          <span className="spark">✦</span>
          K.A Juniors
        </div>
      </div>

      <div className="hero-body">
        <h1 className="hero-title">
          منصة K.A Juniors
          <br />
          للترتيب والتحدي بين الطلاب
        </h1>
        <p className="hero-sub">
          سجل بياناتك، ادخل لعبة "خمن الطالب"، اجمع نقط وكوينات، واتصدر
          الترتيب العام مع زمايلك في المدرسة.
        </p>

        <div className="hero-actions">
          {session ? (
            <a href="/profile" className="btn btn-gold">
              روح البروفايل بتاعك
            </a>
          ) : (
            <>
              <a href="/register" className="btn btn-gold">
                اعمل حساب جديد
              </a>
              <a href="/login" className="btn btn-outline">
                سجل دخول
              </a>
            </>
          )}
        </div>
      </div>

      <div className="hero-credit">
        <span className="muted" style={{ fontSize: 13 }}>صُنع بواسطة</span>
        <span className="hero-credit-name">K.A Juniors</span>
        <a
          href="https://instagram.com/k.a.juniors"
          target="_blank"
          rel="noreferrer"
          className="hero-credit-link"
        >
          📸 حسابنا على إنستجرام
        </a>
      </div>
    </div>
  );
}
