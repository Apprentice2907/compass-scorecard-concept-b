# Nutrition Readiness Score: how the emailed report is made

Last updated: 19 November 2026 · Owner: Suhani (Kami Labs)

## 1. Where things stand today

| Part | Status |
|---|---|
| Sample report (Greenwood International School, 27/45, Developing) | **Built.** Written by hand as HTML, printed to a 4-page PDF and deployed |
| Report generated for each person who takes the quiz | **Not built yet** |
| Email sent to the respondent with the report | **Not built yet.** Needs the client's sending domain |
| Lead data saved (CSV / database) | **Not built yet.** The quiz builds the record but only logs it in the browser console |

The quiz screen says the report is on its way, but today nothing is generated or sent. The only report that exists is
the sample one below. Section 4 is the plan for automating it. That plan waits on Purusharth's report-generation
recommendation and the client's sending domain.

Live sample:
- HTML: https://chartwells-dining-readiness.vercel.app/report/sample-report.html
- PDF: https://chartwells-dining-readiness.vercel.app/report/Chartwells-Sample-Scorecard.pdf

---

## 2. Files

All paths are under `kami-labs\projects\compass-group\`.

| File | What it is |
|---|---|
| `concept-b\report\sample-report.html` | The report: 4 A4 pages, static HTML, no scripts. Chartwells look built in |
| `concept-b\report\img\cafeteria-today.png` / `cafeteria-future.png` | Cafeteria pictures on page 1 and page 3 (952 × 521) |
| `concept-b\report\Chartwells-Sample-Scorecard.pdf` | The printed PDF |
| `concept-b\quiz-data.js` | Questions, scores, stages, area bands and the answer texts the report reuses |
| `concept-b\build_chartwells.py` | Copies the quiz and report into the Chartwells deploy folder |
| `chartwells-dining-readiness\` | Deploy folder for the report (Vercel project `chartwells-dining-readiness`) |
| `Report-Copy-Guardrails.md` | Copy rules every report must follow |

## 3. How the sample report is made (current process)

### Step 1: Write the content

Edit `concept-b\report\sample-report.html` directly. Each page is a `<section class="page">`.

| Page | Content | Where the content comes from |
|---|---|---|
| 1 | Score, stage, 3 area cards, strongest area, quickest win, cafeteria today | Total and stage: `Q.total`, `Q.stage`. Area scores: `Q.pillarScore`. Labels: Strong / Building well / Room to grow |
| 2 | What each of the 9 answers tells us | The `insight` text of each picked answer in `quiz-data.js` |
| 3 | Game plan and what reaching the next stages means | Next-stage steps (same logic as `route()` in `index.html`) plus the stage descriptions |
| 4 | Benefits for the institution and the leader, why it matters, next step with Chartwells | Fixed copy. The stats are sourced to *Nourishing India's Next Generation, a Compass Group India school food study, 2026* |

Copy rules (full list in `Report-Copy-Guardrails.md`):
- no em dashes or exclamation marks
- never "vendor"
- no health or academic outcome promises
- every stat has a source
- positive consultant tone: say what works first, then the next step

### Step 2: Capture the cafeteria pictures

The pictures are screenshots of the quiz's own cafeteria scene. Each one is taken after playing the quiz through with
the sample answers.

1. Serve the quiz locally from `concept-b\`:
   ```bash
   python -m http.server 8766 --bind 127.0.0.1
   ```
2. Open `http://127.0.0.1:8766/?brand=chartwells` in Playwright (the Chartwells palette). Since 20 Nov, Jojo, the Compass mascot, appears in both versions, so new captures will include her. The current sample images were taken before that change.
3. Pick the sample institution and role, then answer the 9 questions with the sample answers.
4. Fill the details form with test data and submit.
5. Hide the YOU tag, then screenshot the `#stageBox` element to `report\img\cafeteria-today.png`.
6. Move the slider fully to Future-Ready, hide the slider chrome, then screenshot `#stageBox` to
   `report\img\cafeteria-future.png`.

Playwright snippet used (runs after the form is submitted):
```js
await page.addStyleTag({ content: '.p3-you{display:none!important}' });
const box = await page.$('#stageBox');
await box.screenshot({ path: 'report/img/cafeteria-today.png' });
await page.waitForTimeout(2500);
await page.evaluate(() => { const r = document.getElementById('cmpRange'); r.value = 0; r.dispatchEvent(new Event('input')); });
await page.addStyleTag({ content: '.divider,.cmp-label{display:none!important}' });
await page.waitForTimeout(1500);
await box.screenshot({ path: 'report/img/cafeteria-future.png' });
```
Wait about 2.3 s after each answer click so the scene finishes animating before the next action.

### Step 3: Print the PDF

Use headless Chrome. **Always give an absolute Windows path.** With a relative path, Chrome silently writes nothing.
```bash
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="C:\Users\sharm\Downloads\work-setup\kami-labs\projects\compass-group\concept-b\report\Chartwells-Sample-Scorecard.pdf" "file:///C:/Users/sharm/Downloads/work-setup/kami-labs/projects/compass-group/concept-b/report/sample-report.html"
```
Check the output says `bytes written`, then check the page count is 4:
```bash
python -c "import pymupdf; print(len(pymupdf.open(r'concept-b/report/Chartwells-Sample-Scorecard.pdf')))"
```
Open the PDF and look at every page. Watch for text cut off at the bottom of page 1 and page 4.

### Step 4: Copy into the deploy folder

1. Print the PDF a second time into the deploy folder (same command, output
   `...\chartwells-dining-readiness\report\Chartwells-Sample-Scorecard.pdf`). The build script reads it from there to
   make the blurred report preview on the quiz landing page.
2. Run the build:
   ```bash
   python concept-b/build_chartwells.py concept-b chartwells-dining-readiness
   ```
   The build:
   - copies `sample-report.html` and `report\img\`
   - regenerates `img\report-peek-1..3.jpg` from the PDF
   - forces the Chartwells theme on the quiz

   Print the PDF before running the build. The build overwrites `img\`.

### Step 5: Deploy (only when Suhani says so)

```bash
cd chartwells-dining-readiness
vercel --prod --yes
```
Smoke test afterwards. The report HTML and the PDF should return 200, and `.env.local` must return 404.

---

## 4. Plan: a report for every respondent (not built)

When someone submits the details form, the quiz already builds this record (`Q.record()` in `quiz-data.js`):

```json
{
  "submittedAt": "ISO date",
  "lead": { "name": "", "email": "", "phone": "", "institution": "", "role": "" },
  "answers": [ { "pillar": "", "area": "", "option": "A|B|C", "score": 1, "explanation": "" } ],
  "pillars": [ { "name": "Nutrition", "score": 11, "band": "..." } ],
  "total": 27,
  "stage": "Developing Stage"
}
```

Proposed flow, to confirm with Purusharth:

1. **Send.** On submit, the quiz POSTs the record to a serverless function on the same Vercel project.
2. **Save.** The function stores the lead (CSV export or a small database). The consent tick is stored with it.
3. **Fill the template.** `sample-report.html` becomes a template. The Greenwood values are replaced with the record's:
   - institution
   - total and stage
   - area scores and labels
   - the 9 answer insights
   - next-stage steps
4. **Pictures.** One of two options:
   - render the two cafeteria images server-side from the same answers
   - capture them in the browser from the scene and send them with the record
5. **PDF.** Print the filled template with headless Chromium (the same engine as Step 3).
6. **Email.** Send it from the client's own domain through an email provider, with the PDF attached and the score in
   the email body.

**Full score rule (Prinkit, 23 Nov).** A guest who scores 45 / 45 still gets a next step with Chartwells. Page 3 swaps the game plan for a short "Keep it future-ready" section: Chartwells can help maintain the score with yearly reviews, fresh menus and regular food safety audits. Page 4 keeps the next step with Chartwells. A guest at Future-Ready but below 45 gets the steps to 45 / 45.

Open decisions:
- report generation approach (Purusharth)
- client sending domain and email provider
- where lead data lives and who can export it
- consent wording (Compass legal)

## 5. Known gotchas

- Relative `--print-to-pdf` paths write nothing. Use absolute Windows paths.
- Arial at weight 800 renders as Arial Black in Chrome. The report maps weights 550+ to Arial Bold through the
  `Brand Arial` `@font-face`.
- After a quiz change, bump the `?v=` on `cafe3d.js` / `quiz-data.js`, or browsers serve the old file.
- Rebuilding the Chartwells copy overwrites `img\`. Print the PDF first, then build.
- The quiz score screen still shows "In progress / Needs attention". The report uses "Building well / Room to grow".
  Keep the report wording.
