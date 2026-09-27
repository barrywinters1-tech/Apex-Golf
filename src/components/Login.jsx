import { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { Field } from './ui.jsx';

/** Passwordless sign-in: Supabase emails a magic link (custom SMTP would also allow a 6-digit code). */
export default function Login() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const send = async e => {
    e.preventDefault?.(); setBusy(true); setErr('');
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { emailRedirectTo: location.origin + location.pathname, data: name.trim() ? { name: name.trim() } : undefined } });
    setBusy(false);
    if (error) setErr(error.message); else setSent(true);
  };

  return (
    <div className="login">
      <div className="login-card fade-in">
        <div className="brand" style={{ justifyContent: 'center', marginBottom: 6 }}><svg viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="11" fill="none" stroke="var(--speed)" strokeWidth="3"/><circle cx="14" cy="14" r="7" fill="none" stroke="var(--strike)" strokeWidth="3"/><circle cx="14" cy="14" r="3" fill="var(--accuracy)"/></svg>Apex Golf</div>
        {!sent ? (
          <form onSubmit={send} className="fields">
            <h1 style={{ textAlign: 'center' }}>Sign in</h1>
            <p className="sub" style={{ textAlign: 'center' }}>No password. We email you a sign-in link.</p>
            <Field id="l-email" label="Email" className="wide"><input id="l-email" type="email" required autoComplete="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></Field>
            <Field id="l-name" label="Name (first time only)" className="wide"><input id="l-name" value={name} onChange={e => setName(e.target.value)} placeholder="Barry Winters" autoComplete="name" /></Field>
            <button className="btn primary block wide" disabled={busy || !email}>{busy ? 'Sending…' : 'Email me a link'}</button>
            {err && <p className="status wide" style={{ color: 'var(--speed)' }}>{err}</p>}
          </form>
        ) : (
          <div className="fields">
            <h1 style={{ textAlign: 'center' }}>Check your email</h1>
            <p className="sub" style={{ textAlign: 'center' }}>We've sent a sign-in link to <b>{email}</b>. Open it on this device and you'll land back here, signed in. Check spam if it hasn't arrived in a minute.</p>
            <button type="button" className="btn primary block wide" disabled={busy} onClick={send}>{busy ? 'Sending…' : 'Send it again'}</button>
            <button type="button" className="btn quiet block wide" onClick={() => setSent(false)}>Use a different email</button>
            {err && <p className="status wide" style={{ color: 'var(--speed)' }}>{err}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
