# Note for Prince: Nutrition Readiness Score

From Suhani, 20 Nov 2026. This note covers what the tool is, where it lives, how the emailed report is made today,
and the rules Claude follows when writing report copy.

## 1. What it is

An event quiz for Compass Group India / Chartwells. The guest answers 9 questions about their institution's
cafeteria, watches a 3D cafeteria build up as they answer, and gets a score out of 45 with a stage. The plan is to
email them a 4-page report afterwards.

| Link | What |
|---|---|
| https://compass-dining-readiness.vercel.app | Compass colours |
| https://chartwells-dining-readiness.vercel.app | Chartwells colours (same tool, built by `build_chartwells.py`) |
| https://chartwells-dining-readiness.vercel.app/report/sample-report.html | Sample report (HTML) |
| https://chartwells-dining-readiness.vercel.app/report/Chartwells-Sample-Scorecard.pdf | Sample report (PDF) |

## 2. Flow on screen

1. **Meet Jojo.** Jojo, the Compass mascot, introduces the quiz.
2. **Landing.** The guest gives their institution and role (5 K-12 roles, 5 higher education roles, Other).
3. **9 questions.** There are 3 areas: Nutrition, Food Safety, and Awareness & Sustainability.
4. **Loader.** The scoring loader runs for 5 seconds.
5. **Details form.** Name, email, phone and consent.
6. **Result.** Score and stage, the 3 area cards, Jojo beside the score, and a Today vs Future-ready slider.

Built for a vertical 1080 x 1920 event screen. It also works on a laptop, a tablet and a phone.

## 3. Files

| File | What it is |
|---|---|
| `index.html` | The whole quiz: flow, layout, Jojo's lines, roles, results |
| `quiz-data.js` | Questions, options, scoring, stages, area bands, answer insights, `Q.record()` |
| `cafe3d.js` | The 3D cafeteria (three.js r128), including the Jojo figure |
| `report/sample-report.html` | The 4-page report, static HTML |
| `report/question-variants.html` | Question wording variants (internal) |
| `build_chartwells.py` | Copies the quiz and report into the Chartwells deploy folder |
| `docs/Report-Generation-How-To.md` | Full step-by-step for the report (read this first) |
| `docs/Report-Copy-Guardrails.md` | Full copy rules for every report line |
| `docs/Nutrition-Readiness-Score-SME-Review.pdf` / `.docx` | Questions, scoring and results, sent to Prinkit for SME review |

Run it locally with no build step:
```
python -m http.server 8766 --bind 127.0.0.1
```
Then open http://127.0.0.1:8766 (Compass) or http://127.0.0.1:8766/?brand=chartwells (Chartwells).

## 4. Scoring in one minute

- Each answer is A = 1, B = 3 or C = 5. There are 9 questions, so the total runs from 9 to 45.
- Each area has 3 questions and a score out of 15.
  - 13 to 15 is Strong.
  - 9 to 11 is Building well.
  - 3 to 7 is Room to grow.
- The total gives the stage:

| Total | Stage |
|---|---|
| 9 to 15 | Foundation |
| 16 to 22 | Emerging |
| 23 to 30 | Developing |
| 31 to 38 | Advanced |
| 39 to 45 | Future-Ready |

- When the guest submits the details form, `Q.record()` builds a JSON record: the lead, the 9 answers, the area scores,
  the total and the stage. Today the record is only logged in the browser console. It is not saved or sent anywhere.

## 5. How the report is made today

The report is **not generated per guest yet**. Only the sample report (Greenwood International School, 27/45,
Developing) exists, and it was made by hand:

1. **Write the content.** Edit `report/sample-report.html`. The sources for each part are:
   - Score and stage: the scoring.
   - Page 2: the `insight` text of each picked answer in `quiz-data.js`.
   - Game plan: the same logic as `route()` in `index.html`.
   - Page 4: fixed copy with sourced stats.
2. **Capture the pictures.** Play the quiz locally with the sample answers. Playwright then screenshots the cafeteria
   (`#stageBox`) twice:
   - with the slider at Today, saved to `cafeteria-today.png`
   - with the slider at Future-ready, saved to `cafeteria-future.png`
3. **Print.** Print the PDF with headless Chrome. Use an absolute Windows path, or Chrome writes nothing. Check there
   are 4 pages.
4. **Build.** Run `build_chartwells.py` to copy everything into the Chartwells deploy folder. Print the PDF first,
   because the build overwrites `img/`.
5. **Deploy.** Run `vercel --prod --yes`, only when asked. Then smoke test: the pages return 200 and `.env.local`
   returns 404.

Exact commands and the Playwright snippet are in `docs/Report-Generation-How-To.md`.

**Planned per-guest flow (not built, waiting on Purusharth's recommendation and the client's email domain):**

1. On submit, the quiz POSTs the record to a serverless function.
2. The function saves the lead and the consent.
3. It fills `sample-report.html` as a template.
4. It prints the PDF with headless Chromium.
5. It emails the PDF from the client's own domain.

## 6. Claude instructions (how the report copy is written)

When Claude writes or edits any report line, it follows `docs/Report-Copy-Guardrails.md`. The short version:

- **Reader.** A busy Principal, VC, Dean, Trustee or dining head. Say "you" and "your institution".
- **Sentences.** Short, about 20 words at most.
- **Tone.** Positive consultant: what works first, then the next step. Never shame a low score, and never point out a
  gap without a step to close it.
- **Format.**
  - No em dashes.
  - No exclamation marks.
  - Sentence-case headings.
  - Indian English.
  - Numerals for numbers.
- **Words.**
  - Say "institution", not "school", "client" or "customer".
  - Never say "vendor".
  - No AI filler (delve, seamless, holistic, leverage, unlock, transform, game-changer).
- **Claims.**
  - Every stat names its source on the same page: *Nourishing India's Next Generation, a Compass Group India school
    food study, 2026*.
  - Never word a stat more strongly than the source does.
  - No health, safety or academic outcome promises (no "allergen-free", "100% safe", "improves grades").
  - No prices or timelines.
- **Score maths must add up.**
  - Area scores are out of 15 and the total is out of 45.
  - The "+X to next stage" figure matches the game plan.
- **Game plan.** Steps come only from the guest's answers, written as a verb plus an object. Chartwells is described
  as support, never as pressure.
- **Brand.**
  - Write "Chartwells" and "Compass Group India".
  - The Chartwells logo goes on the left and the Compass logo on the right.
  - Use only the approved contact details.

A prompt that works for a new report:

> Using `quiz-data.js` and this answer record, fill `report/sample-report.html` for [institution]. Take each page 2 line
> from the picked answer's `insight`, and build the game plan with the same logic as `route()` in `index.html`. Follow
> every rule in `docs/Report-Copy-Guardrails.md`. Check that the score maths adds up, then print the PDF and confirm
> there are 4 pages.

## 7. Open items

- SME sign-off on the questions, scoring and Jojo's tips. The SME doc still says "Lisa"; the mascot is now Jojo.
- Mascot name confirmed as Jojo by Dipanshu Roy (Compass), 20 Nov.
- Consent wording from Compass legal.
- The client's sending domain and email provider, and where lead data is stored.
- The score screen says "In progress / Needs attention" but the report says "Building well / Room to grow". This is
  not aligned yet; keep the report wording.
- Edge case: a total of 31 made of 7 B + 2 C answers needs 8 points to reach the next stage, but the 3 suggested steps
  only give 6. This is not fixed.
- The sample report pictures were captured before Jojo was added to the scene.
