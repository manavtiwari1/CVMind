// The aptitude question bank. Answers and explanations stay on the server: the site gets the
// questions only, and /api/aptitude/check grades them. `answer` is the index of the right option.

export const TOPICS = {
  quant: { label: 'Quantitative Aptitude', desc: 'Percentages, profit and loss, time and work, interest, speed and distance', count: 10 },
  reasoning: { label: 'Logical Reasoning', desc: 'Series, coding-decoding, blood relations, directions, syllogisms', count: 10 },
  verbal: { label: 'Verbal Ability', desc: 'Synonyms, antonyms, grammar, error spotting, idioms', count: 10 },
  mixed: { label: 'Mixed Mock Test', desc: 'Quant, reasoning and verbal together, like a placement test', count: 15 }
};

// A minute per question, the usual pace in placement aptitude rounds
export const MINUTES_PER_QUESTION = 1;

export const QUESTIONS = [
  // ── Quantitative Aptitude ─────────────────────────────────────────────
  { id: 'q-markup-discount', topic: 'quant', subtopic: 'Profit and loss',
    question: 'A shopkeeper marks an item 25% above its cost price and then gives a 10% discount. What is his profit percentage?',
    options: ['10%', '12.5%', '15%', '11.25%'], answer: 1,
    explanation: 'Take cost price = 100. Marked price = 125. After 10% discount, selling price = 125 × 0.9 = 112.5. Profit = 12.5 on 100, so 12.5%.' },
  { id: 'q-train-pole', topic: 'quant', subtopic: 'Speed and distance',
    question: 'A train 150 m long passes a pole in 10 seconds. What is its speed in km/h?',
    options: ['45 km/h', '54 km/h', '60 km/h', '50 km/h'], answer: 1,
    explanation: 'To pass a pole the train covers its own length: 150 m in 10 s = 15 m/s. To convert m/s to km/h multiply by 18/5: 15 × 18/5 = 54 km/h.' },
  { id: 'q-average-removed', topic: 'quant', subtopic: 'Averages',
    question: 'The average of 5 numbers is 20. When one number is removed, the average of the remaining 4 is 18. Which number was removed?',
    options: ['22', '26', '28', '30'], answer: 2,
    explanation: 'Sum of 5 numbers = 5 × 20 = 100. Sum of the remaining 4 = 4 × 18 = 72. Removed number = 100 − 72 = 28.' },
  { id: 'q-simple-interest', topic: 'quant', subtopic: 'Simple interest',
    question: 'What is the simple interest on ₹8,000 at 5% per year for 3 years?',
    options: ['₹1,000', '₹1,200', '₹1,260', '₹1,500'], answer: 1,
    explanation: 'Simple interest = P × R × T / 100 = 8000 × 5 × 3 / 100 = ₹1,200.' },
  { id: 'q-work-together', topic: 'quant', subtopic: 'Time and work',
    question: 'A can finish a piece of work in 12 days and B in 18 days. How many days will they take working together?',
    options: ['6 days', '7.2 days', '7.5 days', '8 days'], answer: 1,
    explanation: 'In one day A does 1/12 and B does 1/18. Together: 1/12 + 1/18 = 3/36 + 2/36 = 5/36 of the work per day. Time = 36/5 = 7.2 days.' },
  { id: 'q-age-ratio', topic: 'quant', subtopic: 'Ratio and proportion',
    question: 'The ages of A and B are in the ratio 3 : 5, and their ages add up to 48 years. How old is B?',
    options: ['18 years', '24 years', '30 years', '32 years'], answer: 2,
    explanation: 'Total parts = 3 + 5 = 8, so one part = 48 / 8 = 6 years. B = 5 × 6 = 30 years.' },
  { id: 'q-compound-interest', topic: 'quant', subtopic: 'Compound interest',
    question: 'What is the compound interest on ₹10,000 at 10% per year for 2 years, compounded yearly?',
    options: ['₹2,000', '₹2,010', '₹2,100', '₹2,200'], answer: 2,
    explanation: 'Amount = 10000 × 1.1 × 1.1 = ₹12,100. Compound interest = 12,100 − 10,000 = ₹2,100. (Simple interest would be ₹2,000; the extra ₹100 is interest on the first year\'s interest.)' },
  { id: 'q-up-down-percent', topic: 'quant', subtopic: 'Percentages',
    question: 'A number is increased by 20% and the result is then decreased by 20%. What is the net change?',
    options: ['No change', '4% decrease', '4% increase', '2% decrease'], answer: 1,
    explanation: 'Take the number as 100. After +20%: 120. After −20% of 120: 120 − 24 = 96. Net change = 4% decrease.' },
  { id: 'q-pipes-outlet', topic: 'quant', subtopic: 'Pipes and cisterns',
    question: 'Two pipes can fill a tank in 20 minutes and 30 minutes. An outlet pipe can empty the full tank in 15 minutes. If all three are opened together on an empty tank, how long will it take to fill?',
    options: ['30 minutes', '45 minutes', '60 minutes', '90 minutes'], answer: 2,
    explanation: 'Per minute: +1/20 + 1/30 − 1/15 = 3/60 + 2/60 − 4/60 = 1/60 of the tank. So the tank fills in 60 minutes.' },
  { id: 'q-dice-seven', topic: 'quant', subtopic: 'Probability',
    question: 'Two fair dice are thrown. What is the probability that the sum is 7?',
    options: ['1/6', '1/12', '5/36', '7/36'], answer: 0,
    explanation: 'There are 36 equally likely outcomes. Sum 7 comes from (1,6), (2,5), (3,4), (4,3), (5,2), (6,1): 6 outcomes. Probability = 6/36 = 1/6.' },
  { id: 'q-boat-downstream', topic: 'quant', subtopic: 'Boats and streams',
    question: 'A boat\'s speed in still water is 12 km/h and the stream flows at 3 km/h. How long will the boat take to go 45 km downstream?',
    options: ['3 hours', '3.75 hours', '4 hours', '5 hours'], answer: 0,
    explanation: 'Downstream speed = boat + stream = 12 + 3 = 15 km/h. Time = 45 / 15 = 3 hours.' },
  { id: 'q-price-consumption', topic: 'quant', subtopic: 'Percentages',
    question: 'The price of sugar rises by 25%. By what percentage must a family cut its sugar use so that its spending on sugar stays the same?',
    options: ['15%', '20%', '22.5%', '25%'], answer: 1,
    explanation: 'Price goes from 100 to 125. To keep spending at 100, use must fall from 1 to 100/125 = 0.8, a cut of 20%. Shortcut: rise / (100 + rise) × 100 = 25/125 × 100 = 20%.' },

  // ── Logical Reasoning ─────────────────────────────────────────────────
  { id: 'r-series-nn1', topic: 'reasoning', subtopic: 'Number series',
    question: 'Find the next number: 2, 6, 12, 20, 30, ?',
    options: ['36', '40', '42', '44'], answer: 2,
    explanation: 'The gaps are 4, 6, 8, 10, so the next gap is 12: 30 + 12 = 42. (Each term is n × (n + 1): 1×2, 2×3, 3×4 … 6×7 = 42.)' },
  { id: 'r-series-double', topic: 'reasoning', subtopic: 'Number series',
    question: 'Find the next number: 3, 5, 9, 17, 33, ?',
    options: ['63', '64', '65', '66'], answer: 2,
    explanation: 'Each term is double the previous one minus 1: 3×2−1 = 5, 5×2−1 = 9, … 33×2−1 = 65.' },
  { id: 'r-coding-shift', topic: 'reasoning', subtopic: 'Coding-decoding',
    question: 'If CAT is coded as DBU, how is DOG coded?',
    options: ['DPH', 'EOH', 'EPH', 'FPH'], answer: 2,
    explanation: 'Each letter moves one step forward: C→D, A→B, T→U. So D→E, O→P, G→H gives EPH.' },
  { id: 'r-blood-grandfather', topic: 'reasoning', subtopic: 'Blood relations',
    question: 'A is B\'s brother. C is A\'s mother. D is C\'s father. How is D related to B?',
    options: ['Father', 'Uncle', 'Grandfather', 'Brother'], answer: 2,
    explanation: 'A and B are siblings, so C is also B\'s mother. D is C\'s father, which makes D the maternal grandfather of B.' },
  { id: 'r-direction-u', topic: 'reasoning', subtopic: 'Directions',
    question: 'Ravi walks 5 km north, turns right and walks 3 km, then turns right again and walks 5 km. Where is he now from his starting point?',
    options: ['3 km East', '3 km West', '5 km North', '13 km East'], answer: 0,
    explanation: 'North 5 km, then a right turn faces east (3 km), then another right turn faces south (5 km), which cancels the 5 km north. He ends 3 km east of the start.' },
  { id: 'r-odd-prime', topic: 'reasoning', subtopic: 'Odd one out',
    question: 'Which number is the odd one out: 3, 5, 9, 11?',
    options: ['3', '5', '9', '11'], answer: 2,
    explanation: '3, 5 and 11 are prime numbers. 9 = 3 × 3 is not prime.' },
  { id: 'r-syllogism-roses', topic: 'reasoning', subtopic: 'Syllogism',
    question: 'Statements: All roses are flowers. Some flowers are red.\nConclusions: I. Some roses are red. II. Some flowers are roses.\nWhich conclusion follows?',
    options: ['Only I', 'Only II', 'Both I and II', 'Neither I nor II'], answer: 1,
    explanation: 'Since all roses are flowers, some flowers must be roses, so II follows. The red flowers may or may not include roses, so I does not necessarily follow.' },
  { id: 'r-clock-330', topic: 'reasoning', subtopic: 'Clocks',
    question: 'What is the angle between the hour and minute hands of a clock at 3:30?',
    options: ['60°', '75°', '82.5°', '90°'], answer: 1,
    explanation: 'Minute hand at 30 min = 180°. Hour hand = 3 × 30° + 30 × 0.5° = 105°. Angle = 180° − 105° = 75°. (Formula: |30H − 5.5M| = |90 − 165| = 75°.)' },
  { id: 'r-calendar-year', topic: 'reasoning', subtopic: 'Calendars',
    question: '1 January 2025 was a Wednesday. What day of the week is 1 January 2026?',
    options: ['Tuesday', 'Wednesday', 'Thursday', 'Friday'], answer: 2,
    explanation: '2025 is not a leap year, so it has 365 days = 52 weeks + 1 day. The weekday moves forward by one: Wednesday → Thursday.' },
  { id: 'r-analogy-sculptor', topic: 'reasoning', subtopic: 'Analogy',
    question: 'Book : Author :: Statue : ?',
    options: ['Painter', 'Sculptor', 'Stone', 'Museum'], answer: 1,
    explanation: 'An author creates a book; a sculptor creates a statue.' },
  { id: 'r-rank-right', topic: 'reasoning', subtopic: 'Ranking',
    question: 'In a row of 40 students, Riya is 12th from the left. What is her position from the right?',
    options: ['27th', '28th', '29th', '30th'], answer: 2,
    explanation: 'Position from right = total − position from left + 1 = 40 − 12 + 1 = 29th.' },
  { id: 'r-letter-gaps', topic: 'reasoning', subtopic: 'Letter series',
    question: 'Find the next letter: A, C, F, J, O, ?',
    options: ['S', 'T', 'U', 'V'], answer: 2,
    explanation: 'Positions are 1, 3, 6, 10, 15, with gaps 2, 3, 4, 5. The next gap is 6: 15 + 6 = 21, which is U.' },

  // ── Verbal Ability ────────────────────────────────────────────────────
  { id: 'v-syn-abundant', topic: 'verbal', subtopic: 'Synonyms',
    question: 'Choose the word closest in meaning to ABUNDANT.',
    options: ['Scarce', 'Plentiful', 'Rare', 'Narrow'], answer: 1,
    explanation: 'Abundant means existing in large quantities, the same as plentiful. Scarce and rare are its opposites.' },
  { id: 'v-ant-transparent', topic: 'verbal', subtopic: 'Antonyms',
    question: 'Choose the word opposite in meaning to TRANSPARENT.',
    options: ['Clear', 'Opaque', 'Visible', 'Bright'], answer: 1,
    explanation: 'Transparent means light passes through it. Opaque means light cannot pass through.' },
  { id: 'v-since-for', topic: 'verbal', subtopic: 'Prepositions',
    question: 'Fill in the blank: "She has been working here ___ 2019."',
    options: ['for', 'since', 'from', 'at'], answer: 1,
    explanation: '"Since" goes with a point in time (since 2019, since Monday). "For" goes with a length of time (for five years).' },
  { id: 'v-each-has', topic: 'verbal', subtopic: 'Error spotting',
    question: 'Find the part with an error: "Each of the students (A) / have submitted (B) / the assignment on time. (C) / No error (D)"',
    options: ['A', 'B', 'C', 'D'], answer: 1,
    explanation: 'The subject is "each", which is singular, so the verb must be singular: "Each of the students has submitted…".' },
  { id: 'v-spelling', topic: 'verbal', subtopic: 'Spelling',
    question: 'Which word is spelt correctly?',
    options: ['Acommodate', 'Accommodate', 'Accomodate', 'Acomodate'], answer: 1,
    explanation: 'Accommodate has a double "c" and a double "m": ac-com-mo-date.' },
  { id: 'v-polyglot', topic: 'verbal', subtopic: 'One-word substitution',
    question: 'One word for "a person who can speak many languages":',
    options: ['Polyglot', 'Bilingual', 'Orator', 'Translator'], answer: 0,
    explanation: 'A polyglot speaks many languages. Bilingual means two languages; an orator is a skilled public speaker.' },
  { id: 'v-idiom-bullet', topic: 'verbal', subtopic: 'Idioms',
    question: 'What does the idiom "bite the bullet" mean?',
    options: ['To get hurt badly', 'To face something difficult with courage', 'To speak angrily', 'To waste an opportunity'], answer: 1,
    explanation: '"Bite the bullet" means to accept and face an unpleasant or difficult situation bravely.' },
  { id: 'v-if-were', topic: 'verbal', subtopic: 'Grammar',
    question: 'Fill in the blank: "If I ___ you, I would accept the offer."',
    options: ['was', 'were', 'am', 'be'], answer: 1,
    explanation: 'For imaginary situations (the subjunctive), formal English uses "were" with every subject: "If I were you…".' },
  { id: 'v-look-forward', topic: 'verbal', subtopic: 'Sentence improvement',
    question: 'Improve the sentence: "I look forward to meet you."',
    options: ['to meeting you', 'for meeting you', 'to meet with you', 'No improvement needed'], answer: 0,
    explanation: 'In "look forward to", "to" is a preposition, so it takes the -ing form: "I look forward to meeting you."' },
  { id: 'v-ant-diligent', topic: 'verbal', subtopic: 'Antonyms',
    question: 'Choose the word opposite in meaning to DILIGENT.',
    options: ['Hardworking', 'Lazy', 'Careful', 'Clever'], answer: 1,
    explanation: 'Diligent means hardworking and careful. Its opposite is lazy.' },
  { id: 'v-good-at', topic: 'verbal', subtopic: 'Prepositions',
    question: 'Fill in the blank: "He is good ___ mathematics."',
    options: ['in', 'at', 'on', 'with'], answer: 1,
    explanation: 'We say "good at" a subject or skill: good at maths, good at coding.' },
  { id: 'v-passive', topic: 'verbal', subtopic: 'Active and passive voice',
    question: 'Choose the passive form of: "The manager approved the plan."',
    options: ['The plan is approved by the manager.', 'The plan was approved by the manager.', 'The plan has been approved by the manager.', 'The plan had approved the manager.'], answer: 1,
    explanation: 'The active sentence is in simple past ("approved"), so the passive uses "was + past participle": "The plan was approved by the manager."' }
];

const BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));
export const questionById = (id) => BY_ID.get(String(id));

// What the site may see: no answer, no explanation
export const publicQuestion = (q) => ({ id: q.id, topic: q.topic, subtopic: q.subtopic, question: q.question, options: q.options });

function shuffled(list, random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// A fresh set of questions for one test. Mixed takes an even share from each section.
export function pickQuestions(topic, random = Math.random) {
  const { count } = TOPICS[topic];
  if (topic !== 'mixed') return shuffled(QUESTIONS.filter((q) => q.topic === topic), random).slice(0, count);
  const sections = ['quant', 'reasoning', 'verbal'];
  const each = Math.floor(count / sections.length);
  return shuffled(sections.flatMap((s) => shuffled(QUESTIONS.filter((q) => q.topic === s), random).slice(0, each)), random);
}
