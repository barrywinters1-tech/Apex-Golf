/**
 * Coaching knowledge base — principles paraphrased from Dane Cvetkovic's
 * "The Art of Practice" and "My 10 Biggest Golf Hacks" (Barry's copies).
 * Ideas only; no text from the books is reproduced here.
 */

/** Performance Matrix: work backwards from what you want → ball flight → impact. */
export const PERFORMANCE_MATRIX = {
  performance: ['Max distance', 'Distance control', 'Direction', 'Trajectory'],
  ballFlight: ['Start line', 'Launch angle', 'Ball speed', 'Spin axis', 'Spin rate'],
  impact: ['Face strike', 'Ground contact', 'Face direction', 'Swing path', 'Club speed', 'Angle of attack', 'Dynamic loft'],
};

/** The four boxes of the physical game, with distance bands (metres, as the coach uses). */
export const GAME_BOXES = [
  ['Long game', ['Tee shots / driving', '200 m+', '180–200 m', '160–180 m', '140–160 m', '120–140 m', 'Trouble shots']],
  ['Approach', ['100–120 m', '90–100 m', '80–90 m', '70–80 m', '60–70 m', '50–60 m', '40–50 m', '30–40 m']],
  ['Short game', ['Bump and run', 'Pitch', 'Lob', 'Flop', 'Bunker', 'Trouble around the green']],
  ['Putting', ['Long (>30 ft)', 'Mid (10–30 ft)', 'Short (<10 ft)']],
];

/** Practice modes — every session should know which one it is. */
export const PRACTICE_MODES = [
  ['technique', 'Technique', 'Change the movement. Away from a target (net). Ignore outcome.'],
  ['skill', 'Skill', 'Control impact on purpose: strike, path, face, curve, height, low point.'],
  ['performance', 'Performance', 'Test where you are. Score it. Smaller targets than the course.'],
];

/** Dispersion bands relative to the INTENDED target (not the flag). */
export const DISPERSION_BANDS = [-20, -15, -10, -5, 0, 5, 10, 15, 20];

/** Own-caddie routine, per shot. */
export const SHOT_ROUTINE = ['Measure the real distance', 'Read the environment: lie, wind, temperature, flag', 'Pick the playing number and the target', 'Choose the club', 'Pre-shot routine with one attentional focus', 'Commit and execute', 'Evaluate: did I commit 100%?', 'Reset'];

/**
 * Impact report from a TrackMan club-average row. Reads the impact laws the
 * numbers can see and explains them in the coach's language. Signs: right/open = +.
 */
export function impactReport(s, { premiumBall = true } = {}) {
  if (!s) return [];
  const out = [];
  const driver = /driver/i.test(s.club || '');
  // Face strike ≈ smash factor (efficiency)
  if (s.smash != null) {
    const ideal = driver ? 1.48 : /wedge|gw|sw|lw|pw/i.test(s.club) ? 1.25 : 1.36;
    const gap = ideal - s.smash;
    out.push({ law: 'Face strike', metric: `Smash ${s.smash.toFixed(2)}`, verdict: gap > 0.06 ? 'off-centre' : gap > 0.02 ? 'close' : 'solid', note: premiumBall ? `Ideal ~${ideal}. ${gap > 0.06 ? 'Energy is leaking — strike location or loft delivery.' : 'Good energy transfer.'}` : `Range balls read low; judge strike on a premium ball.`, level: gap > 0.06 ? 2 : gap > 0.02 ? 1 : 0 });
  }
  // Face direction vs path
  if (s.ftp != null) {
    const a = Math.abs(s.ftp);
    out.push({ law: 'Face direction', metric: `Face-to-path ${s.ftp > 0 ? '+' : ''}${s.ftp.toFixed(1)}°`, verdict: a < 1.5 ? 'square to path' : s.ftp > 0 ? 'open to path (fade/slice)' : 'closed to path (draw/hook)', note: a < 1.5 ? 'Curvature under control.' : 'Curvature comes from here. Every 1° of face-to-path is roughly 3–4 yds of curve on a driver.', level: a < 1.5 ? 0 : a < 3 ? 1 : 2 });
  }
  if (s.path != null) {
    const a = Math.abs(s.path);
    out.push({ law: 'Swing path', metric: `Path ${s.path > 0 ? '+' : ''}${s.path.toFixed(1)}°`, verdict: a < 2 ? 'neutral' : s.path > 0 ? 'in-to-out' : 'out-to-in', note: a < 2 ? 'Start line will follow the face.' : s.path > 0 ? 'Sets up a push or draw; with an open face it becomes a push-slice.' : 'Sets up a pull or fade; with a closed face it becomes a pull-hook.', level: a < 2 ? 0 : a < 4 ? 1 : 2 });
  }
  if (s.aoa != null) {
    const ok = driver ? s.aoa >= 0 && s.aoa <= 5 : s.aoa <= 0 && s.aoa >= -6;
    out.push({ law: 'Angle of attack', metric: `AoA ${s.aoa > 0 ? '+' : ''}${s.aoa.toFixed(1)}°`, verdict: ok ? (driver ? 'upward — good for distance' : 'descending — good') : driver ? (s.aoa > 5 ? 'very upward' : 'downward') : 'not descending', note: driver ? 'Positive AoA lowers spin and adds carry at the same speed. Too steep up costs control.' : 'Irons want a slightly descending strike so the low point is past the ball.', level: ok ? 0 : 1 });
  }
  if (s.spin != null && driver) {
    out.push({ law: 'Spin rate', metric: `${Math.round(s.spin)} rpm`, verdict: s.spin < 2000 ? 'low' : s.spin <= 3000 ? 'optimal window' : s.spin <= 3600 ? 'a little high' : 'high', note: premiumBall ? 'Driver window ~2,000–3,000 rpm. High spin = lost carry; check strike height and dynamic loft.' : 'Low-compression range balls spin high; ignore until measured on a premium ball.', level: premiumBall ? (s.spin > 3600 ? 2 : s.spin > 3000 ? 1 : 0) : 0 });
  }
  if (s.chs != null && driver) {
    out.push({ law: 'Club speed', metric: `${s.chs.toFixed(1)} mph`, verdict: s.chs >= 112 ? 'D1-level speed' : s.chs >= 105 ? 'strong club speed' : 'moderate', note: 'Speed is not the constraint; strike and face control are where the carry is.', level: 0 });
  }
  return out;
}

/** Text block for AI prompts. */
export const KNOWLEDGE_SUMMARY = `Coaching frame (paraphrased from the coach's reading):
- Impact is king: the ball only responds to face strike, ground contact, face direction, swing path, club speed, angle of attack and dynamic loft.
- Work backwards: performance factor (distance, distance control, direction, trajectory) -> ball-flight law (start line, launch, ball speed, spin axis, spin rate) -> impact law. Change technique only when you know which impact factor you're changing.
- Three practice modes: Technique (movement change, away from a target), Skill (control impact on purpose), Performance (test and score with smaller targets). Say which mode each drill is.
- Track dispersion relative to the intended target, not the flag.
- Mental: no mental mistakes — commit 100% on club and target for every shot and score it; one attentional focus per shot; be your own caddie.`;
