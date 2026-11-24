/* Nutrition Readiness Report: the rules.
   Pure function, no DOM: (quiz data, report content, 9 answer keys, lead) -> everything the report shows.
   Used by report.html in the browser and by the server that prints the PDF. */
window.buildReport = function (Q, C, keys, lead) {
  if (!Array.isArray(keys) || keys.length !== 9 || keys.some((k, i) => !Q.opt(i, k))) throw new Error('Need 9 answers (A, B or C)');
  const PID = ['nutrition', 'safety', 'awareness'];
  const clean = t => String(t || '').replace(/^DRAFT:\s*/, '');
  const lv = keys.map((k, i) => Q.opt(i, k).score);           // 1, 3 or 5 per question
  const total = lv.reduce((a, b) => a + b, 0);                 // 9-45, always odd
  const stage = Q.stage(total), si = Q.stageIndex(total);
  const band = s => (s >= 13 ? { id: 'strong', word: 'Strong' } : s >= 9 ? { id: 'mid', word: 'Building well' } : { id: 'low', word: 'Room to grow' });
  const level = p => (p === 5 ? { id: 'strong', cls: 'l5', word: 'Strong' } : p === 3 ? { id: 'mid', cls: 'l3', word: 'Building well' } : { id: 'low', cls: 'l1', word: 'Room to grow' });
  // totals are always odd, so show each stage's range as reachable odd scores (16-22 shows as 17-21)
  const odd = (a, b) => [a % 2 ? a : a + 1, b % 2 ? b : b - 1];
  const stages = Q.stages.map(s => { const [a, b] = odd(s.min, s.max); return Object.assign({}, s, { lo: a, hi: b, short: s.name.replace(' Stage', '') }); });

  const answers = keys.map((k, i) => {
    const o = Q.opt(i, k), q = Q.questions[i];
    return { i, pillar: q.pillar, area: q.area, short: q.short, question: q.text, answer: o.headline, points: lv[i], level: level(lv[i]),
      insight: clean(o.insight || o.explanation), meaning: clean(o.explanation), phrase: q.phrase };
  });

  const areas = Q.pillars.map((p, n) => {
    const l = p.q.map(i => lv[i]);
    const score = l.reduce((a, b) => a + b, 0);
    const block = C.blocks[PID[n] + ':' + l.join('-')];
    if (!block) throw new Error('Missing content block ' + PID[n] + ':' + l.join('-'));
    return { n, id: PID[n], name: p.name, place: p.place, score, band: band(score), block, answers: p.q.map(i => answers[i]) };
  });

  // game plan: every answer below Strong becomes a step; biggest gain first, ties broken by priority (safety first)
  const steps = lv.map((p, i) => ({ p, i })).filter(x => x.p < 5).map(({ p, i }) => {
    const s = C.steps[String(i + 1)];
    return { i, pillar: Q.questions[i].pillar, tag: s.tag, priority: s.priority, title: s[String(p)][0], text: s[String(p)][1], gain: 5 - p, phrase: Q.questions[i].phrase };
  }).sort((a, b) => b.gain - a.gain || a.priority - b.priority);
  let run = total;
  steps.forEach((s, k) => {
    s.when = k < 2 ? 'Next 30 days' : k < 5 ? 'This term' : 'This year';
    run += s.gain; s.scoreAfter = run;
    const st = Q.stage(run); s.stageAfter = st.name; s.newStage = st !== Q.stage(run - s.gain);
  });
  const after30 = total + steps.slice(0, 2).reduce((a, s) => a + s.gain, 0);
  const phases = ['Next 30 days', 'This term', 'This year'].map(w => ({ when: w, steps: steps.filter(s => s.when === w) })).filter(p => p.steps.length);

  const next = stages[si + 1] || null;
  const toNext = next ? next.min - total : 45 - total;
  const stepsToNext = steps.findIndex(s => s.scoreAfter >= (next ? next.min : 45)) + 1;

  const byScore = areas.slice().sort((a, b) => b.score - a.score || a.n - b.n);
  // strongest single answer: highest points, earliest question
  const best = answers.slice().sort((a, b) => b.points - a.points || a.i - b.i)[0];

  return {
    lead: Object.assign({ name: '', role: '', institution: '' }, lead || {}),
    keys: keys.slice(), levels: lv, total, max: 45,
    stage: stages[si], stageIndex: si, stages, next, toNext, stepsToNext,
    answers, areas, strongest: byScore[0], weakest: byScore[byScore.length - 1], best,
    steps, phases, after30, after30Stage: Q.stage(after30).name,
    full: steps.length === 0
  };
};
