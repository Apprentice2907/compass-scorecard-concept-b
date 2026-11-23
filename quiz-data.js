/* Compass dining readiness quiz - shared content + scoring.
   Q1, Q2, Q4, Q6, Q7, Q8: question meaning, scores and explanations come from
   "Compass School Wellbeing Scorecard.docx"; question and option copy is our simplified draft.
   Q3, Q5, Q9: new questions, our draft (needs client approval).
   Stage names and descriptions are verbatim from the document; the 9-45 ranges are our proposal. */
window.QUIZ = (function () {
  const pillars = [
    { id: 'nutrition', name: 'Nutrition', place: 'Serving counter', q: [0, 1, 2] },
    { id: 'safety', name: 'Food Safety', place: 'Kitchen', q: [3, 4, 5] },
    { id: 'awareness', name: 'Awareness & Sustainability', place: 'Dining hall', q: [6, 7, 8] }
  ];

  const questions = [
    /* ---------- Pillar 1: Nutrition ---------- */
    {
      pillar: 0, area: 'Nutrition Strategy & Menu Design', short: 'Your cafeteria menu',
      phrase: 'set age-specific nutrition targets before menus are planned',
      text: 'What shapes your menu decisions most?',
      options: [
        { key: 'A', score: 1, headline: 'Taste, variety and budget',
          text: 'Student preferences, variety and cost lead. Nutrition is checked along the way.',
          explanation: 'Nutrition is considered, but there is no indication of a defined nutritional framework guiding menu decisions.',
          insight: 'Your menus already balance taste, variety and cost, which students value. Adding clear nutrition targets on top turns good meals into planned nutrition.' },
        { key: 'B', score: 3, headline: 'Balanced meals',
          text: 'Menus are built around food groups and seasonal produce, with nutrition weighed alongside taste and cost.',
          explanation: 'Demonstrates nutrition-conscious menu planning but does not establish whether age-specific nutritional benchmarks and meal-level targets consistently guide decisions.',
          insight: 'Balanced meals are already your standard. Setting age-wise nutrition targets for each meal is the natural next step, and it builds on what you do today.' },
        { key: 'C', score: 5, headline: 'Nutrition targets first',
          text: 'Age-specific nutrition targets come first. Chefs and nutritionists turn them into recipes, portions and menu rotations.',
          explanation: 'Demonstrates nutrition by design, with science-led standards embedded before menu development, aligned with the Compass K12 Nutrition Guideline.',
          insight: 'You plan menus from science-led nutrition targets, in line with the Compass K12 Nutrition Guideline. This is the strongest foundation a cafeteria can have.' }
      ]
    },
    {
      pillar: 0, area: 'Nutritional Transparency & Validation', short: 'Nutrition info',
      phrase: 'back your menus with measured nutrition data',
      text: 'A parent or leader asks you to prove the food is nutritious. What can you show?',
      options: [
        { key: 'A', score: 1, headline: 'Menus and ingredients',
          text: 'We can share planned menus and ingredient lists.',
          explanation: 'Menu transparency exists, but there is limited evidence of quantified nutritional assessment or systematic validation.',
          insight: 'You already share menus and ingredients openly, which families appreciate. Adding nutrient values for each meal gives them, and you, the full picture.' },
        { key: 'B', score: 3, headline: 'Data for some meals',
          text: 'Nutrition information for selected meals, reviewed from time to time.',
          explanation: 'Some nutritional assessment is undertaken, but consistency across meal occasions, nutrients and menu cycles may need strengthening.',
          insight: 'You measure nutrition for some meals, so the habit is already there. Extending it to every meal and menu cycle makes your nutrition easy to show.' },
        { key: 'C', score: 5, headline: 'Measured against benchmarks',
          text: 'Nutrient values for every menu, checked against benchmarks and reviewed by a nutritionist.',
          explanation: 'Demonstrates measurable nutritional accountability through nutrient analysis, independent validation and structured scorecard-based assessment.',
          insight: 'You check meals against benchmarks, with nutrient analysis and independent validation. This is nutritional accountability at its best.' }
      ]
    },
    {
      pillar: 0, area: 'Healthy Ingredient Standards', short: 'Serving counter', isNew: true,
      phrase: 'set clear limits on sugar, salt, fried and processed foods',
      text: 'How do you manage sugar, salt, fried and processed foods?',
      options: [
        { key: 'A', score: 1, headline: 'Kept in moderation',
          text: 'We try to limit them, but there are no set rules.',
          explanation: 'DRAFT: Healthier choices are encouraged, but there are no defined standards limiting sugar, salt, fried or processed foods.',
          insight: 'Healthier choices are already encouraged in your cafeteria. Written limits for sugar, salt, fried and processed foods will make that consistent every day.' },
        { key: 'B', score: 3, headline: 'Some limits in place',
          text: 'We have guidelines for a few items, like fried snacks or sugary drinks.',
          explanation: 'DRAFT: Some limits exist for specific items, but standards may not yet cover the full menu consistently.',
          insight: 'You have limits in place for key items, a solid start. Applying them across the full menu makes healthy eating the default.' },
        { key: 'C', score: 5, headline: 'Clear standards',
          text: 'Set limits for sugar, salt, fried and processed foods, with fresh, whole ingredients as the default.',
          explanation: 'DRAFT: Demonstrates defined ingredient standards, with fresh, whole foods as the default and clear limits on less healthy items.',
          insight: 'Fresh, whole ingredients are your default, with clear limits on less healthy items. Students get the benefit at every meal.' }
      ]
    },

    /* ---------- Pillar 2: Food Safety ---------- */
    {
      pillar: 1, area: 'Food Safety & Operational Governance', short: 'Kitchen hygiene',
      phrase: 'standardise food safety audits and certification',
      text: 'How would you show that food safety standards are followed every day?',
      options: [
        { key: 'A', score: 1, headline: 'Good hygiene',
          text: 'Our team follows hygiene practices and fixes issues as they come up.',
          explanation: 'Indicates reliance on operational practices and reactive issue resolution, with limited evidence of documented monitoring and audit mechanisms.',
          insight: 'Your team keeps good hygiene day to day. Turning it into written checklists with regular audits protects that work and makes it easy to show inspectors.' },
        { key: 'B', score: 3, headline: 'Documented and inspected',
          text: 'Food safety records, trained food handlers and regular kitchen inspections.',
          explanation: 'Demonstrates structured food safety practices, but the frequency, effectiveness and accountability of compliance monitoring may require further assessment.',
          insight: 'Your safety practices are documented and inspected, a strong base. Regular independent audits and certification build full confidence.' },
        { key: 'C', score: 5, headline: 'Audited and certified',
          text: 'Documented safety systems, regular audits, tracked corrective actions and valid certifications.',
          explanation: 'Demonstrates a governed food-service environment with documented standards, trained personnel, audit mechanisms and continuous compliance monitoring.',
          insight: 'Audited, certified and continuously monitored: your kitchen runs to the highest standard of food safety governance.' }
      ]
    },
    {
      pillar: 1, area: 'Allergen Management', short: 'Allergen station', isNew: true,
      phrase: 'build a full allergen management system',
      text: 'A student with a severe nut allergy comes to the cafeteria. How do you keep their meal safe?',
      options: [
        { key: 'A', score: 1, headline: 'The team is aware',
          text: 'Our chefs and serving team know which students have allergies and take care when serving.',
          explanation: 'DRAFT: Allergy awareness relies on individual staff knowledge, with limited documented controls at preparation and service.',
          insight: 'Your team is aware of allergies and cares about getting it right. A written allergen system for recipes, preparation and service makes that care consistent at every meal.' },
        { key: 'B', score: 3, headline: 'Labels and a list',
          text: 'Allergens are labelled on the menu and the cafeteria keeps a list of students with allergies.',
          explanation: 'DRAFT: Allergen labelling and records exist, but controls across preparation, training and service may not be consistent.',
          insight: 'Allergen labels and records are in place, which families rely on. Linking them to staff training and checks at the counter completes the system.' },
        { key: 'C', score: 5, headline: 'A full allergen system',
          text: 'Allergen records for every recipe, separate preparation, trained staff and a check at the point of service.',
          explanation: 'DRAFT: Demonstrates a documented allergen management system covering recipes, preparation, staff training and point-of-service checks.',
          insight: 'You run a full allergen system, from recipes to checks at the counter. Families of children with allergies can trust your cafeteria.' }
      ]
    },
    {
      pillar: 1, area: 'Nutrition Innovation & Continuous Improvement', short: 'Quality board',
      phrase: 'build a data-led cycle of continuous improvement',
      text: 'When you spot a way to improve the food programme, what happens next?',
      options: [
        { key: 'A', score: 1, headline: 'We react to feedback',
          text: 'Changes come when students, parents or staff raise a concern.',
          explanation: 'Indicates a largely reactive improvement process, with limited evidence of structured performance assessment or forward planning.',
          insight: 'You listen and act when feedback comes in. A short regular review of menus and results helps you spot improvements before anyone asks.' },
        { key: 'B', score: 3, headline: 'Periodic reviews',
          text: 'We review menus and feedback from time to time and try new recipes.',
          explanation: 'Demonstrates an improvement-oriented approach, but opportunities remain to strengthen measurable outcomes, nutritional validation, and systematic review.',
          insight: 'You review performance regularly, so improvement is already part of the routine. Tracking a few clear measures each term will show the progress you are making.' },
        { key: 'C', score: 5, headline: 'A data-led cycle',
          text: 'We use nutrition, feedback and audit data to find gaps, test changes and measure results.',
          explanation: 'Demonstrates a data-led continuous improvement cycle, integrating nutrition governance, culinary innovation, validation and site-level monitoring.',
          insight: 'You run a data-led improvement cycle that brings together nutrition, new recipes and site checks. Your cafeteria keeps getting better by design.' }
      ]
    },

    /* ---------- Pillar 3: Awareness & Sustainability ---------- */
    {
      pillar: 2, area: 'Nutrition Education & Student Wellbeing', short: 'Learning corner',
      phrase: 'make nutrition education hands-on',
      text: 'How do you help students make good food choices on their own?',
      options: [
        { key: 'A', score: 1, headline: 'Healthy meals and reminders',
          text: 'We serve balanced meals and encourage healthy eating.',
          explanation: 'Food provision is established, but structured opportunities to build nutrition knowledge and influence eating behaviour are limited.',
          insight: 'You serve healthy meals and encourage good choices. Hands-on sessions, such as a teaching kitchen, help students learn to choose well for themselves.' },
        { key: 'B', score: 3, headline: 'Campaigns and sessions',
          text: 'Health campaigns, workshops and talks on healthier choices.',
          explanation: 'Demonstrates an awareness-based approach, with opportunities to create more consistent, experiential, and age-appropriate nutrition education programmes.',
          insight: 'Your campaigns and sessions already get students thinking about food. Making them regular, hands-on and matched to each age group builds lasting habits.' },
        { key: 'C', score: 5, headline: 'Hands-on learning',
          text: 'Students learn by doing: cooking sessions, food exploration and kitchen experiences.',
          explanation: 'Demonstrates integration of nutrition education into the student experience, extending nutrition beyond meal provision into education and behaviour development.',
          insight: 'Nutrition education is part of everyday life at your institution, from the cafeteria to hands-on learning. Students learn healthy habits, not just eat healthy meals.' }
      ]
    },
    {
      pillar: 2, area: 'Sustainability & Responsible Food Practices', short: 'Waste station',
      phrase: 'build sustainability into everyday food decisions',
      text: 'How does sustainability show up in your food service?',
      options: [
        { key: 'A', score: 1, headline: 'We discourage waste',
          text: 'We ask students and staff to avoid wasting food.',
          explanation: 'Indicates awareness of sustainability, but limited evidence of structured food-service practices or measurable outcomes.',
          insight: 'Your team already discourages waste. Measuring food waste and setting simple targets turns that intention into results you can report.' },
        { key: 'B', score: 3, headline: 'Some green initiatives',
          text: 'Food waste reduction, responsible sourcing or saving resources in some areas.',
          explanation: 'Demonstrates active sustainability initiatives, although their integration, monitoring and consistency across operations may vary.',
          insight: 'You have green initiatives running, a good base. Bringing them together with regular tracking makes sustainability part of how the kitchen runs.' },
        { key: 'C', score: 5, headline: 'Part of every decision',
          text: 'Sustainability shapes sourcing, menus, resources and waste, and we track the results.',
          explanation: 'Demonstrates a systematic approach to responsible food-service operations, with sustainability integrated into planning and operational decision-making.',
          insight: 'Sustainability is built into every decision, from planning to service. Your cafeteria leads by example.' }
      ]
    },
    {
      pillar: 2, area: 'Communication & Feedback', short: 'Feedback point', isNew: true,
      phrase: 'make food communication open and two-way',
      text: 'How do students, families and staff stay informed about the food and share their views?',
      options: [
        { key: 'A', score: 1, headline: 'Menus on display',
          text: 'Menus are shared, and feedback comes in informally.',
          explanation: 'DRAFT: Information is shared one way and feedback is informal, with limited evidence that it shapes decisions.',
          insight: 'Menus are on display, so families know what is served. A simple way to give feedback, and sharing what changes as a result, builds trust.' },
        { key: 'B', score: 3, headline: 'Updates and surveys',
          text: 'We share menus and food updates, and run feedback surveys from time to time.',
          explanation: 'DRAFT: Regular communication and periodic feedback exist, but the link between feedback and visible change may need strengthening.',
          insight: 'You share updates and run surveys, so families have a voice. Showing what changed because of their feedback closes the loop.' },
        { key: 'C', score: 5, headline: 'Open and two-way',
          text: 'Menus, nutrition and sourcing are shared openly, feedback is collected regularly, and people see what changed.',
          explanation: 'DRAFT: Demonstrates open, two-way communication where the community is informed and sees how feedback leads to change.',
          insight: 'Communication is open and two-way, and families see their feedback lead to change. This builds real trust in your cafeteria.' }
      ]
    }
  ];

  // 9 questions x (1/3/5): totals are always odd, 9 to 45
  const stages = [
    { min: 9, max: 15, name: 'Foundation Stage',
      desc: 'The institution has basic food-service practices in place, but nutrition, governance and wellbeing initiatives have significant opportunities for development.' },
    { min: 16, max: 22, name: 'Emerging Stage',
      desc: 'The institution demonstrates awareness and has initiated several positive practices. However, these may not yet be consistently part of everyday food and wellbeing practice.' },
    { min: 23, max: 30, name: 'Developing Stage',
      desc: 'The institution has established several good practices. The next opportunity is to strengthen standardisation, nutritional accountability and operational consistency.' },
    { min: 31, max: 38, name: 'Advanced Stage',
      desc: 'The institution demonstrates a mature approach across most assessed areas, with opportunities to deepen innovation, measurement and integration.' },
    { min: 39, max: 45, name: 'Future-Ready Stage',
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

  // pillar score 3-15 and its band
  const pillarScore = (ans, p) => pillars[p].q.reduce((s, i) => s + (ans[i] ? opt(i, ans[i]).score : 0), 0);
  const band = s => (s >= 13 ? { id: 'strong', word: 'Strong' } : s >= 9 ? { id: 'mid', word: 'In progress' } : { id: 'low', word: 'Needs attention' });

  function gaps(ans) {
    const items = ans
      .map((k, i) => ({ i, score: opt(i, k).score }))
      .filter(x => x.score < 5)
      .sort((a, b) => a.score - b.score || a.i - b.i)
      .slice(0, 3)
      .map(x => questions[x.i].phrase);
    if (!items.length) return 'You are setting the benchmark. The next step is keeping it there, and Chartwells can help you maintain it.';
    const list = items.length === 1 ? items[0] : items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
    return 'Where to focus next: ' + list + '.';
  }

  // What the backend would store for one submission.
  function record(ans, lead) {
    const t = total(ans);
    return {
      submittedAt: new Date().toISOString(),
      lead,
      answers: ans.map((k, i) => ({
        pillar: pillars[questions[i].pillar].name, area: questions[i].area,
        option: k, score: opt(i, k).score, explanation: opt(i, k).explanation
      })),
      pillars: pillars.map((p, n) => ({ name: p.name, score: pillarScore(ans, n), band: band(pillarScore(ans, n)).word })),
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

  return { pillars, questions, stages, opt, shuffle, total, stage, stageIndex, level, pillarScore, band, gaps, record, reducedMotion, countUp };
})();
