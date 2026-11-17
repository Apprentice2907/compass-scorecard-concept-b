# Compass Scorecard: Concept B (cafeteria)

Interactive readiness quiz prototype for Compass Group India. Each answer builds one zone of an illustrated cafeteria, and the result shows each zone's level, the total score and the readiness stage.

Live demo: https://compass-scorecard-concepts.vercel.app/canteen.html

## Files

- `index.html`: the whole page (illustration, quiz flow, lead form, result)
- `quiz-data.js`: questions, options, scoring (A=1, B=3, C=5) and stage text, shared as `window.QUIZ`

## Run locally

No build step. Open `index.html` in a browser, or serve the folder:

```
python -m http.server 8000
```

## Status

Prototype. Still uses the original 6 questions; the 17 Nov changes (9 questions in 3 pillars, Compass branding, institution wording) are not applied yet. Nothing typed into the form is saved.
