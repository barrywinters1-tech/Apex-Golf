/**
 * The coach's competency model — "World's Best Approach Player" (Jack's mind map, his wording).
 * Each branch has nodes; each node can hold lessons (video links, notes, drills) and a coach rating.
 * Rating scale: 0 not yet · 1 developing · 2 functional · 3 owned.
 */
export const RATING = ['Not yet', 'Developing', 'Functional', 'Owned'];

export const TREE = [
  { key: 'strike', label: 'Strike', colour: 'speed', nodes: ['Consistent face contact', 'Functional vertical low point', 'Functional horizontal low point'] },
  { key: 'distance', label: 'Distance', colour: 'speed', nodes: ['Functional club speed', 'Functional ball speed', 'Functional launch', 'Functional spin'] },
  { key: 'direction', label: 'Direction', colour: 'speed', nodes: ['Functional repeatable swing plane', 'Functional repeatable swing direction', 'Functional repeatable face angle'] },
  { key: 'skills', label: 'Skills', colour: 'gold', nodes: ['Club head speed control', 'Launch angle control', 'Spin control', 'Landing angle control', 'Controlling spin axis tilt', 'Carry distances', 'Go-to numbers', 'In-between numbers'] },
  { key: 'equipment', label: 'Equipment', colour: 'strike', nodes: ['Smash factor', 'Launch angle', 'Landing angle', 'Spin', 'Turf interaction', 'Curve'] },
  { key: 'access', label: 'Gaining access to acquired skills', colour: 'pink', nodes: ['Awareness', 'Pre-shot routine', 'Breath', 'Being present', 'Commitment', 'Execution', 'Post-shot routine'] },
  { key: 'iq', label: 'Golf IQ', colour: 'orange', nodes: ['Strategy: knowing expectation', 'Strategy: knowing correct target', 'Strategy: front / back / mid pin', 'How lie affects ball flight: rough', 'How lie affects ball flight: fairway', 'How lie affects ball flight: sand', 'How lie affects ball flight: slopes', 'How lie affects ball flight: clean', 'Wind: how much and what direction', 'Wind: air density and temperature', 'Reading the green: firmness and speed', 'Reading the green: slopes, above or below'] },
  { key: 'stats', label: 'Stats', colour: 'strike', nodes: ['From the fairway: 75%+ GIR', '125–150 yds: proximity 18 ft, 80% GIR', '150–175 yds: proximity 22 ft, 73% GIR', '175–200 yds: proximity 30 ft, 70% GIR', '200 yds: 60% GIR', 'From everywhere but the fairway: 62%+ GIR'] },
];

/** Approach targets from the Stats branch, as numbers the app can test against. */
export const APPROACH_TARGETS = [
  { band: '125–150', min: 125, max: 150, proxFt: 18, gir: 80 },
  { band: '150–175', min: 150, max: 175, proxFt: 22, gir: 73 },
  { band: '175–200', min: 175, max: 200, proxFt: 30, gir: 70 },
  { band: '200+', min: 200, max: 999, proxFt: null, gir: 60 },
];
export const GIR_TARGETS = { fromFairway: 75, notFairway: 62 };

export const nodeId = (branch, node) => `${branch}:${node.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;

/** YouTube / Vimeo → embeddable URL, or null if unrecognised. */
export function embedUrl(url = '') {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}
/** A direct video file (uploaded to storage) rather than an embed. */
export const isVideoFile = (url = '') => /\.(mp4|m4v|mov|webm)(\?|#|$)/i.test(url) || /\/storage\/v1\/object\/public\/videos\//.test(url);

export const videoThumb = (url = '') => { const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/); return yt ? `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg` : null; };
