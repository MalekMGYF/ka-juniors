// Style reminder: KA Juniors player cards feel like collectible identity cards—layered midnight surfaces, a warm gold frame, mint progress signals, and clear Arabic hierarchy without visual clutter.

import type { CSSProperties, ReactNode } from "react";

type Level = { name: string; icon: string; color: string };
type NextLevel = { name: string; minPoints: number; color: string } | null;

type PlayerCardProps = {
  nickname: string;
  school: string;
  initial: string;
  avatarUrl?: string | null;
  frameColor?: string | null;
  equippedTitle?: string | null;
  level: Level;
  totalPoints: number;
  coins: number;
  points: number;
  dailyPoints: number;
  nextLevel: NextLevel;
  progressPct: number;
  isLegendary?: boolean;
  editable?: boolean;
  uploading?: boolean;
  onAvatarClick?: () => void;
  footer?: ReactNode;
};

export default function PlayerCard({
  nickname,
  school,
  initial,
  avatarUrl,
  frameColor,
  equippedTitle,
  level,
  totalPoints,
  coins,
  points,
  dailyPoints,
  nextLevel,
  progressPct,
  isLegendary = false,
  editable = false,
  uploading = false,
  onAvatarClick,
  footer
}: PlayerCardProps) {
  const avatar = (
    <div className="ka-player-card-avatar" style={{ borderColor: frameColor || level.color }}>
      <div className="avatar avatar-lg">
        {avatarUrl ? (
          <img src={avatarUrl} alt={nickname} />
        ) : (
          initial
        )}
      </div>
      {editable && <span className="ka-player-card-avatar-edit">✦</span>}
    </div>
  );

  return (
    <article
      className={`ka-player-card${isLegendary && !frameColor ? " is-legendary" : ""}`}
      style={{ "--player-accent": level.color, "--player-frame": frameColor || level.color } as CSSProperties}
    >
      <div className="ka-player-card-orbit ka-player-card-orbit-one" aria-hidden="true" />
      <div className="ka-player-card-orbit ka-player-card-orbit-two" aria-hidden="true" />
      <header className="ka-player-card-header">
        <div>
          <span>KA JUNIORS</span>
          <b>بطاقة اللاعب</b>
        </div>
        <i aria-hidden="true">✦</i>
      </header>

      <div className="ka-player-card-identity">
        {editable ? (
          <button
            type="button"
            className="ka-player-card-avatar-button"
            onClick={onAvatarClick}
            disabled={uploading}
            aria-label="تغيير صورة البروفايل"
          >
            {avatar}
          </button>
        ) : (
          avatar
        )}
        <div className="ka-player-card-person">
          <span className="ka-player-card-label">لاعب مميز</span>
          <h2>{nickname}</h2>
          {equippedTitle && <strong className="ka-player-card-title">✦ {equippedTitle}</strong>}
          <div className="ka-player-card-school">
            <span className="school-dot" style={{ background: level.color }} />
            <span>{school}</span>
          </div>
        </div>
      </div>

      <div className="ka-player-card-level">
        <div className="ka-player-card-level-head">
          <span>مستواك الحالي</span>
          <strong style={{ color: level.color }}>{level.icon} {level.name}</strong>
        </div>
        <div className="ka-player-card-progress-head">
          <small>{nextLevel ? `فاضلك ${nextLevel.minPoints - totalPoints} نقطة على ${nextLevel.name}` : "وصلت للقمة"}</small>
          <b>{progressPct}%</b>
        </div>
        <div className="ka-player-card-progress" aria-label={`التقدم ${progressPct}%`}>
          <span style={{ width: `${progressPct}%`, background: nextLevel?.color || level.color }} />
        </div>
      </div>

      <div className="ka-player-card-stats">
        <div>
          <span>إجمالي النقاط</span>
          <strong>{totalPoints}</strong>
          <small>مستوى اللاعب</small>
        </div>
        <div>
          <span>الكوينز</span>
          <strong>{coins}</strong>
          <small>رصيدك الحالي</small>
        </div>
      </div>

      <div className="ka-player-card-breakdown">
        <span>الأساسية <b>{points}</b></span>
        <span>اليومية <b>{dailyPoints}</b></span>
        {uploading && <span className="is-loading">جاري تحديث الصورة…</span>}
      </div>
      {footer}
    </article>
  );
}
