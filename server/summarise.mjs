/**
 * Minimal lesson-summariser endpoint. Keeps the Anthropic key server-side.
 *
 *   ANTHROPIC_API_KEY=sk-ant-... node server/summarise.mjs
 *
 * Then in .env.local:  VITE_AI_ENDPOINT=http://localhost:8787/api/summarise
 * (vite.config.js proxies /api → 8787 in dev, so "/api/summarise" also works.)
 */
import http from 'node:http';

const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';
const PORT = process.env.PORT || 8787;

const prompt = ({ raw, blueprint, goals }) => `You are assisting a golf coach. Turn these raw lesson notes or transcript into structured output for the player's development log.
Player blueprint: ${JSON.stringify(blueprint)}
Current goals: ${JSON.stringify((goals || []).map(g => `${g.metric}: ${g.current} -> ${g.target}`))}

NOTES:
${raw}

Return ONLY JSON: {"summary": "3-5 sentence plain-English summary in UK English", "drills": ["specific drill with reps/sets", ...max 5], "priorities": ["measurable priority until next lesson", ...max 3], "focus": "3-6 word lesson title"}`;

http.createServer(async (req, res) => {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type');
  if (req.method === 'OPTIONS') return res.end();
  if (req.method !== 'POST' || !req.url.startsWith('/api/summarise')) { res.statusCode = 404; return res.end(); }
  if (!KEY) { res.statusCode = 500; return res.end('ANTHROPIC_API_KEY not set'); }
  let body = ''; for await (const c of req) body += c;
  try {
    const input = JSON.parse(body);
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 800, messages: [{ role: 'user', content: prompt(input) }] }),
    });
    const j = await r.json();
    const text = j.content?.[0]?.text || '';
    const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(json));
  } catch (e) { res.statusCode = 500; res.end(String(e)); }
}).listen(PORT, () => console.log(`summariser on http://localhost:${PORT}/api/summarise (model ${MODEL})`));
