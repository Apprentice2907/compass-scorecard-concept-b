/* Compass School Wellbeing Scorecard - shared content + scoring.
   Question, option, score, explanation and stage text are verbatim from
   "Compass School Wellbeing Scorecard.docx".
   DRAFTS (not from the client, need approval): headline, short, phrase. */
window.QUIZ = (function () {
  const questions = [
    {
      area: 'Nutrition Strategy & Menu Design',
      short: 'Menu design',
      phrase: 'set age-specific nutrition standards before menus are planned',
      food: '#E0A93B',
      text: 'When your institution reviews its school dining menu, what typically drives the final decisions?',
      options: [
        { key: 'A', score: 1, headline: 'Taste, variety and budget lead',
          text: 'Student preferences, menu variety, budget, and operational feasibility are the primary considerations. Nutritional balance is reviewed as part of the process.',
          explanation: 'Nutrition is considered, but there is no indication of a defined nutritional framework guiding menu decisions.' },
        { key: 'B', score: 3, headline: 'Balanced meals by food group',
          text: 'Menus are planned around food groups, seasonal ingredients, and balanced meals. Nutritional requirements are considered alongside taste and operational feasibility.',
          explanation: 'Demonstrates nutrition-conscious menu planning but does not establish whether age-specific nutritional benchmarks and meal-level targets consistently guide decisions.' },
        { key: 'C', score: 5, headline: 'Nutrition targets come first',
          text: 'Menu decisions begin with defined nutritional requirements for different age groups. Chefs and nutrition experts translate these into recipes, portions, food-group inclusion, and menu rotations.',
          explanation: 'Demonstrates nutrition by design, with science-led standards embedded before menu development, aligned with the Compass K12 Nutrition Guideline.' }
      ]
    },
    {
      area: 'Nutritional Transparency & Validation',
      short: 'Nutrition proof',
      phrase: 'strengthen nutritional validation',
      food: '#5E7D3A',
      text: 'If a parent or school leader asked you to demonstrate the nutritional quality of the food served, what evidence could your institution provide?',
      options: [
        { key: 'A', score: 1, headline: 'Menus and ingredient lists',
          text: 'We can share the planned menus, ingredients and general information about the meals being served.',
          explanation: 'Menu transparency exists, but there is limited evidence of quantified nutritional assessment or systematic validation.' },
        { key: 'B', score: 3, headline: 'Nutrition data for some meals',
          text: 'We can provide nutritional information for selected meals or recipes, supported by periodic reviews.',
          explanation: 'Some nutritional assessment is undertaken, but consistency across meal occasions, nutrients and menu cycles may need strengthening.' },
        { key: 'C', score: 5, headline: 'Measured against benchmarks',
          text: 'We can demonstrate nutritional values against defined benchmarks, supported by nutrient calculations, nutritionist reviews, and documented menu assessments.',
          explanation: 'Demonstrates measurable nutritional accountability through nutrient analysis, independent validation and structured scorecard-based assessment.' }
      ]
    },
    {
      area: 'Food Safety & Operational Governance',
      short: 'Food safety',
      phrase: 'standardise food safety governance',
      food: '#7A3B2E',
      text: 'Imagine your school leadership team wants to verify that the approved food safety and quality standards are consistently followed at the point of service. How would this be demonstrated?',
      options: [
        { key: 'A', score: 1, headline: 'Good hygiene, fix issues as they arise',
          text: 'Our food-service team follows established hygiene practices, and issues are addressed whenever they are identified.',
          explanation: 'Indicates reliance on operational practices and reactive issue resolution, with limited evidence of documented monitoring and audit mechanisms.' },
        { key: 'B', score: 3, headline: 'Documented, trained, inspected',
          text: 'We maintain food safety documentation, train food handlers, and conduct periodic kitchen inspections. We have a designated food preparation facility.',
          explanation: 'Demonstrates structured food safety practices, but the frequency, effectiveness and accountability of compliance monitoring may require further assessment.' },
        { key: 'C', score: 5, headline: 'Audited, certified, monitored',
          text: 'We follow documented food safety systems, maintain appropriate kitchen infrastructure, conduct regular audits, monitor corrective actions, and hold applicable valid food safety certifications.',
          explanation: 'Demonstrates a governed food-service environment with documented standards, trained personnel, audit mechanisms and continuous compliance monitoring.' }
      ]
    },
    {
      area: 'Food Literacy & Student Wellbeing',
      short: 'Food literacy',
      phrase: 'integrate food literacy more deeply into the student experience',
      food: '#D9822B',
      text: 'A school wants students to make informed food choices independently, rather than simply depend on the meals provided. What opportunities does your institution currently create?',
      options: [
        { key: 'A', score: 1, headline: 'Healthy meals and encouragement',
          text: 'Students receive balanced meals, and healthy eating is encouraged through school communication and activities.',
          explanation: 'Food provision is established, but structured opportunities to build nutrition knowledge and influence eating behaviour are limited.' },
        { key: 'B', score: 3, headline: 'Campaigns and classroom sessions',
          text: 'Nutrition is discussed through health campaigns, classroom activities and interactive sessions. Students are encouraged to explore healthier food choices.',
          explanation: 'Demonstrates an awareness-based approach, with opportunities to create more consistent, experiential, and age-appropriate food literacy programmes.' },
        { key: 'C', score: 5, headline: 'Hands-on food learning',
          text: 'Students actively engage with food through experiential learning, nutrition sessions, interactive activities, food exploration, and kitchen experiences.',
          explanation: 'Demonstrates integration of food literacy into the student experience, extending nutrition beyond meal provision into education and behaviour development.' }
      ]
    },
    {
      area: 'Sustainability & Responsible Food Practices',
      short: 'Sustainability',
      phrase: 'build sustainability into everyday food-service decisions',
      food: '#8E2C48',
      text: 'When your institution evaluates its food-service operations, which of the following best describes how environmental responsibility influences everyday decisions?',
      options: [
        { key: 'A', score: 1, headline: 'We encourage less waste',
          text: 'We encourage responsible behaviour among students and staff, particularly around avoiding food wastage and maintaining cleanliness.',
          explanation: 'Indicates awareness of sustainability, but limited evidence of structured food-service practices or measurable outcomes.' },
        { key: 'B', score: 3, headline: 'Some green initiatives',
          text: 'We have introduced initiatives such as food-waste reduction, responsible ingredient sourcing, and resource conservation in selected areas.',
          explanation: 'Demonstrates active sustainability initiatives, although their integration, monitoring and consistency across operations may vary.' },
        { key: 'C', score: 5, headline: 'Built into every decision',
          text: 'Sustainability considerations influence procurement, menu planning, resource utilisation, and food-waste management, supported by monitoring and continuous improvement initiatives.',
          explanation: 'Demonstrates a systematic approach to responsible food-service operations, with sustainability integrated into planning and operational decision-making.' }
      ]
    },
    {
      area: 'Nutrition Innovation & Continuous Improvement',
      short: 'Improvement',
      phrase: 'build a data-led cycle of continuous improvement',
      food: '#C9A227',
      text: 'When your institution identifies an opportunity to improve its food programme, how does that insight translate into actual change?',
      options: [
        { key: 'A', score: 1, headline: 'We react to feedback',
          text: 'Changes are introduced in response to student feedback, parent concerns, or operational challenges.',
          explanation: 'Indicates a largely reactive improvement process, with limited evidence of structured performance assessment or forward planning.' },
        { key: 'B', score: 3, headline: 'Periodic reviews',
          text: 'We periodically review menus, gather feedback, and introduce new recipes, ingredients or food initiatives based on emerging requirements.',
          explanation: 'Demonstrates an improvement-oriented approach, but opportunities remain to strengthen measurable outcomes, nutritional validation, and systematic review.' },
        { key: 'C', score: 5, headline: 'A data-led improvement cycle',
          text: 'We use nutritional assessments, menu performance data, student feedback and operational audits to identify gaps, test improvements, and evaluate their effectiveness.',
          explanation: 'Demonstrates a data-led continuous improvement cycle, integrating nutrition governance, culinary innovation, validation and site-level monitoring.' }
      ]
    }
  ];

  const stages = [
    { min: 6, max: 10, name: 'Foundation Stage',
      desc: 'The institution has basic food-service practices in place, but nutrition, governance and wellbeing initiatives have significant opportunities for development.' },
    { min: 11, max: 15, name: 'Emerging Stage',
      desc: 'The institution demonstrates awareness and has initiated several positive practices. However, these may not yet be consistently integrated into its food and wellbeing ecosystem.' },
    { min: 16, max: 20, name: 'Developing Stage',
      desc: 'The institution has established several good practices. The next opportunity is to strengthen standardisation, nutritional accountability and operational consistency.' },
    { min: 21, max: 25, name: 'Advanced Stage',
      desc: 'The institution demonstrates a mature approach across most assessed areas, with opportunities to deepen innovation, measurement and integration.' },
    { min: 26, max: 30, name: 'Future-Ready Stage',
      desc: 'The institution demonstrates strong integration of nutrition, food safety, student engagement, sustainability and continuous improvement.' }
  ];

  const opt = (i, key) => questions[i].options.find(o => o.key === key);

  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const total = ans => ans.reduce((s, k, i) => s + (k ? opt(i, k).score : 0), 0);
  const stage = t => stages.find(s => t >= s.min && t <= s.max);
  const stageIndex = t => stages.indexOf(stage(t));
  const level = (i, key) => opt(i, key).score; // 1, 3 or 5

  function gaps(ans) {
    const items = ans
      .map((k, i) => ({ i, score: opt(i, k).score }))
      .filter(x => x.score < 5)
      .sort((a, b) => a.score - b.score || a.i - b.i)
      .slice(0, 3)
      .map(x => questions[x.i].phrase);
    if (!items.length) return 'You are setting the benchmark. The next step is to keep measuring, sharing and refining what already works.';
    const list = items.length === 1 ? items[0] : items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
    return 'There is an opportunity to ' + list + '.';
  }

  // What the backend would store for one submission.
  function record(ans, lead) {
    const t = total(ans);
    return {
      submittedAt: new Date().toISOString(),
      lead,
      answers: ans.map((k, i) => ({
        area: questions[i].area, option: k, score: opt(i, k).score, explanation: opt(i, k).explanation
      })),
      total: t,
      stage: stage(t).name
    };
  }

  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function countUp(el, to, ms) {
    if (reducedMotion()) { el.textContent = to; return; }
    const start = performance.now();
    (function tick(now) {
      const p = Math.min(1, (now - start) / ms);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    })(start);
  }

  return { questions, stages, opt, shuffle, total, stage, stageIndex, level, gaps, record, reducedMotion, countUp };
})();
