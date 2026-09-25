/**
 * Who is signed in, which player is selected, which library applies.
 * Local mode (no Supabase): status 'local', player 'local', library 'local'.
 */
import { useEffect, useState, useCallback } from 'react';
import { supabase, cloud } from './supabase.js';
import { setScope, getPlayerId } from '../db/repo.js';
import { pullPlayer, pullLibrary, flush } from '../db/sync.js';
import { seedStarterLessons } from '../db/seed.js';

const remember = id => { try { localStorage.setItem('apex.player', id); } catch {} };
const remembered = () => { try { return localStorage.getItem('apex.player'); } catch { return null; } };

export function useSession() {
  const [s, setS] = useState(() => cloud ? { status: 'loading' } : { status: 'local', isCoach: true, players: [], current: 'local' });

  const load = useCallback(async user => {
    if (!user) { setScope({ playerId: 'local', libraryId: 'local' }); setS({ status: 'signed-out' }); return; }
    try {
      let { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (!profile) { await new Promise(r => setTimeout(r, 800)); ({ data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()); }
      const isCoach = profile?.role === 'coach';
      let { data: players } = await supabase.from('players').select('*').order('created_at');
      players = players || [];
      if (!players.some(p => p.user_id === user.id) && !isCoach) { await supabase.rpc('ensure_self_player'); ({ data: players } = await supabase.from('players').select('*').order('created_at')); players = players || []; }
      if (!players.length && isCoach) { await supabase.rpc('ensure_self_player'); ({ data: players } = await supabase.from('players').select('*').order('created_at')); players = players || []; }
      const own = players.find(p => p.user_id === user.id);
      const want = remembered();
      const current = players.find(p => p.id === want)?.id || own?.id || players[0]?.id;
      const libraryId = isCoach ? user.id : (players.find(p => p.id === current)?.coach_id || user.id);
      setScope({ playerId: current, libraryId });
      const meta = players.find(p => p.id === current) || {};
      await Promise.all([pullPlayer(current, { name: meta.name, email: meta.email }), pullLibrary(libraryId)]);
      if (libraryId === user.id) await seedStarterLessons(libraryId);
      setS({ status: 'ready', user, profile: profile || { id: user.id, email: user.email, role: 'player' }, isCoach, players, current, libraryId });
    } catch (e) { console.error(e); setS({ status: 'error', error: e.message, user }); }
  }, []);

  useEffect(() => {
    if (!cloud) return;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => { if (alive) load(data.session?.user || null); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') load(session?.user || null);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [load]);

  const selectPlayer = useCallback(async id => {
    if (!cloud || id === getPlayerId()) return;
    remember(id);
    const meta = s.players?.find(p => p.id === id) || {};
    const libraryId = s.isCoach ? s.user.id : (meta.coach_id || s.user.id);
    setScope({ playerId: id, libraryId });
    await Promise.all([pullPlayer(id, { name: meta.name, email: meta.email }), pullLibrary(libraryId)]);
    setS(x => ({ ...x, current: id, libraryId }));
  }, [s]);

  const addPlayer = useCallback(async (name, email) => {
    const { data, error } = await supabase.rpc('add_player', { p_name: name, p_email: email });
    if (error) throw error;
    const { data: players } = await supabase.from('players').select('*').order('created_at');
    setS(x => ({ ...x, players: players || x.players }));
    return data;
  }, []);

  const refresh = useCallback(async () => { if (!cloud || s.status !== 'ready') return; await load(s.user); }, [s, load]);
  const signOut = useCallback(async () => { await flush(); await supabase.auth.signOut(); remember(''); }, []);

  return { ...s, cloud, selectPlayer, addPlayer, refresh, signOut };
}
