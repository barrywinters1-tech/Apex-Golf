import { useEffect, useRef } from 'react';
import { animate } from 'motion';

const I = {
  overview: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>,
  blueprint: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>,
  trackman: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18c4-1 6-6 9-9s6-4 9-5"/><circle cx="6" cy="18" r="1.5"/></svg>,
  course: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21V4"/><path d="M8 4l9 3-9 3"/><path d="M4 21h10"/></svg>,
  lessons: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h14v16H5z"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>,
  academy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l9-4 9 4-9 4-9-4z"/><path d="M7 10v5c0 1.5 2.5 3 5 3s5-1.5 5-3v-5"/></svg>,
  data: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 19h16"/></svg>,
};

export const TABS = [
  ['overview', 'Overview'], ['blueprint', 'Blueprint'], ['trackman', 'TrackMan'],
  ['course', 'Course'], ['lessons', 'Lessons'], ['academy', 'Academy'], ['data', 'Data'],
];

export function Segmented({ tab, onChange }) {
  const ref = useRef(null), thumb = useRef(null);
  useEffect(() => {
    const btn = ref.current?.querySelector(`[data-tab="${tab}"]`); if (!btn || !thumb.current) return;
    const to = { x: btn.offsetLeft, width: btn.offsetWidth };
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !thumb.current.dataset.ready) { thumb.current.style.transform = `translateX(${to.x}px)`; thumb.current.style.width = `${to.width}px`; thumb.current.dataset.ready = '1'; return; }
    animate(thumb.current, { x: to.x, width: to.width }, { type: 'spring', bounce: 0, duration: 0.35 });
  }, [tab]);
  return (
    <div className="segmented" role="tablist" ref={ref}>
      <div className="thumb" ref={thumb} />
      {TABS.map(([k, l]) => <button key={k} role="tab" data-tab={k} aria-selected={tab === k} onPointerDown={() => onChange(k)}>{l}</button>)}
    </div>
  );
}

export function TabBar({ tab, onChange }) {
  return (
    <nav className="tabbar" role="tablist">
      {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onPointerDown={() => onChange(k)}>{I[k]}{l}</button>)}
    </nav>
  );
}
