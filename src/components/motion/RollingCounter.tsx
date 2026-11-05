import { useEffect, useState, useRef } from 'react';
import { useReducedMotion } from '../../design/motion';

interface RollingCounterProps {
  value: number;
  durationMs?: number;
  formatter?: (val: number) => string;
  className?: string;
  prefix?: string;
  suffix?: string;
}

/**
 * Athletic rolling numeric counter with requestAnimationFrame interpolation.
 * Prevents layout jitter via tabular-nums and smooth spring-like deceleration.
 */
export function RollingCounter({
  value,
  durationMs = 350,
  formatter = (v) => Math.round(v).toLocaleString(),
  className = '',
  prefix = '',
  suffix = '',
}: RollingCounterProps) {
  const prefersReduced = useReducedMotion();
  const [displayValue, setDisplayValue] = useState<number>(value);
  const startValRef = useRef<number>(value);
  const targetValRef = useRef<number>(value);
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReduced) {
      setDisplayValue(value);
      targetValRef.current = value;
      return;
    }

    startValRef.current = displayValue;
    targetValRef.current = value;
    startTimeRef.current = performance.now();

    if (startValRef.current === targetValRef.current) return;

    // Small step ticks (delta of 1-3) animate faster
    const delta = Math.abs(targetValRef.current - startValRef.current);
    const effectiveDuration = delta <= 3 ? 180 : durationMs;

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(1, elapsed / effectiveDuration);

      // Athletic deceleration curve: 1 - (1 - progress)^3
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValRef.current + (targetValRef.current - startValRef.current) * eased;

      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetValRef.current);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, durationMs, prefersReduced]);

  return (
    <span className={`tabular-nums inline-block select-none ${className}`}>
      {prefix}
      {formatter(displayValue)}
      {suffix}
    </span>
  );
}

export default RollingCounter;
