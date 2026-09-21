/**
 * Lesson summariser. The browser must not hold an Anthropic API key, so this
 * posts to a small server endpoint you control (see server/ in README).
 * Set VITE_AI_ENDPOINT=/api/summarise (or a full URL) in .env.local.
 */
import { KNOWLEDGE_SUMMARY } from './knowledge.js';

export const aiConfigured = () => Boolean(import.meta.env.VITE_AI_ENDPOINT);

export async function summariseLesson({ raw, blueprint, goals }) {
  const url = import.meta.env.VITE_AI_ENDPOINT;
  if (!url) throw new Error('AI endpoint not configured (VITE_AI_ENDPOINT)');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ raw, blueprint, goals, frame: KNOWLEDGE_SUMMARY }),
  });
  if (!res.ok) throw new Error(`Summariser returned ${res.status}`);
  return res.json(); // { summary, drills: [], priorities: [], focus }
}

export const SUMMARISE_PROMPT = ({ raw, blueprint, goals }) => `${KNOWLEDGE_SUMMARY}\n\nYou are assisting a golf coach. Turn these raw lesson notes or transcript into structured output for the player's development log.
Player blueprint: ${JSON.stringify(blueprint)}
Current goals: ${JSON.stringify((goals || []).map(g => `${g.metric}: ${g.current} -> ${g.target}`))}

NOTES:
${raw}

Return ONLY JSON: {"summary": "3-5 sentence plain-English summary in UK English", "drills": ["specific drill with reps/sets", ...max 5], "priorities": ["measurable priority until next lesson", ...max 3], "focus": "3-6 word lesson title"}`;
