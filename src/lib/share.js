/** Share the whole dataset as a link: gzip → base64url in the URL hash. No server involved. */
const enc = new TextEncoder(), dec = new TextDecoder();
const b64u = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
async function pipe(bytes, Stream) { const r = new Blob([bytes]).stream().pipeThrough(new Stream('gzip')); return new Uint8Array(await new Response(r).arrayBuffer()); }

export async function encodeShare(data) {
  const gz = await pipe(enc.encode(JSON.stringify(data)), CompressionStream);
  return `${location.origin}${location.pathname}#share=${b64u(gz)}`;
}
export async function decodeShare(hash = location.hash) {
  const m = hash.match(/#share=([A-Za-z0-9_-]+)/); if (!m) return null;
  const raw = await pipe(unb64u(m[1]), DecompressionStream);
  return JSON.parse(dec.decode(raw));
}
