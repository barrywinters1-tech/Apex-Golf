import { useEffect, useRef } from 'react';
import { animate } from 'motion';

const I = {
  overview: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>,
  coach: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 4h8v3H8z"/><path d="M16 5.5h2.5V21h-13V5.5H8"/><path d="M9 12l2 2 4-4"/></svg>,
  trackman: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18c4-1 6-6 9-9s6-4 9-5"/><circle cx="6" cy="18" r="1.5"/></svg>,
  course: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21V4"/><path d="M8 4l9 3-9 3"/><path d="M4 21h10"/></svg>,
  practice: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>,
};

/** Five tabs (iOS ceiling). Coach holds Blueprint / Lessons / Academy; Data lives in the account sheet. */
export const TABS = [['overview', 'Today'], ['practice', 'Practice'], ['trackman', 'Range'], ['course', 'Course'], ['coach', 'Coach']];
export const COACH_TABS = [['blueprint', 'Blueprint'], ['lessons', 'Lessons'], ['academy', 'Academy']];

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
      {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onPointerDown={() => onChange(k)}>{I[k]}<span>{l}</span></button>)}
    </nav>
  );
}

export function SubNav({ sub, onChange }) {
  return (
    <div className="subnav" role="tablist" aria-label="Coach">
      {COACH_TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={sub === k} onPointerDown={() => onChange(k)}>{l}</button>)}
    </div>
  );
}
