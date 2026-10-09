
export interface MyFitAILogoProps {
  size?: number;
  className?: string;
  variant?: 'mark' | 'full' | 'adaptive-foreground';
  showSubtitle?: boolean;
}

/**
 * MyFitAI Official Brand Mark — The Kinetic Apex Crest
 * 
 * An original, geometric athletic symbol combining human velocity, upward
 * biomechanical progression, and intelligent performance tracking.
 * 
 * Scalable from 16px favicon up to 1024px launcher and store assets.
 */
export default function MyFitAILogo({
  size = 32,
  className = '',
  variant = 'mark',
  showSubtitle = true,
}: MyFitAILogoProps) {
  // Master Vector Geometry (100 x 100 coordinate space)
  // Two interlocking forward-surging athletic blades forming an apex vector.
  const markSvg = (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-label="MyFitAI Logo"
    >
      <defs>
        {/* Athletic Kinetic Green Gradient */}
        <linearGradient id="myfitai-green-grad" x1="16" y1="84" x2="84" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="50%" stopColor="#30D158" />
          <stop offset="100%" stopColor="#5EEB78" />
        </linearGradient>

        {/* Counter Blade Silver-White Gradient */}
        <linearGradient id="myfitai-silver-grad" x1="30" y1="20" x2="84" y2="74" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#A1A1A6" />
        </linearGradient>

        {/* Subtle Ambient Depth Glow */}
        <filter id="myfitai-glow" x="0%" y="0%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#30D158" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Primary Dynamic Surge Blade (Ascending Power Vector) */}
      <path
        d="M20 78 L42 22 C43.2 19 46.8 19 48 22 L62 48 L48 56 L38 38 L24 78 Z"
        fill="url(#myfitai-green-grad)"
        filter="url(#myfitai-glow)"
      />

      {/* Interlocking Apex Crest Blade (Precision Counter Vector) */}
      <path
        d="M48 22 C49.2 19 52.8 19 54 22 L80 78 L66 78 L58 60 L68 38 L54 48 Z"
        fill="url(#myfitai-silver-grad)"
      />

      {/* Center Biometric Surge Spark (Diamond Core) */}
      <polygon
        points="51,36 57,48 51,60 45,48"
        fill="#30D158"
      />
    </svg>
  );

  if (variant === 'mark') {
    return markSvg;
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {markSvg}
      <div className="flex flex-col justify-center select-none">
        <span className="font-headline font-black text-base sm:text-lg tracking-tight text-[var(--color-on-surface)] leading-none">
          MyFit<span className="text-[var(--color-primary)]">AI</span>
        </span>
        {showSubtitle && (
          <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--color-muted)] font-semibold mt-0.5">
            ATHLETE OS
          </span>
        )}
      </div>
    </div>
  );
}
