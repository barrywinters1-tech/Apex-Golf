import { useEffect, useRef, useState } from 'react';
import { animate } from 'motion';
import { subscribeToast, dismissToast } from '../lib/undo.js';

/** Bottom toast that springs in from where it leaves (below the tab bar). */
export default function Toast() {
  const [t, setT] = useState(null);
  const ref = useRef(null);
  useEffect(() => subscribeToast(setT), []);
  useEffect(() => {
    if (!t || !ref.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    animate(ref.current, { y: [24, 0], opacity: [0, 1] }, { type: 'spring', bounce: 0, duration: 0.35 });
  }, [t]);
  if (!t) return null;
  return (
    <div className="toast" ref={ref} role="status" aria-live="polite">
      <span>{t.message}</span>
      {t.action && <button className="btn quiet" onClick={async () => { dismissToast(); await t.action.run(); }}>{t.action.label}</button>}
    </div>
  );
}
