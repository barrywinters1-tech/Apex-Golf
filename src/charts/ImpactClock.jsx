/**
 * Impact diagram, top-down (the way coaches draw it on a whiteboard):
 * target line straight up, club path arrow rotated by path°, face line rotated by face angle
 * (path + face-to-path). Right/open = positive = clockwise. Plus a side view of attack angle.
 */
export default function ImpactClock({ path = 0, ftp = 0, aoa = 0, size = 180 }) {
  const c = size / 2, r = size * 0.36;
  const face = path + ftp;
  const rot = deg => `rotate(${deg} ${c} ${c})`;
  const curve = Math.abs(ftp) < 1.5 ? 'straight' : ftp > 0 ? 'fade' : 'draw';
  const start = Math.abs(face) < 1.5 ? 'at target' : face > 0 ? 'right' : 'left';
  return (
    <div className="clock-wrap">
      <svg className="clock" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Path ${path}°, face ${face}° at impact`}>
        <circle className="ring" cx={c} cy={c} r={r} />
        <line className="target" x1={c} y1={c + r} x2={c} y2={c - r - 6} />
        <text className="lab" x={c} y={c - r - 10} textAnchor="middle">target</text>
        <g transform={rot(path * 4)}>{/* exaggerate ×4 so 3° reads clearly */}
          <line className="path" x1={c} y1={c + r * 0.9} x2={c} y2={c - r * 0.9} />
          <polygon className="path-head" points={`${c},${c - r * 0.98} ${c - 6},${c - r * 0.8} ${c + 6},${c - r * 0.8}`} />
        </g>
        <g transform={rot(face * 4)}>
          <line className="face" x1={c - 22} y1={c} x2={c + 22} y2={c} />
          <circle className="ball" cx={c} cy={c - 7} r="5" />
        </g>
      </svg>
      <div className="clock-read">
        <div><span className="k">Path</span><b>{path > 0 ? '+' : ''}{Number(path).toFixed(1)}°</b><span className="s">{Math.abs(path) < 2 ? 'neutral' : path > 0 ? 'in-to-out' : 'out-to-in'}</span></div>
        <div><span className="k">Face</span><b>{face > 0 ? '+' : ''}{Number(face).toFixed(1)}°</b><span className="s">starts {start}</span></div>
        <div><span className="k">Face to path</span><b>{ftp > 0 ? '+' : ''}{Number(ftp).toFixed(1)}°</b><span className="s">{curve}</span></div>
        <div><span className="k">Attack</span><b>{aoa > 0 ? '+' : ''}{Number(aoa).toFixed(1)}°</b><span className="s">{aoa > 0 ? 'upward' : 'downward'}</span></div>
      </div>
      <div className="muted small" style={{ marginTop: 6 }}>Angles drawn ×4 so they read; numbers are real. Right / open = +.</div>
    </div>
  );
}
