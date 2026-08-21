export type School = {
  name: string;
  color: string;
  short: string;
};

export const SCHOOLS: School[] = [
  { name: "مدرسة كمال عامر", color: "#7c9cf0", short: "ك.ع" },
  { name: "مدرسة سامح سيف اليزل", color: "#f08ad0", short: "س.ي" },
  { name: "مدرسة عمر سليمان", color: "#7ce0c0", short: "ع.س" },
  { name: "مدرسة إبراهيم رفاعي", color: "#f5b942", short: "إ.ر" },
  { name: "مدرسة عمرو بن العاص", color: "#aa8cf0", short: "ع.ب" }
];

export function getSchoolColor(name?: string | null): string {
  const found = SCHOOLS.find((s) => s.name === name);
  return found ? found.color : "#9a9aa1";
}

export function getSchoolShort(name?: string | null): string {
  const found = SCHOOLS.find((s) => s.name === name);
  return found ? found.short : "؟";
}
