"use client";

import Lottie from "lottie-react";

import eyeAnimation from "@/public/lottie/magic-eye.json";

export default function MagicEyeAccent({ className = "" }) {
  return (
    <div className={`magic-eye-accent pointer-events-none select-none ${className}`} aria-hidden="true">
      <div className="magic-eye-glow" />
      <Lottie animationData={eyeAnimation} autoplay className="magic-eye-lottie" loop />
    </div>
  );
}
