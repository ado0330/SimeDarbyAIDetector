import React from "react";

interface GlobalEyeLogoProps {
  variant?: "full" | "symbol";
  theme?: "dark" | "light" | "mono";
  size?: "sm" | "md" | "lg" | "xl";
  withTagline?: boolean;
  className?: string;
}

export function GlobalEyeSymbol({
  theme = "dark",
  className = "w-8 h-8",
}: {
  theme?: "dark" | "light" | "mono";
  className?: string;
}) {
  const isMono = theme === "mono";
  const isLight = theme === "light";

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="GlobalEye Symbol"
    >
      <defs>
        <linearGradient id="ge-react-arc" x1="8" y1="32" x2="56" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={isLight ? "#0369A1" : "#0284C7"} />
          <stop offset="50%" stopColor={isLight ? "#0891B2" : "#06B6D4"} />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>
        <linearGradient id="ge-react-iris" x1="20" y1="20" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={isLight ? "#0284C7" : "#38BDF8"} />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>
      </defs>

      {/* Upper Orbital Wing (Township Surveillance Canopy) */}
      <path
        d="M 8,32 C 8,18 19,9 32,9 C 45,9 56,18 56,32 C 50.5,21 42,15.5 32,15.5 C 22,15.5 13.5,21 8,32 Z"
        fill={isMono ? "currentColor" : "url(#ge-react-arc)"}
      />

      {/* Lower Orbital Wing (Protective Community Cradle) */}
      <path
        d="M 8,32 C 8,46 19,55 32,55 C 45,55 56,46 56,32 C 50.5,43 42,48.5 32,48.5 C 22,48.5 13.5,43 8,32 Z"
        fill={isMono ? "currentColor" : "url(#ge-react-arc)"}
      />

      {/* Central Precision Iris Ring (Vigilant Awareness) */}
      <circle
        cx="32"
        cy="32"
        r="10.5"
        fill="none"
        stroke={isMono ? "currentColor" : "url(#ge-react-iris)"}
        strokeWidth={isLight ? "3.2" : "3"}
      />

      {/* Central 4-Point Priority Triage Reticle (Intelligent Incident Focus) */}
      <path
        d="M 32,25.5 L 37.5,32 L 32,38.5 L 26.5,32 Z"
        fill={isMono ? "currentColor" : isLight ? "#0284C7" : "#38BDF8"}
      />

      {/* Center Epicenter Node */}
      <circle
        cx="32"
        cy="32"
        r="2.2"
        fill={isMono ? "currentColor" : isLight ? "#0F172A" : "#FFFFFF"}
      />
    </svg>
  );
}

export function GlobalEyeLogo({
  variant = "full",
  theme = "dark",
  size = "md",
  withTagline = true,
  className = "",
}: GlobalEyeLogoProps) {
  const sizeMap = {
    sm: { symbol: "w-6 h-6", text: "text-base", sub: "text-[9px]" },
    md: { symbol: "w-8 h-8", text: "text-lg", sub: "text-[10px]" },
    lg: { symbol: "w-10 h-10", text: "text-xl", sub: "text-xs" },
    xl: { symbol: "w-14 h-14", text: "text-2xl", sub: "text-xs" },
  };

  const currentSize = sizeMap[size];

  if (variant === "symbol") {
    return <GlobalEyeSymbol theme={theme} className={`${currentSize.symbol} ${className}`} />;
  }

  const isLight = theme === "light";
  const isMono = theme === "mono";

  return (
    <div className={`flex items-center space-x-3 select-none ${className}`}>
      <div className="shrink-0">
        <GlobalEyeSymbol theme={theme} className={currentSize.symbol} />
      </div>
      <div className="leading-tight">
        <div className={`font-bold tracking-tight ${currentSize.text} flex items-center`}>
          <span
            className={
              isMono
                ? "text-current"
                : isLight
                ? "text-slate-900"
                : "text-white"
            }
          >
            Global
          </span>
          <span
            className={
              isMono
                ? "text-current"
                : isLight
                ? "text-teal-700"
                : "text-teal-400"
            }
          >
            Eye
          </span>
        </div>
        {withTagline && (
          <p
            className={`font-semibold uppercase tracking-wider ${currentSize.sub} ${
              isMono
                ? "text-current opacity-70"
                : isLight
                ? "text-slate-500"
                : "text-slate-400"
            }`}
          >
            Sime Darby Property
          </p>
        )}
      </div>
    </div>
  );
}
