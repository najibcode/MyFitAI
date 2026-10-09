import { useState } from 'react';

export interface AthleteAvatarProps {
  photoURL?: string | null;
  name?: string;
  size?: number; // e.g. 40, 64, 96, 112
  className?: string;
  verified?: boolean;
}

/**
 * Minimal Geometric Athlete Avatar
 * 
 * If a custom photo exists and loads, renders user's photo with object-cover.
 * If no photo exists or image fails to load, renders a sleek athletic geometric
 * gradient monogram with dark obsidian and subtle green highlights — matching
 * the MyFitAI design system without emojis or cartoon illustrations.
 */
export default function AthleteAvatar({
  photoURL,
  name = 'Athlete',
  size = 48,
  className = '',
  verified = false,
}: AthleteAvatarProps) {
  const [imageError, setImageError] = useState(false);

  // Derive 1 or 2 uppercase initials
  const initials = (name || 'Athlete')
    .split(' ')
    .filter(Boolean)
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'A';

  const hasPhoto = Boolean(photoURL && !imageError);

  return (
    <div
      className={`relative rounded-2xl overflow-hidden shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {hasPhoto ? (
        <img
          src={photoURL!}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        /* Minimal Geometric Athlete Monogram & Silhouette */
        <div
          className="w-full h-full bg-gradient-to-br from-[#1E1E20] via-[#151517] to-[#0D0D0F] border border-[#2A2A2D] flex items-center justify-center relative overflow-hidden"
          style={{ width: size, height: size }}
        >
          {/* Subtle geometric angle background */}
          <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-[#30D158]/10 rounded-full blur-sm" />
          
          {/* Monogram initials */}
          <span
            className="font-headline font-black text-[#F5F5F5] tracking-tight relative z-10"
            style={{ fontSize: Math.max(12, Math.round(size * 0.38)) }}
          >
            {initials}
          </span>
        </div>
      )}

      {/* Verified check badge */}
      {verified && (
        <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-[#30D158] rounded-lg sm:rounded-xl flex items-center justify-center border-2 border-[#151517] shadow-sm">
          <svg
            className="w-3 h-3 text-black stroke-[3.5]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </div>
  );
}
