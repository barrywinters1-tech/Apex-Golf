import { useEffect, useRef } from 'react';
import { animate } from 'motion';

const REDUCED = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Apple's momentum projection (Designing Fluid Interfaces). */
const project = (v, d = 0.998) => (v / 1000) * d / (1 - d);

/**
 * Bottom sheet. Springs in, tracks the finger 1:1 on drag, rubber-bands above
 * its rest position, and decides open/close from projected momentum, handing
 * the release velocity into the closing spring so there is no seam.
 */
export default function Sheet({ open, title, onClose, children }) {
  const ref = useRef(null), scrimRef = useRef(null);
  const y = useRef(0), anim = useRef(null);

  useEffect(() => {
    if (!open) return;
    const el = ref.current, scrim = scrimRef.current;
    const h = el.offsetHeight;
    const desktop = window.matchMedia('(min-width: 721px)').matches;
    const tx = desktop ? 'translateX(-50%) ' : '';
    const setY = v => { y.current = v; el.style.transform = `${tx}translateY(${v}px)`; scrim.style.opacity = String(Math.max(0, 1 - v / h)); };
    const spring = (to, velocity = 0, onDone) => {
      anim.current?.stop();
      if (REDUCED()) { setY(to); onDone?.(); return; }
      anim.current = animate(y.current, to, { type: 'spring', bounce: velocity ? 0.15 : 0, duration: 0.42, velocity, onUpdate: setY, onComplete: onDone });
    };
    setY(h); spring(0);

    let drag = null; // {startY, offset, hist:[{t,y}]}
    const onDown = e => {
      if (e.target.closest('button, input, select, textarea, a, label, [contenteditable]')) return; // leave controls alone
      if (e.target.closest('.sheet-body') && ref.current.querySelector('.sheet-body').scrollTop > 0) return;
      anim.current?.stop();
      drag = { start: e.clientY, offset: y.current, hist: [{ t: performance.now(), y: y.current }] };
      el.setPointerCapture(e.pointerId);
    };
    const onMove = e => {
      if (!drag) return;
      let v = drag.offset + (e.clientY - drag.start);
      if (v < 0) v = (v * 0.55 * h) / (h + 0.55 * Math.abs(v)); // rubber-band above rest
      setY(v);
      drag.hist.push({ t: performance.now(), y: v }); if (drag.hist.length > 6) drag.hist.shift();
    };
    const onUp = () => {
      if (!drag) return;
      const a = drag.hist[0], b = drag.hist[drag.hist.length - 1];
      const vel = b.t > a.t ? ((b.y - a.y) / (b.t - a.t)) * 1000 : 0; // px/s
      drag = null;
      const landing = y.current + project(vel);
      if (landing > h * 0.4) spring(h, vel, onClose); else spring(0, vel);
    };
    el.addEventListener('pointerdown', onDown); el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp); el.addEventListener('pointercancel', onUp);
    const onKey = e => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    const close = () => spring(h, 0, onClose);
    scrim.addEventListener('click', close);
    return () => { anim.current?.stop(); window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="scrim" ref={scrimRef} style={{ opacity: 0 }} />
      <div className="sheet" ref={ref} role="dialog" aria-modal="true" aria-label={title}>
        <div className="grabber" />
        <div className="sheet-head"><h2>{title}</h2><button className="btn quiet" onClick={() => { const h = ref.current.offsetHeight; animate(y.current, h, { type: 'spring', bounce: 0, duration: 0.35, onUpdate: v => { ref.current.style.transform = `${window.matchMedia('(min-width: 721px)').matches ? 'translateX(-50%) ' : ''}translateY(${v}px)`; scrimRef.current.style.opacity = String(1 - v / h); }, onComplete: onClose }); }}>Done</button></div>
        <div className="sheet-body">{children}</div>
      </div>
    </>
  );
}
