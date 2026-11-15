/** User-facing changelog. Newest first. */

export type ChangelogEntry = {
  date: string;
  title: string;
  items: string[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: '2026-11-15',
    title: 'Custom materials & AI polish',
    items: [
      'Will It Burn can use custom materials matched to past NASA tests.',
      'FlameSight AI pill and cleaner chat formatting; open-page asks appear as a big popup.',
      'AI stays off the Overview page so the big picture stays clear.',
      'Dashboard sections scroll independently.',
    ],
  },
  {
    date: '2026-11-15',
    title: 'Mission tools & study detail',
    items: [
      'Gap finder, mission PDF reports, habitat/experiment compare, NTRS papers, and case studies on Test next.',
      'NASA study rows open in a side-by-side simplified / full view.',
      'AI can see your workspace, ask before opening pages, and jump to screens on request.',
      'Snappier micro-animations across the app.',
    ],
  },
  {
    date: '2026-11-15',
    title: 'Search, ranking & chat',
    items: [
      'Long NASA study searches use AI to find better matches.',
      'Clickable PSI table rows with detail popup and floating AI chat.',
      'Risk Ranking page made clearer and easier to use.',
      'Streaming answers so chat replies are not cut off mid-way; collapsible side menu.',
    ],
  },
  {
    date: '2026-11-14',
    title: 'Mission workspace',
    items: [
      'Dashboard turned into a story-style mission workspace with a polished menu bar.',
      'Overview tab added alongside the fire-safety Dashboard.',
      'Unified FlameSight into one freefall fire-safety experience.',
      'Fluid Physics and Insights rewritten for high-school clarity.',
    ],
  },
  {
    date: '2026-11-14',
    title: 'Physics, reports & analyst',
    items: [
      'Fluid Physics tab with freefall flame sims (adiabatic, isothermal, isochoric, polytropic).',
      'Downloadable structured PDF reports and plain-English summaries.',
      'Hosted analyst AI via Vercel /api/ask (and OpenRouter where configured).',
      'Charts for all four Insights labels from NASA data; custom scenarios on Risk Ranking.',
    ],
  },
  {
    date: '2026-11-14',
    title: 'First release',
    items: [
      'FlameSight launched for the NASA Space Apps fire-safety challenge.',
      'Side menu on every page; Will It Burn, Insights, Rank risks, Browse tests, and Ask a question.',
    ],
  },
];
