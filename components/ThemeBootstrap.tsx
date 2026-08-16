"use client";

import { useEffect } from "react";
import { THEME_STORAGE_KEY } from "../lib/theme";

export default function ThemeBootstrap() {
  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === "light" || saved === "dark") document.documentElement.dataset.theme = saved;
    } catch {}
  }, []);

  return null;
}
