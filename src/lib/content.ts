/**
 * Central content layer for the Train with Mills coaching site.
 * Everything here is placeholder-friendly copy designed to convert - swap in
 * real details (prices, photos) without touching components.
 */

export const brand = {
  name: "Train with Mills",
  full: "Train with Mills",
  tagline: "Strength, refined.",
  // The single job of the site: get the right women to book a free consult.
  primaryCta: { label: "Book a free consult", href: "/contact" },
  secondaryCta: { label: "View the plans", href: "/services" },
  email: "millie@trainwithmills.co.uk",
  instagram: "@movewithmills.1",
  instagramUrl: "https://www.instagram.com/movewithmills.1/",
  tiktok: "@movewithmills",
  tiktokUrl: "https://www.tiktok.com/@movewithmills",
  location: "Online - coaching women worldwide",
};

export type NavLink = { label: string; href: string };

export const navLinks: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Plans & Services", href: "/services" },
  { label: "Contact", href: "/contact" },
];

export type Pillar = {
  icon: "dumbbell" | "habits" | "portal" | "safe";
  title: string;
  blurb: string;
  points: string[];
};

export const pillars: Pillar[] = [
  {
    icon: "dumbbell",
    title: "Training built around you",
    blurb:
      "Programming personalised to your body, your equipment and your week - and rewritten as you get stronger. Never a recycled template.",
    points: [
      "A plan personalised to your level & equipment",
      "Weekly check-ins and video form reviews",
      "Progresses at a pace that challenges, never overwhelms",
    ],
  },
  {
    icon: "habits",
    title: "Habits that actually stick",
    blurb:
      "Practical, flexible habit coaching and real accountability - built to outlast motivation, with none of the all-or-nothing food rules.",
    points: [
      "Simple daily habits & trackers, not crash diets",
      "Flexible enough for eating out and real life",
      "Accountability that keeps you consistent",
    ],
  },
  {
    icon: "portal",
    title: "Everything in your portal",
    blurb:
      "Your plan, progress, check-ins and chat in one private space - train, log and track without a single spreadsheet.",
    points: [
      "Your live training plan & full history",
      "Progress charts, PRs and weekly check-ins",
      "Forms and direct messaging with me",
    ],
  },
  {
    icon: "safe",
    title: "A women-only safe space",
    blurb:
      "Judgement-free coaching where every question is welcome and every win - however small - gets celebrated. Just you, supported.",
    points: [
      "Women-only, shame-free and patient",
      "Direct access to me, not a bot",
      "Every small win celebrated",
    ],
  },
];

export type Step = { n: string; title: string; blurb: string };

export const processSteps: Step[] = [
  {
    n: "01",
    title: "Book your free consult",
    blurb:
      "A relaxed 30-minute call. We talk through your goals, your history, and whether we're the right fit - zero pressure.",
  },
  {
    n: "02",
    title: "Get your tailored plan",
    blurb:
      "Within 72 hours you receive a training plan built specifically for you, your equipment and your week.",
  },
  {
    n: "03",
    title: "Get coached, every step",
    blurb:
      "Weekly check-ins, form reviews and on-demand support keep you accountable - and keep the plan evolving as you do.",
  },
];

export type Testimonial = {
  quote: string;
  name: string;
  detail: string;
  result: string;
  initials: string;
};

// NOTE: placeholder testimonials still used by the About page until that page
// is reworked. Not shown on the home page.
export const testimonials: Testimonial[] = [
  {
    quote:
      "I'd never touched a barbell in my life. Six months in I'm deadlifting my bodyweight and, for the first time, I actually like training. Millie made it feel possible.",
    name: "Hannah R.",
    detail: "Marketing manager, 29",
    result: "First barbell deadlift in 6 months",
    initials: "HR",
  },
  {
    quote:
      "The nutrition side changed everything. No more all-or-nothing. I eat out, I have wine, and I've still lost weight and kept it off for a year.",
    name: "Priya N.",
    detail: "New mum, 34",
    result: "Sustained for 12 months",
    initials: "PN",
  },
  {
    quote:
      "What sets Millie apart is the attention. Every check-in feels personal. I never feel like one of a hundred clients - I feel coached.",
    name: "Sofia M.",
    detail: "Founder, 31",
    result: "Down 2 dress sizes, energy back",
    initials: "SM",
  },
];

export type Tier = {
  name: string;
  /** Drives the client's nutrition tier across the portal. */
  nutritionTier: "student" | "beginner" | "performance";
  /** How the plan is paid for - drives the Stripe checkout mode. */
  billing: "one-off" | "subscription";
  price: string;
  cadence: string;
  summary: string;
  features: string[];
  cta: { label: string; href: string };
  featured?: boolean;
  note?: string;
};

export const tiers: Tier[] = [
  {
    name: "Strong Girl Project",
    nutritionTier: "performance",
    billing: "one-off",
    price: "£79",
    cadence: "6-week programme",
    summary:
      "Six weeks of getting strong together - a small group of women training, learning and celebrating every win.",
    features: [
      "Structured 6-week programme, 3 sessions a week",
      "Progressive overload with exercise demonstrations",
      "Form reviews from me",
      "Weekly group check-in call with me & a mini lesson each week",
      "Message me directly & the group chat",
      "Leaderboard to share your successes",
      "Progress tracking in your own portal",
      "Nutritional guidance & meal ideas",
      "Habit tracking",
      "End-of-programme review & advice for what's next",
      "Groups capped at 12 so nobody gets lost",
    ],
    cta: {
      label: "Join the Project",
      href: "/contact",
    },
    featured: true,
    note: "Most popular",
  },
  {
    name: "Your Strong Era",
    nutritionTier: "performance",
    billing: "subscription",
    price: "£129",
    cadence: "per month",
    summary:
      "Fully personal coaching built around your life - your programme, your schedule, and me in your corner.",
    features: [
      "Fully individual programme, adjusted to your schedule",
      "Direct access to me",
      "Optional monthly review call, booked when it suits you",
      "Full progress tracking",
      "Nutrition guidance & targets",
      "Habit tracking & meal ideas",
      "Menstrual cycle considerations",
      "Event preparation support",
      "Form reviews whenever you need them",
    ],
    cta: {
      label: "Start Your Strong Era",
      href: "/contact",
    },
  },
];

export type Faq = { q: string; a: string };

export const faqs: Faq[] = [
  {
    q: "I'm a complete beginner - is this right for me?",
    a: "It's built for you. Most of my clients start having never followed a structured program. Every plan begins exactly where you are and progresses at a pace that feels challenging but never overwhelming.",
  },
  {
    q: "Will lifting weights make me bulky?",
    a: "No. Building noticeable muscle mass takes years of dedicated effort and surplus eating. What strength training actually does is create the lean, toned, strong shape most women are after - while making you feel powerful.",
  },
  {
    q: "How much time do I need each week?",
    a: "Most clients train 3-4 times a week for 45-60 minutes. Short on time? We design around it. The plan fits your life - not the other way around.",
  },
  {
    q: "Do I need a gym, or can I train at home?",
    a: "Either works. During your consult we map your available equipment and build the plan around it, whether that's a full gym or a pair of dumbbells in your living room.",
  },
  {
    q: "What if it's not for me?",
    a: "Your first consult is completely free and there's no obligation. The Strong Girl Project is a single 6-week commitment, and Your Strong Era rolls monthly with no long lock-in - most clients happily stay far longer than they planned.",
  },
];

export const credentials = [
  "Level 2 Fitness Instructor",
  "MSci Sport and Exercise Science Student",
  "National Level Athlete",
];

// NOTE: placeholder stats still used by the About page until that page is reworked.
export const aboutHighlights = [
  { value: "Level 2", label: "qualified instructor" },
  { value: "MSci", label: "sport science student" },
  { value: "100%", label: "online & flexible" },
];
