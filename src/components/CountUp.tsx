import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface Props {
  value: number;
  format: (n: number) => string;
  duration?: number;
}

/** Counts up once from 0 to `value` on mount. Honors prefers-reduced-motion. */
const CountUp = ({ value, format, duration = 700 }: Props) => {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);
  const raf = useRef<number>();

  useEffect(() => {
    if (reduce || duration <= 0) { setDisplay(value); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(t === 1 ? value : value * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value, duration, reduce]);

  return <span aria-label={format(value)}>{format(reduce || display === value ? value : Math.round(display))}</span>;
};

export default CountUp;
