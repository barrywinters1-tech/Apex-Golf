import { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { Field } from './ui.jsx';

/** Passwordless sign-in: Supabase emails a link and a 6-digit code; either works. */
export default function Login() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const send = async e => {
    e.preventDefault(); setBusy(true); setErr('');
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { emailRedirectTo: location.origin + location.pathname, data: name.trim() ? { name: name.trim() } : undefined } });
    setBusy(false);
    if (error) setErr(error.message); else setSent(true);
  };
  const verify = async e => {
    e.preventDefault(); setBusy(true); setErr('');
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) setErr(error.message);
  };

  return (
    <div className="login">
      <div className="login-card fade-in">
        <div className="brand" style={{ justifyContent: 'center', marginBottom: 6 }}><svg viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="11" fill="none" stroke="var(--speed)" strokeWidth="3"/><circle cx="14" cy="14" r="7" fill="none" stroke="var(--strike)" strokeWidth="3"/><circle cx="14" cy="14" r="3" fill="var(--accuracy)"/></svg>Apex Golf</div>
        {!sent ? (
          <form onSubmit={send} className="fields">
            <h1 style={{ textAlign: 'center' }}>Sign in</h1>
            <p className="sub" style={{ textAlign: 'center' }}>No password. We email you a link and a code.</p>
            <Field id="l-email" label="Email" className="wide"><input id="l-email" type="email" required autoComplete="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></Field>
            <Field id="l-name" label="Name (first time only)" className="wide"><input id="l-name" value={name} onChange={e => setName(e.target.value)} placeholder="Barry Winters" autoComplete="name" /></Field>
            <button className="btn primary block wide" disabled={busy || !email}>{busy ? 'Sending…' : 'Email me a link'}</button>
            {err && <p className="status wide" style={{ color: 'var(--speed)' }}>{err}</p>}
          </form>
        ) : (
          <form onSubmit={verify} className="fields">
            <h1 style={{ textAlign: 'center' }}>Check your email</h1>
            <p className="sub" style={{ textAlign: 'center' }}>Tap the link in the email to {email}, or type the code from it here.</p>
            <Field id="l-code" label="Code" className="wide"><input id="l-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value)} placeholder="123456" style={{ letterSpacing: 4, fontFamily: 'var(--display)', fontSize: 22, textAlign: 'center' }} /></Field>
            <button className="btn primary block wide" disabled={busy || code.length < 6}>{busy ? 'Checking…' : 'Sign in'}</button>
            <button type="button" className="btn quiet block wide" onClick={() => { setSent(false); setCode(''); }}>Use a different email</button>
            {err && <p className="status wide" style={{ color: 'var(--speed)' }}>{err}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
