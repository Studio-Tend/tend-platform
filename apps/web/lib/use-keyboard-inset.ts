import { useEffect, useState } from 'react';

/** How much of the layout viewport the on-screen keyboard is covering. */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const sync = () => {
      const covered = window.innerHeight - viewport.offsetTop - viewport.height;
      const next = covered > 0 ? Math.round(covered) : 0;
      setInset((current) => (current === next ? current : next));
    };

    sync();
    viewport.addEventListener('resize', sync);
    viewport.addEventListener('scroll', sync);
    return () => {
      viewport.removeEventListener('resize', sync);
      viewport.removeEventListener('scroll', sync);
    };
  }, []);

  return inset;
}
