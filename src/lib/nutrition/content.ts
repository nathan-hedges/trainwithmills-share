/**
 * Evergreen nutrition education content shown on the Learn tab.
 * General science that rarely changes -fixed, not coach-editable.
 */

export interface Article {
  title: string;
  body: string;
}

export const proteinEducation: Article[] = [
  {
    title: "Why protein matters most",
    body: "Protein repairs and builds the muscle you train, keeps you fuller for longer, and has the highest 'thermic effect' - your body burns more digesting it than carbs or fat.",
  },
  {
    title: "Spread it through the day",
    body: "Your body can only use so much protein at once. Aim for 25–40g across 3–4 meals rather than one big hit, to maximise muscle repair.",
  },
  {
    title: "Hitting your number on a budget",
    body: "Eggs, tinned fish, beans, Greek yoghurt, milk and frozen chicken are all cheap, high-protein staples. You don't need supplements to get there.",
  },
];

export interface Nutrient {
  name: string;
  icon: "iron" | "calcium" | "vitd" | "omega3";
  why: string;
  sources: string;
}

export const femaleHealth: Nutrient[] = [
  {
    name: "Iron",
    icon: "iron",
    why: "Women lose iron monthly, and low iron is a common cause of fatigue and poor training performance.",
    sources: "Red meat, tinned tuna, beans, spinach (pair with vitamin C to absorb it).",
  },
  {
    name: "Calcium",
    icon: "calcium",
    why: "Essential for bone density - especially important for women as bone strength matters more with age.",
    sources: "Dairy, fortified plant milks, yoghurt, leafy greens, tinned fish with bones.",
  },
  {
    name: "Vitamin D",
    icon: "vitd",
    why: "Supports bone health, immunity and mood. Most people in the UK are low, particularly in winter.",
    sources: "Sunlight, oily fish, eggs, fortified foods - a daily supplement is often recommended.",
  },
  {
    name: "Omega-3",
    icon: "omega3",
    why: "Supports heart health, recovery and hormonal balance, and helps manage inflammation from hard training.",
    sources: "Salmon, mackerel, sardines, walnuts, chia and flax seeds.",
  },
];
