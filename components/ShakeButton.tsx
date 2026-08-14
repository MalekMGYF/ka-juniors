"use client";

import { useState } from "react";

export default function ShakeButton({
  children,
  onClick,
  type = "button",
  className = "btn",
  disabled = false
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
}) {
  const [shaking, setShaking] = useState(false);

  function handleClick() {
    setShaking(true);
    setTimeout(() => setShaking(false), 400);
    onClick?.();
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={handleClick}
      className={`${className} ${shaking ? "shaking" : ""}`}
    >
      {children}
    </button>
  );
}
