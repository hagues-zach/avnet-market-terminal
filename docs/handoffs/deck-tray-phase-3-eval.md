# Add to deck, Phase 3: live eval runs

`scripts/deck-commentary-eval.ts --live`, with the key from `.env.local` (`env -u ANTHROPIC_API_KEY -u ANTHROPIC_AUTH_TOKEN npx tsx --env-file=.env.local …`). One real call per deck, model `claude-sonnet-5-5`. Each run is a single sample per deck, so small differences are noise.

Columns: Filler = bullets with no figure and no word from the slide's labels. Note words = the median words per note (each note's count is in the details). Notes off = slides whose notes all failed grounding. Sent. off = note sentences grounding dropped.

The storyline's "Pass" uses the criterion fixed after run 1: the market slide (the TAM funnel) comes before every slide of Avnet's own detail. Run 1 printed FAIL under the first criterion, which also counted the distributor ranking as "market"; under the fixed criterion its order passes (TAM first, Avnet's share second, then the ranking).

## Run 1: baseline (2026-11-26), after Milestone 2, before the filler prompt change

```
Live run

Deck                             Status Slides Dropped Med words Long Empty Filler Note words Notes off Sent. off  Cost
TAM funnel                       ok        1/1       0        11    0     0      0        118         0         0  $0.010
Ranked bar chart                 ok        1/1       0        15    1     0      1        102         0         0  $0.010
Growth against margin scatter    ok        1/1       0        12    0     0      1        138         0         0  $0.013
News story                       ok        1/1       0        15    1     0      0        105         0         0  $0.010
Mixed six-slide deck             ok        6/6       0        12    0     0      0         92         0         0  $0.030

TAM funnel  note words: 118
Ranked bar chart  long headline: card:earnings-leaderboard-distributors: Avnet ranks third among distributors, behind Arrow and WPG Holdings, with a close pack behind
Ranked bar chart  filler: card:earnings-leaderboard-distributors: Scale matters to suppliers weighing where to concentrate channel investment.
Ranked bar chart  note words: 102
Growth against margin scatter  filler: card:earnings-growth-against-margin-semis: Source is SEC filings, GAAP as reported; 2 companies are off the scale.
Growth against margin scatter  note words: 138
News story  long headline: card:news-story-microchip-lead-times: Microchip says MCU lead times are back to 12 weeks, easing supply for industrial buyers
News story  note words: 105
Mixed six-slide deck  note words: 96, 95, 84, 83, 92, 86

Storyline                                Status Expect  Moved Reasons Sections Dropped  Pass  Cost
Storyline: detail before the market      ok     reorder     4       4        2       0  FAIL  $0.010
Storyline: already in a good order       ok     keep        2       2        1       0  pass  $0.009

Storyline: detail before the market  order: card:tam-opportunity > view:share > card:earnings-leaderboard-distributors > chart:avnet-vs-arrow-scorecard:gross-margin:trend > card:news-story-microchip-lead-times
Storyline: detail before the market  sections: Market and Avnet's place in it | Avnet against Arrow and peers
Storyline: already in a good order  order: card:tam-opportunity > card:earnings-growth-against-margin-semis > card:earnings-leaderboard-distributors > chart:avnet-vs-arrow-scorecard:gross-margin:trend > card:news-story-microchip-lead-times
Storyline: already in a good order  sections: Avnet against Arrow

Total: $0.091
```

## Run 2: after the filler prompt change (2026-11-26)

The prompt change: each bullet states something the slide shows or a specific consequence, and names the row, series, company or figure; no generic advice; no describing the source or the chart; call each row what the slide calls it and keep kinds apart (a company beside regions is a company); headlines "at most 14 words (count them)"; notes "never more than 120".

```
Live run

Deck                             Status Slides Dropped Med words Long Empty Filler Note words Notes off Sent. off  Cost
TAM funnel                       ok        1/1       1        13    0     0      0         95         0         1  $0.011
Ranked bar chart                 ok        1/1       0        14    0     0      0        111         0         0  $0.011
Growth against margin scatter    ok        1/1       0        13    0     1      1        110         0         0  $0.010
News story                       ok        1/1       0        15    1     0      0        114         0         0  $0.010
Mixed six-slide deck             ok        6/6       0        12    0     0      0         94         0         0  $0.032

TAM funnel  dropped: card:tam-opportunity notes: Expect the question of where we can grow inside the 91.1 percent we do not bill; the next slides should take that up. [91.1]
TAM funnel  note words: 95
Ranked bar chart  note words: 111
Growth against margin scatter  empty: summary: 2 lines
Growth against margin scatter  filler: card:earnings-growth-against-margin-semis: Two companies are off the scale, so the chart does not show them.
Growth against margin scatter  note words: 110
News story  long headline: card:news-story-microchip-lead-times: Microchip says MCU lead times are back to 12 weeks, easing supply for industrial buyers
News story  note words: 114
Mixed six-slide deck  note words: 96, 88, 94, 94, 94, 97

Storyline                                Status Expect  Moved Reasons Sections Dropped  Pass  Cost
Storyline: detail before the market      ok     reorder     4       4        2       0  pass  $0.007
Storyline: already in a good order       ok     keep        2       2        1       0  pass  $0.006

Storyline: detail before the market  order: card:tam-opportunity > view:share > card:earnings-leaderboard-distributors > chart:avnet-vs-arrow-scorecard:gross-margin:trend > card:news-story-microchip-lead-times
Storyline: detail before the market  sections: Market and Avnet's place in it | Distributor competition
Storyline: already in a good order  order: card:tam-opportunity > card:earnings-growth-against-margin-semis > card:earnings-leaderboard-distributors > chart:avnet-vs-arrow-scorecard:gross-margin:trend > card:news-story-microchip-lead-times
Storyline: already in a good order  sections: Avnet against Arrow

Total: $0.086
```

## Run 3: final (2026-11-26), after the Milestone 3 review

Changes since run 2: the filler check was tightened (milestone 3 review: "Avnet", function words and years no longer count against filler), the Internal audience's next steps must name what they follow from, the prompt is part of the cache key, the output budget is not yet scaled (that change came after this run, prompted by it), and the eval reports note words as Claude wrote them.

```
Deck commentary: Claude call failed. Failed to parse structured output: Error: Failed to parse structured output as JSON: Unterminated string in JSON at position 16717 (line 1 column 16718)
Live run

Deck                             Status Slides Dropped Med words Long Empty Filler Note words Notes off Sent. off  Cost
TAM funnel                       failed    0/1       0         0    0     2      0          0         0         0  $0.000
Ranked bar chart                 ok        1/1       0        14    0     1      0        101         0         0  $0.012
Growth against margin scatter    ok        1/1       0        13    0     1      1        109         0         0  $0.010
News story                       ok        1/1       0        15    1     0      0        110         0         0  $0.010
Mixed six-slide deck             ok        6/6       0        12    0     0      0         90         0         0  $0.032

TAM funnel  message: Claude's commentary came back incomplete. Try again.
TAM funnel  empty: card:tam-opportunity: no commentary
TAM funnel  empty: summary: 0 lines
Ranked bar chart  empty: summary: 2 lines
Ranked bar chart  note words: 101
Ranked bar chart  note words as written: 101
Growth against margin scatter  empty: summary: 2 lines
Growth against margin scatter  filler: card:earnings-growth-against-margin-semis: Two companies are off the scale, so the medians describe a wider spread.
Growth against margin scatter  note words: 109
Growth against margin scatter  note words as written: 109
News story  long headline: card:news-story-microchip-lead-times: Microchip says MCU lead times are back to 12 weeks, easing supply for industrial buyers
News story  note words: 110
News story  note words as written: 110
Mixed six-slide deck  note words: 91, 90, 96, 83, 83, 84
Mixed six-slide deck  note words as written: 91, 90, 96, 83, 83, 84

Storyline                                Status Expect  Moved Reasons Sections Dropped  Pass  Cost
Storyline: detail before the market      ok     reorder     4       4        2       0  pass  $0.010
Storyline: already in a good order       ok     keep        2       2        1       0  pass  $0.009

Storyline: detail before the market  order: card:tam-opportunity > view:share > card:earnings-leaderboard-distributors > chart:avnet-vs-arrow-scorecard:gross-margin:trend > card:news-story-microchip-lead-times
Storyline: detail before the market  sections: Market and Avnet's place in it | Avnet against Arrow and peers
Storyline: already in a good order  order: card:tam-opportunity > card:earnings-growth-against-margin-semis > card:earnings-leaderboard-distributors > chart:avnet-vs-arrow-scorecard:gross-margin:trend > card:news-story-microchip-lead-times
Storyline: already in a good order  sections: Avnet against Arrow

Total: $0.083
```

The TAM funnel deck failed in run 3: Claude's answer stopped mid-string 16,717 characters in, which for one slide means a runaway string that ran to the 16,000-token limit. The SDK threw before reporting usage, so its cost (at most about $0.16) is not in the $0.083 total. The page shows "Claude's commentary came back incomplete. Try again." After this run, the output budget scales with the deck (1,500 plus 900 tokens a slide; real answers used 550 to 760 tokens for one slide and 2,356 for six), so a runaway stops after about 2,400 tokens on a one-slide deck. That change has not run live.

## Run 4 (2026-11-26), after the number-word check covered everything

Run at your request, past the brief's limit of three. Changes since run 3: the number-word check runs on every piece Claude writes, both prompts say quantities in words count as figures, and the output budget scales with the deck. Raw answers: `deck-tray-phase-3-eval-run4.json`.

```
Live run

Deck                             Status Slides Dropped Med words Long Empty Filler Note words Notes off Sent. off  Cost
TAM funnel                       ok        1/1       0        13    0     0      0        100         0         0  $0.011
Ranked bar chart                 ok        1/1       0        14    0     0      0        104         0         0  $0.010
Growth against margin scatter    ok        1/1       0        16    1     1      1        110         0         0  $0.010
News story                       ok        1/1       1        15    1     0      0        160         0         1  $0.013
Mixed six-slide deck             ok        6/6       0        12    0     0      0         80         0         0  $0.031

TAM funnel  note words: 100
TAM funnel  note words as written: 100
Ranked bar chart  note words: 104
Ranked bar chart  note words as written: 104
Growth against margin scatter  long headline: card:earnings-growth-against-margin-semis: Avnet trails semiconductor medians on both growth and operating margin, and Arrow sits ahead of it
Growth against margin scatter  empty: summary: 0 lines
Growth against margin scatter  filler: card:earnings-growth-against-margin-semis: 2 companies are off the scale, so the medians sit among a wider spread.
Growth against margin scatter  note words: 110
Growth against margin scatter  note words as written: 110
News story  dropped: card:news-story-microchip-lead-times notes: Last. [over the notes' length limit]
News story  long headline: card:news-story-microchip-lead-times: Microchip says MCU lead times are down to 12 weeks, easing supply for industrial buyers
News story  note words: 160
News story  note words as written: 185
Mixed six-slide deck  note words: 84, 68, 85, 76, 78, 80
Mixed six-slide deck  note words as written: 84, 68, 85, 76, 78, 80

Storyline                                Status Expect  Moved Reasons Sections Dropped  Pass  Cost
Storyline: detail before the market      ok     reorder     4       4        2       0  pass  $0.010
Storyline: already in a good order       ok     keep        2       2        1       0  pass  $0.009

Storyline: detail before the market  order: card:tam-opportunity > view:share > card:earnings-leaderboard-distributors > chart:avnet-vs-arrow-scorecard:gross-margin:trend > card:news-story-microchip-lead-times
Storyline: detail before the market  sections: Market and Avnet's place in it | Avnet against Arrow and peers
Storyline: already in a good order  order: card:tam-opportunity > card:earnings-growth-against-margin-semis > card:earnings-leaderboard-distributors > chart:avnet-vs-arrow-scorecard:gross-margin:trend > card:news-story-microchip-lead-times
Storyline: already in a good order  sections: Avnet against Arrow

Total: $0.095
```

What it shows:

- **The number-word check dropped nothing.** With the prompt line, Claude wrote no quantity in words on any slide, so the wider check cost no headlines or bullets in this run.
- **No deck failed.** The one-slide decks that ran away in run 3 finished, within the scaled budget.
- **A runaway tail in the news story's notes.** The notes as written are 185 words: about 120 good ones, then "ABC.XYZ.QQ. ok. Done. OK. Enough. … Thanks. Thanks. Thanks.". The 160-word cap cut it short, but the shipped notes would still have carried the start of the junk. Fixed after this run: `groundNotes` now stops at the first fragment (under three words) or repeated sentence and drops everything after it. Re-scored offline on this run's saved answer, the notes keep the 128 good words and lose the tail.
- **The scatter deck's summary came back empty from Claude**, not from grounding: an empty list for a one-slide deck. The same weakness made two-line summaries on one-slide decks in earlier runs. Not fixed; see the report.
- Filler 1 (the scatter's "off the scale" line again) and two long headlines (15 and 16 words): the same as before, within noise.

## Before and after, read with care

Each number is one sample per deck, on about 25 bullets and 10 notes, so differences of one are within noise. The filler check changed between runs 2 and 3, so run 3's filler count isn't comparable with runs 1 and 2, and runs 1 and 2 can't be re-scored (their raw answers weren't saved; run 3's are, with `--save`).

| | Run 1 (baseline) | Run 2 (after the prompt change) | Run 3 (final) |
|---|---|---|---|
| Filler bullets, all decks | 2 | 1 | 1 (stricter check) |
| Long headlines (over 14 words) | 2 | 1 | 1 |
| Decks with an empty section (a two-line summary on one-slide decks) | 0 | 1 | 2, plus the failed deck |
| Notes over 120 words | 1 (138) | 0 (most 114) | 0 (most 110) |
| Note sentences dropped by grounding | 0 | 1 ("91.1 percent", worked out from 8.9%) | 0 |
| Decks that failed | 0 | 0 | 1 (TAM funnel, runaway answer) |
| Storyline decks passing | 2 of 2, re-scored under the narrowed criterion | 2 of 2 | 2 of 2 |
| Reported cost | $0.091 | $0.086 | $0.083 (plus up to $0.16 unreported) |

Run 4 (after the table above was written): filler 1, long headlines 2, notes over 120 words 1 as written (a runaway tail, now cut), number-word drops 0, failed decks 0, storyline 2 of 2, $0.095.

What it says:

- The clearest change is note length: one note over 120 words before the prompt said "never more than 120", none after.
- Filler and long headlines fell by one each, which is within noise.
- The new "don't describe the source or how the chart is drawn" rule failed once in each later run: "Two companies are off the scale…" on the scatter, a line about how the chart is drawn.
- The news headline is 15 words, word for word the same in all three runs, despite "(count them)".
- The storyline prompt didn't change in Milestone 3, and all three runs returned the same order for the reordering deck. Its rows aren't evidence for the prompt change.
- The two-line summaries on one-slide decks are the eval's "at least three lines" rule meeting a one-slide deck, as in Phase 2.

The fixtures don't include the Performance Tracker's region slide where the first live run listed Farnell beside the regions, so that rule is in the prompt but not measured here.
