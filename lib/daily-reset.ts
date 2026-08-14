// بيرجع بداية اليوم الحالي (بتوقيت السيرفر) كـ ISO string، عشان نستخدمه في
// أي حد يومي (محاولات اللعب، لفة العجلة) من غير أي cron job — المقارنة بتتم
// وقت كل قراءة أو كتابة على طول.
export function startOfTodayISO(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return start.toISOString();
}
