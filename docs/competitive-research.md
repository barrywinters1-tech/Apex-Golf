# Competitive research — rip, pivot, burn (28 Sep 2026)

Sources: web research on 12 coach-player platforms and 15 stats/practice apps. Prices are as the cited pages stated them on the day; anything marked *unverified* came from a single secondary source.

## The one thing that matters

**Upgame Golf by Trackman** is the closest product to Apex. It has shot entry on a course map, strokes gained, a coach dashboard for up to 60 athletes, practice assignments and a Trackman sync, at $9.99–29.99/month ([upgame.app](https://www.upgame.app/)). On features alone, Apex loses.

Apex's edge is that **the coach's own model is the backbone**:
- Jack's blueprint grid
- his approach-player mind map
- his 0–3 ratings
- his proximity targets

No competitor lets a coach hang data, drills and progress off *his* framework; each one imposes its own taxonomy (P-positions, Sportsbox metrics, Clippd's 0–200). Every add-on below is judged on whether it deepens that edge.

## Rip · Pivot · Burn

| Competitor | Rip (what works) | Pivot (how Apex does it differently) | Burn (weakness to exploit) |
|---|---|---|---|
| **Clippd** (£20/mo) | "What To Work On": skill ranked by score impact × room to improve × trend; mapped to drills | Room to improve = **Jack's rating** on his own nodes; drills = **Jack's blueprint drills** | Expensive; needs Arccos/Garmin or it's all manual; no Shot Scope |
| **Break X** ($19/mo) | Weekly plan from stats + available time; practice games | Plan split by the Technique / Skill / Performance modes, set by coach rating | Generic games, no coach in the loop |
| **DECADE** ($199–325/yr) | Targets from your dispersion (Driving Targets) | Game plan straight from TrackMan shot patterns, per club | No practice, no drills, no trial |
| **Shot Scope MyStrategy** | Dispersion cone + tendency shift | Same idea from range data before you ever play the hole | Needs their hardware |
| **TrackMan Combine / Test Center** | Repeatable scored test vs handicap bands | Approach test scored vs **Jack's** 18 / 22 / 30 ft targets; any monitor or manual entry | Tied to a TrackMan bay and TPS licence |
| **Pelz Scoring Game Handicap** | Monthly baseline test | Monthly approach test with history | Paper-based |
| **CoachNow** ($9.99–89.99/mo) | View tracking — coach sees the player opened it | Coach sees **minutes actually practised**, by area and mode | Glitchy video, crashes, no API |
| **Sportsbox AI** | Coach-set GOALS (numeric target ranges) | Goals exist; next step is showing them on every screen | Accuracy depends on setup; niche |
| **Onform** ($19.99–59.99/mo) | Launch-monitor data stamped on each swing video | Later: lesson video + TrackMan row on one card | Sync/Android complaints |
| **Skillest** (coach-set, 15% cut) | Subscription "access" coaching | Pro membership flag already in schema | 3-day reply lag; misread videos |
| **Arccos** (~$155–199/yr) | Smart Distance (mishits filtered) | Yardage book drops mishits < 75% of median | Billing complaints; misses chips/putts; no CSV export |
| **Mustard** ($150/yr) | Verdict → sequenced drill plan | Verdict comes from the impact laws, not AI video | Weekly upload cap; no short game |

## Ten add-ons, ranked by edge

Built = shipped on `claude/keen-mayer-tcsuw6` in this pass.

1. **What to work on** — *built*. Ranks tee / approach / short game / putting / commitment by strokes lost (or gap to target) × (0.5 + room from Jack's rating) × trend. It shows Jack's weakest nodes and any unwatched Academy lessons on them. *Edge:* Clippd's best feature, running on the coach's model at no cost.
2. **Weekly practice plan** — *built*. Two, four or six hours a week, split across the top three areas. The Technique / Skill / Performance mix is set by Jack's rating (low → Technique-heavy, owned → Performance-heavy), and Jack's own blueprint drills come first. *Edge:* no competitor ties practice mode to the coach's assessment.
3. **Practice log the coach sees** — *built*. Blocks logged against the plan, with progress per area. *Edge:* CoachNow shows that a drill was opened; this shows that it was practised.
4. **Approach test** — *built*. 9 balls at 130 / 160 / 185 yds, scored 0–100 (our formula; short misses cost 1.25×), with proximity per distance against Jack's targets and a score history. *Edge:* a Combine without the bay, measured against the coach's numbers.
5. **Approach readiness** — *built*. For each iron, how far the TrackMan pattern finishes from its own centre, against Jack's band target (e.g. 7-iron, 150–175 band, 22 ft). *Edge:* nobody else reads range data against a coach's proximity model.
6. **Yardage book + dispersion game plan** — *built*. Median carry, 10th–90th percentile window, side spread and mishits dropped; printable. The game plan gives an aim offset to centre the pattern, the % in play for a 20 / 30 / 40 yd corridor, and a safe distance from a one-sided hazard. *Edge:* DECADE's core idea, fed by data Barry already has.
7. **Commitment count** — *built (minimal)*. Mental mistakes per round (shots not 100% committed), which feeds the priority ranking. *Edge:* the Mental toughness page becomes measurable; no competitor does this.
8. **Hole-by-hole entry → computed strokes gained** — *next*. Start and end distance and lie per shot, with SG from a baseline table. Removes the dependency on Arccos for SG. *Risk:* baseline data licensing (Broadie's tables are published in *Every Shot Counts*; use approximations and label them).
9. **Round import from Arccos / Shot Scope** — *later*. Neither has an official export; community tools produce JSON/CSV (`skhavari/arccos-export`, `ShotScopeConnector`). Unofficial and fragile, so do it only once real files exist.
10. **Coach target ranges everywhere + lesson video with numbers** — *later*. Jack sets ranges (smash ≥ 1.45, path −2…+2, 7-iron proximity ≤ 22 ft) once, and every screen colours against them. Lesson videos carry the TrackMan row from that day (Onform's idea). Needs the storage / signed-URL step first.

## What to stop or de-prioritise

- **The Radar vs D1** rests on approximate benchmarks. It's fine as a teaser, but don't let it steer practice; the priority engine should.
- **Eight tabs** is the limit on a phone. The next feature folds into an existing tab.
- **More features before real data.** Rounds are still example rows. Priorities 1, 2 and 7 only become true once Barry logs real rounds with strokes gained, and 3–5 once he logs practice and takes the test. That, and Jack actually opening the app, is the harder and more valuable work.

## Unknowns

- Clippd's actual ranking algorithm (not published).
- Circles Golf features (their page was down).
- Whether Upgame's coach tier lets a coach define his own framework. Worth a trial before claiming the edge publicly.
