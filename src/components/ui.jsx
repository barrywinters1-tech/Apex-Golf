export const Card = ({ title, sub, children, className = '', style }) => (
  <div className={`card ${className}`} style={style}>{title && <h3>{title}</h3>}{sub && <div className="sub">{sub}</div>}{children}</div>
);

export const Tile = ({ label, value, unit, delta, bench }) => (
  <div className="card tile">
    <div className="lbl">{label}</div>
    <div className="val">{value}{unit && <small>{unit}</small>}</div>
    {delta && <div className={`delta ${delta.cls || ''}`}>{delta.txt}</div>}
    {bench && <div className="bench">{bench}</div>}
  </div>
);

export const Field = ({ id, label, children, className = '' }) => (
  <div className={className}><label htmlFor={id}>{label}</label>{children}</div>
);

export const Empty = ({ children }) => <div className="empty">{children}</div>;

export const num = v => { const n = parseFloat(v); return isNaN(n) ? null : n; };
export const lines = v => String(v || '').split('\n').map(s => s.trim()).filter(Boolean);

/** Read a <form> into an object by input name. */
export const formData = form => Object.fromEntries(new FormData(form).entries());
