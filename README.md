# Compass Dining Readiness: Concept B (cafeteria)

Interactive readiness quiz prototype for Compass Group India, built for a tablet in portrait mode at an event. Each answer sketches one item into an illustrated cafeteria; after the lead form, the cafeteria fills with colour based on the answers, and a slider compares it with a future-ready cafeteria.

## What it does

- 9 questions in 3 pillars, each pillar an area of the cafeteria: Nutrition (serving counter), Food Safety (kitchen), Awareness & Sustainability (dining hall)
- The scene zooms into the active area; a short "done" moment plays when an area is complete
- Answers are drawn as a blueprint sketch during the quiz, so the score stays hidden
- Each item has 3 versions (one per answer level), revealed in colour on the result; weak items stay pale, pins turn red / amber / green
- The cafeteria fills with people as questions are answered
- Role on the first screen picks the scene: K-12 dining hall or university food court
- Result: score out of 45, stage, 3 pillar cards coloured by score, top opportunities, Today vs Future-ready slider
- Lead form: name, work email, phone (required), institution (optional); seller notes after the result

## Files

- `index.html`: the whole page (scene, quiz flow, lead form, result)
- `quiz-data.js`: questions, options, scoring (A=1, B=3, C=5), pillars and stage text, shared as `window.QUIZ`

## Run locally

No build step. Serve the folder and open it in a browser:

```
python -m http.server 8000
```

## Status and drafts

Prototype. Nothing is saved or emailed yet (the backend record is printed on the result screen and in the console).

Our drafts, pending client approval: the 3 new questions (Q3, Q5, Q9) and their explanations, simplified question copy, stage ranges for 9 to 45, the "why invest in good food" points, the role list, the tool name and consent text. Branding is a placeholder until we have Compass logos and fonts.
