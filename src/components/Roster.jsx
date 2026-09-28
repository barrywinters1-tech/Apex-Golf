import { useState } from 'react';
import Sheet from './Sheet.jsx';
import { Field } from './ui.jsx';

/** Coach's player list + account. Opens from the player chip in the top bar. */
export default function Roster({ open, onClose, session, onData }) {
  const { players = [], current, isCoach, profile, user, selectPlayer, addPlayer, signOut, cloud } = session;
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const initials = n => (n || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  if (!cloud) return (
    <Sheet open={open} title="This device" onClose={onClose}>
      <p className="sub">Running offline — data lives in this browser only. Add Supabase keys to the deployment to enable sign-in, a coach roster and video uploads.</p>
      <div className="group"><button className="row tappable sheet-link" onClick={onData}><div className="grow"><div className="label">Data, import and sharing</div><div className="sub">TrackMan CSV, backup, share link</div></div><span aria-hidden="true">›</span></button></div>
    </Sheet>
  );

  return (
    <Sheet open={open} title={isCoach ? 'Players' : 'Account'} onClose={onClose}>
      {isCoach && (
        <div className="group" style={{ marginBottom: 14 }}>
          {players.map(p => (
            <div key={p.id} className={`row tappable ${p.id === current ? 'sel' : ''}`} onClick={async () => { setBusy(true); try { await selectPlayer(p.id); onClose(); } finally { setBusy(false); } }}>
              <span className="avatar">{initials(p.name)}</span>
              <div className="grow"><div className="label">{p.name}{p.user_id === user?.id && <span className="pill">you</span>}</div><div className="sub">{p.email || 'No email yet'}{p.user_id ? '' : ' · not signed in yet'}</div></div>
              {p.id === current && <span className="tag">viewing</span>}
            </div>
          ))}
          {!adding ? <div className="row"><button className="btn primary" onClick={() => setAdding(true)}>Add player</button></div> : (
            <form className="fields" style={{ padding: 14 }} onSubmit={async e => { e.preventDefault(); const f = new FormData(e.target); setBusy(true); setErr(''); try { const id = await addPlayer(f.get('name').trim(), f.get('email').trim()); setAdding(false); await selectPlayer(id); onClose(); } catch (x) { setErr(x.message); } finally { setBusy(false); } }}>
              <Field id="r-name" label="Name"><input id="r-name" name="name" required placeholder="Player's name" /></Field>
              <Field id="r-email" label="Email"><input id="r-email" name="email" type="email" required placeholder="They sign in with this" /></Field>
              <div className="wide" style={{ display: 'flex', gap: 8 }}><button className="btn primary" disabled={busy}>Add</button><button type="button" className="btn" onClick={() => setAdding(false)}>Cancel</button></div>
              {err && <p className="status wide" style={{ color: 'var(--speed)' }}>{err}</p>}
            </form>
          )}
        </div>
      )}
      <div className="group">
        <div className="row"><div className="grow"><div className="label">{profile?.name || user?.email}</div><div className="sub">{user?.email} · {isCoach ? 'Coach' : 'Player'}</div></div></div>
        <button className="row tappable sheet-link" onClick={onData}><div className="grow"><div className="label">Data, import and sharing</div><div className="sub">TrackMan CSV, backup, share link</div></div><span aria-hidden="true">›</span></button>
        <div className="row"><button className="btn" onClick={signOut}>Sign out</button></div>
      </div>
      {busy && <p className="status" style={{ marginTop: 10 }}>Loading…</p>}
    </Sheet>
  );
}
