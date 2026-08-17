// فلتر بسيط بيمنع الشتايم الشائعة (عربي وإنجليزي). مش مثالي 100% بس بيمسك الغالبية.
const BANNED_PATTERNS: RegExp[] = [
  /ك+ل+ب+/i,
  /ح+ي+و+ا+ن+/i,
  /ع+ر+ص+/i,
  /خ+ر+ا+/i,
  /ن+ي+ك+/i,
  /ز+ب+ي+/i,
  /ق+ح+ب+/i,
  /م+ت+ن+ا+ك+/i,
  /ا+ب+ن+\s*ا+ل+ك+ل+ب+/i,
  /\bfuck\w*/i,
  /\bshit\w*/i,
  /\bbitch\w*/i,
  /\basshole\w*/i,
  /\bwhore\w*/i
];

function normalizeArabic(text: string): string {
  return text
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\u064B-\u0652]/g, ""); // شيل التشكيل
}

export function containsProfanity(text: string): boolean {
  const normalized = normalizeArabic(text);
  return BANNED_PATTERNS.some((pattern) => pattern.test(normalized));
}
