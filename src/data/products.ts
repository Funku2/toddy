// THE SHOP CATALOGUE
// Two kinds of product live here:
//
// 1. Partner products (kind: 'partner') — sold by someone else. When an affiliate
//    programme approves you, paste your tracked link into `url` and the partner's
//    name into `partner`. Until then the button searches Amazon.ca for the item.
//
// 2. Your own digital products (kind: 'digital') — sold on this site. Create a
//    Stripe Payment Link for the product, paste it into `checkoutUrl`, set `price`,
//    and the page switches from "Join the waitlist" to "Buy now" automatically.

export type Category = 'supplements' | 'recovery' | 'strength' | 'tracking' | 'guides';

export const categories: { id: Category; name: string; blurb: string }[] = [
  { id: 'guides', name: 'Guides & programs', blurb: 'Our own. Bought and delivered right here.' },
  { id: 'supplements', name: 'Supplements', blurb: 'A short list. Most of the aisle is noise.' },
  { id: 'recovery', name: 'Heat, cold & sleep', blurb: 'Where the real recovery happens.' },
  { id: 'strength', name: 'Strength gear', blurb: 'Enough to train hard at home.' },
  { id: 'tracking', name: 'Track & test', blurb: 'Measure it, then manage it.' },
];

export interface Product {
  slug: string;
  kind: 'partner' | 'digital';
  category: Category;
  name: string;
  summary: string;
  image?: 'supplements' | 'wearable' | 'barrel-sauna' | 'gym-gear' | 'labs' | 'sleep' | 'meal' | 'barbell';
  why: string;
  lookFor: string[];
  caution?: string;
  // partner
  partner?: string;
  url?: string;
  search?: string;
  // digital
  price?: string;
  checkoutUrl?: string;
  format?: string;
  free?: boolean;
}

export const products: Product[] = [
  // ——— Our own ———
  {
    slug: 'edge-reset',
    kind: 'digital',
    category: 'guides',
    name: 'The 7-Day Edge Reset',
    summary: 'One small change a day across the five levers. The place to start.',
    why: 'Most men try to change everything on a Monday and are back where they started by Friday. The Reset gives you one change a day for a week, so by day seven you have a baseline routine you can actually keep.',
    lookFor: ['Seven short daily actions, ten to thirty minutes each', 'No equipment and nothing to buy', 'Sent to your inbox the moment you sign up'],
    format: 'Free guide',
    free: true,
  },
  {
    slug: '90-day-rebuild',
    kind: 'digital',
    category: 'guides',
    name: 'The 90-Day Rebuild',
    summary: 'The full plan: training, food, recovery and stress, week by week.',
    why: 'The Reset gets you moving. The Rebuild is the twelve-week plan that follows: three strength sessions a week, a way of eating you can hold, a recovery routine, and simple daily practices for stress.',
    lookFor: ['Twelve weeks of strength training built for joints over forty', 'A simple protein-first way of eating, with no meal plan to obey', 'Weekly check-ins so you can see the trend, not the bad day'],
    format: 'Digital program',
    price: '',
    checkoutUrl: '',
  },
  {
    slug: 'bloodwork-conversation',
    kind: 'digital',
    category: 'guides',
    name: 'The Bloodwork Conversation',
    summary: 'What to ask your doctor for, and how to read what comes back.',
    why: 'Walking in and saying "I\'m tired" gets you a basic panel and a shrug. This guide helps you have a better appointment: which markers are worth asking about, what the ranges mean, and which questions to bring.',
    lookFor: ['A one-page list to take to your appointment', 'Plain-English notes on the common markers', 'A tracker so you can compare results over time'],
    caution: 'This is an educational guide. It does not diagnose anything and does not replace your doctor.',
    format: 'Digital guide',
    price: '',
    checkoutUrl: '',
  },

  // ——— Supplements ———
  {
    slug: 'creatine-monohydrate',
    kind: 'partner',
    category: 'supplements',
    name: 'Creatine monohydrate',
    summary: 'The most studied strength supplement there is, and one of the cheapest.',
    image: 'supplements',
    why: 'If you lift, creatine is the first supplement worth considering. Decades of research support it for strength and muscle when combined with resistance training, and it costs pennies a day.',
    lookFor: ['Plain creatine monohydrate, with nothing else added', 'Third-party tested for purity', 'Unflavoured powder, so you can put it in anything'],
    caution: 'Check with your doctor first if you have kidney disease or take regular medication.',
    search: 'creatine monohydrate powder',
  },
  {
    slug: 'magnesium-glycinate',
    kind: 'partner',
    category: 'supplements',
    name: 'Magnesium glycinate',
    summary: 'A gentle form of magnesium that many men take in the evening.',
    image: 'supplements',
    why: 'Plenty of adults fall short on magnesium from food alone. The glycinate form is easy on the stomach, which is why it is the one most people choose for an evening routine. The research on sleep is mixed, so treat it as worth a trial, not a cure.',
    lookFor: ['Magnesium bisglycinate listed as the form', 'The elemental magnesium amount stated per capsule', 'Third-party tested'],
    caution: 'Magnesium can interact with some medications. Ask your pharmacist.',
    search: 'magnesium bisglycinate capsules',
  },
  {
    slug: 'vitamin-d3-k2',
    kind: 'partner',
    category: 'supplements',
    name: 'Vitamin D3 + K2',
    summary: 'Worth it for many Canadians in winter. Test before you guess.',
    image: 'supplements',
    why: 'At Calgary\'s latitude your skin makes very little vitamin D from October to April. Low levels are common here, and a blood test is the only way to know where you stand.',
    lookFor: ['D3 (cholecalciferol), not D2', 'A dose that matches your blood test and your doctor\'s advice', 'Drops or softgels in oil, for absorption'],
    caution: 'More is not better. Very high doses over time can cause harm, and K2 matters if you take blood thinners. Ask first.',
    search: 'vitamin d3 k2 drops',
  },
  {
    slug: 'omega-3',
    kind: 'partner',
    category: 'supplements',
    name: 'Omega-3 fish oil',
    summary: 'For the weeks you are not eating fatty fish twice.',
    image: 'supplements',
    why: 'If you eat salmon, sardines or mackerel a couple of times a week you may not need this. Most of us don\'t, and a fish oil is the practical fallback.',
    lookFor: ['EPA and DHA amounts printed on the label, not just "fish oil"', 'Third-party tested for purity and freshness', 'No fishy smell when you open the bottle'],
    caution: 'Talk to your doctor first if you take blood thinners.',
    search: 'omega 3 fish oil epa dha',
  },
  {
    slug: 'protein-powder',
    kind: 'partner',
    category: 'supplements',
    name: 'Whey protein',
    summary: 'The easiest way to hit your protein number on a busy day.',
    image: 'meal',
    why: 'Holding on to muscle after forty takes more protein than most men eat. Food comes first, and a scoop of whey closes the gap when it doesn\'t happen.',
    lookFor: ['20 to 30 grams of protein per scoop', 'A short ingredient list', 'Whey isolate if regular whey bothers your stomach'],
    search: 'whey protein isolate',
  },

  // ——— Recovery ———
  {
    slug: 'home-sauna',
    kind: 'partner',
    category: 'recovery',
    name: 'Home sauna',
    summary: 'A regular part of my week, and the easiest habit to keep.',
    image: 'barrel-sauna',
    why: 'Sauna is a regular part of my routine. Long-running Finnish research links frequent sauna bathing with better heart health, and twenty quiet minutes in the heat is a reliable way to switch off.',
    lookFor: ['A heater sized for the room, so it reaches temperature', 'Cedar or thermally treated wood', 'Local electrical requirements checked before you order'],
    caution: 'Heat is a real stress on the body. Get medical clearance first if you have a heart condition or low blood pressure, and never mix sauna with alcohol.',
    search: 'outdoor barrel sauna',
  },
  {
    slug: 'sauna-blanket',
    kind: 'partner',
    category: 'recovery',
    name: 'Infrared sauna blanket',
    summary: 'The apartment-sized way to get regular heat.',
    image: 'barrel-sauna',
    why: 'No space or budget for a sauna? A blanket is not the same experience, but it gets you sweating at home for a fraction of the cost.',
    lookFor: ['Low-EMF certification', 'A washable liner or insert', 'An auto shut-off timer'],
    caution: 'The same cautions as a sauna apply. Stay hydrated and start with short sessions.',
    search: 'infrared sauna blanket',
  },
  {
    slug: 'cold-plunge',
    kind: 'partner',
    category: 'recovery',
    name: 'Cold plunge tub',
    summary: 'Optional. Useful if you will actually get in.',
    image: 'barrel-sauna',
    why: 'Cold exposure wakes you up like nothing else, and some men find it helps their mood. It is not essential, and a cold shower is a free way to find out whether you will stick with it.',
    lookFor: ['An insulated tub with a lid', 'A chiller only if you will use it most days', 'A size you can sit in up to your shoulders'],
    caution: 'Cold shock is hard on the heart. Get medical clearance if you have any cardiovascular condition.',
    search: 'cold plunge tub',
  },

  // ——— Strength ———
  {
    slug: 'adjustable-dumbbells',
    kind: 'partner',
    category: 'strength',
    name: 'Adjustable dumbbells',
    summary: 'A full rack of weights in the space of a shoebox.',
    image: 'gym-gear',
    why: 'If you keep one piece of home equipment, make it this. One pair covers almost every exercise you need and grows with you as you get stronger.',
    lookFor: ['A top weight you will not outgrow in a year', 'A quick, secure adjustment mechanism', 'A flat base so they don\'t roll'],
    search: 'adjustable dumbbells set',
  },
  {
    slug: 'kettlebell',
    kind: 'partner',
    category: 'strength',
    name: 'Cast-iron kettlebell',
    summary: 'Swings, carries and goblet squats. Twenty minutes, done.',
    image: 'gym-gear',
    why: 'One kettlebell and a patch of floor is a complete workout. It is the best answer to "I don\'t have time".',
    lookFor: ['Single-piece cast iron', 'A smooth handle wide enough for both hands', 'Start lighter than your ego suggests'],
    search: 'cast iron kettlebell',
  },
  {
    slug: 'resistance-bands',
    kind: 'partner',
    category: 'strength',
    name: 'Resistance bands',
    summary: 'Warm-ups, travel workouts and kinder on cranky shoulders.',
    image: 'gym-gear',
    why: 'Cheap, light and surprisingly useful. Use them to warm up before lifting and to keep training when you are away from home.',
    lookFor: ['A set with several resistance levels', 'Layered latex, which lasts longer than moulded', 'A door anchor included'],
    search: 'resistance bands set',
  },

  // ——— Tracking ———
  {
    slug: 'sleep-tracking-ring',
    kind: 'partner',
    category: 'tracking',
    name: 'Sleep-tracking ring',
    summary: 'Shows you what your nights are really like.',
    image: 'sleep',
    why: 'Most men think they sleep fine until they see the data. A ring is the least annoying way to track sleep, and seeing the trend makes it far easier to change your evenings.',
    lookFor: ['Sleep stages and resting heart rate', 'Battery life of several days', 'Check whether a monthly subscription is required'],
    search: 'smart ring sleep tracker',
  },
  {
    slug: 'fitness-band',
    kind: 'partner',
    category: 'tracking',
    name: 'Fitness band',
    summary: 'Heart rate, recovery and a nudge to move.',
    image: 'wearable',
    why: 'A band on your wrist keeps a quiet record of how hard you trained and how well you recovered. The number matters less than the direction it is heading.',
    lookFor: ['Continuous heart-rate tracking', 'A recovery or readiness score you find easy to read', 'Comfortable enough to sleep in'],
    search: 'fitness tracker band heart rate',
  },
  {
    slug: 'blood-pressure-monitor',
    kind: 'partner',
    category: 'tracking',
    name: 'Home blood pressure monitor',
    summary: 'The most important number most men never check.',
    image: 'labs',
    why: 'High blood pressure has no symptoms until it has a big one. A home monitor costs less than a dinner out and gives your doctor far better information than one reading in the office.',
    lookFor: ['An upper-arm cuff, not a wrist model', 'Clinically validated, such as on the Hypertension Canada list', 'A cuff that fits your arm'],
    search: 'upper arm blood pressure monitor',
  },
  {
    slug: 'smart-scale',
    kind: 'partner',
    category: 'tracking',
    name: 'Smart scale',
    summary: 'For the trend line, not the daily number.',
    image: 'labs',
    why: 'Weight bounces around from day to day. A scale that logs to your phone lets you ignore the noise and watch the monthly trend.',
    lookFor: ['Automatic sync to your phone', 'Body-fat readings treated as a rough trend only', 'A wide, stable platform'],
    search: 'smart scale body composition',
  },
];

export const bySlug = (slug: string) => products.find((p) => p.slug === slug);

export function buyLink(p: Product): { href: string; label: string; affiliate: boolean } {
  if (p.url) return { href: p.url, label: `Check price at ${p.partner ?? 'our partner'}`, affiliate: true };
  return {
    href: `https://www.amazon.ca/s?k=${encodeURIComponent(p.search ?? p.name)}`,
    label: 'Find it on Amazon.ca',
    affiliate: false,
  };
}
