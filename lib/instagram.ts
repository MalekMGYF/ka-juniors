// بيقبل اليوزر لوحده، أو حتى لو حد لصق لينك انستا كامل، وبيرجع اليوزر نضيف
// وبيرجع null لو مش صحيح (عشان نمنع تسجيل يوزر غلط)
export function normalizeInstagramUsername(raw: string): string | null {
  if (!raw) return null;

  let value = raw.trim();

  // لو حد لصق لينك كامل زي instagram.com/username أو https://www.instagram.com/username/
  value = value.replace(/^https?:\/\//i, "");
  value = value.replace(/^(www\.)?instagram\.com\//i, "");
  value = value.replace(/^@/, "");
  value = value.split("/")[0];
  value = value.split("?")[0];
  value = value.trim().toLowerCase();

  // نفس شروط انستا: حروف إنجليزي صغيرة، أرقام، نقطة، أندر سكور، من 1 لـ 30 حرف
  if (!/^[a-z0-9._]{1,30}$/.test(value)) return null;

  return value;
}

export function instagramProfileUrl(username: string) {
  return `https://www.instagram.com/${username}/`;
}
