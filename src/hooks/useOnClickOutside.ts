import { useEffect, type RefObject } from 'react';

/** Calls handler when a mousedown/touchstart lands outside the ref element. */
export function useOnClickOutside<T extends HTMLElement>(ref: RefObject<T>, handler: () => void, active = true): void {
  useEffect(() => {
    if (!active) return;
    const listener = (e: MouseEvent | TouchEvent) => {
      const el = ref.current;
      if (!el || el.contains(e.target as Node)) return;
      handler();
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler, active]);
}
