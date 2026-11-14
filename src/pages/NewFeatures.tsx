import { Link } from 'react-router-dom';
import { Card, PageHeader, Pill, Takeaway } from '../components/ui';

const FEATURE_IDEAS = [
  {
    title: 'One shared cabin atmosphere',
    impact: 'Mission planning',
    status: 'shipped' as const,
    blurb:
      'Let planners set oxygen, pressure, and fan speed once, then watch Will It Burn?, Risk Ranking, and the round flame all update from that same cabin—one setting, three views.',
  },
  {
    title: 'Risk cards that name the physics',
    impact: 'Risk Ranking',
    status: 'shipped' as const,
    blurb:
      'Tag each ranked study with the main freefall idea it shows (slow mixing limit, outward gas push, glow heat loss) so scores read as short physics stories, not just numbers.',
  },
  {
    title: 'Compare two habitats side-by-side',
    impact: 'Insights',
    status: 'shipped' as const,
    blurb:
      'Split-view Moon vs Mars (or station vs suit) on shared charts: chance of burning, top experiments, and which feeding mode wins when rising hot air is gone.',
  },
  {
    title: 'Guided “why it went out” walkthrough',
    impact: 'Explorer',
    status: 'shipped' as const,
    blurb:
      'On FLEX and ACME detail pages, a short path that scrubbing oxygen and heat loss walks the live flame from catching fire to going out by glowing heat loss—using the Fluid Physics models.',
  },
  {
    title: 'Analyst with physics citations',
    impact: 'Analyst',
    status: 'shipped' as const,
    blurb:
      'When the Fire Safety Analyst answers, pin the matching freefall idea (rising-air gone, fan push, Lewis, glow loss) and deep-link into that Fluid Physics panel.',
  },
  {
    title: 'Classroom lab mode',
    impact: 'Education',
    status: 'backlog' as const,
    blurb:
      'A timed lesson: morph gravity on Overview, run one heat-and-volume path, rank a lunar preset, export a one-page PDF—built for Space Apps demos and high-school classrooms.',
  },
];

const FLUID_PHYSICS_USES = [
  {
    where: 'Will It Burn?',
    to: '/',
    status: 'shipped' as const,
    idea:
      'Under the flame, show a live “how is it fed?” chip—rising plume vs slow mixing vs cabin fans—driven by the same gravity, oxygen, and flow sliders that already feed the closest-tests model.',
  },
  {
    where: 'Overview',
    to: '/overview',
    status: 'shipped' as const,
    idea:
      'Replace the gravity-only morph with a short cycle through no rising air → slow mixing → weak cabin flow so visitors feel transport before they open the full Fluid Physics tab.',
  },
  {
    where: 'Risk Ranking',
    to: '/scenarios',
    status: 'shipped' as const,
    idea:
      'Weight experiments higher when their tested fan-push / oxygen window matches the habitat’s ventilation, not only oxygen and pressure match scores.',
  },
  {
    where: 'Insights',
    to: '/insights',
    status: 'shipped' as const,
    idea:
      'Add a “physics brief” strip: expansion cooling vs steady cabin temperature, and when glow heat loss is the likely end for droplet flames.',
  },
  {
    where: 'Experiments',
    to: '/explorer',
    status: 'shipped' as const,
    idea:
      'On each study, offer “Open in Fluid Physics” presets (e.g. FLEX → glow loss / Lewis; SAFFIRE → cabin fans) so tables jump straight into the matching live sim.',
  },
  {
    where: 'Analyst',
    to: '/analyst',
    status: 'shipped' as const,
    idea:
      'Seed follow-up prompts from physics tags—“Explain outward gas push for this fuel”—so answers stay grounded in the same models shown on Fluid Physics.',
  },
  {
    where: 'Guided demo',
    to: '/fluid-physics',
    status: 'shipped' as const,
    idea:
      'Insert a Fluid Physics stop between Risk Ranking and Will It Burn? so the demo narrates why freefall flames are round before predicting catch fire.',
  },
];

export default function NewFeatures() {
  return (
    <div className="space-y-8">
      <PageHeader kicker="New features" title="Ideas to grow FlameSight—and share freefall fire physics on every screen">
        A living backlog for Team AstroGhosts: product ideas that deepen fire-safety storytelling in plain English, plus concrete ways to reuse the{' '}
        <Link to="/fluid-physics" className="text-micro-300 underline hover:text-white">Fluid Physics</Link> teaching sims across the app.
      </PageHeader>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">Feature ideas</h2>
          <Pill tone="flame">{FEATURE_IDEAS.length} concepts</Pill>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {FEATURE_IDEAS.map(f => (
            <Card key={f.title} glow={f.impact === 'Education' ? 'micro' : undefined}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-white">{f.title}</h3>
                <Pill tone="slate">{f.impact}</Pill>
                <Pill tone={f.status === 'shipped' ? 'micro' : 'amber'}>{f.status === 'shipped' ? 'Shipped' : 'Backlog'}</Pill>
              </div>
              <p className="mt-2 text-sm text-slate-300">{f.blurb}</p>
            </Card>
          ))}
        </div>
        <Takeaway>
          Prioritize ideas that share one cabin atmosphere across Will It Burn?, Risk Ranking, and Fluid Physics so physics and predictions never disagree.
        </Takeaway>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">Use fluid physics throughout the app</h2>
          <Pill tone="micro">Gases · heat · surfaces</Pill>
        </div>
        <Card glow="micro">
          <p className="text-sm text-slate-300">
            Fluid Physics already teaches freefall ideas in everyday language (no rising hot air, slow mixing, cabin fans, outward gas push) plus heat and surface effects (Lewis number, glow heat loss, surface-tension stirring), and four heat-and-volume paths.
            The next step is surfacing those same models wherever users rank risks, scrub flames, or ask the analyst—so every page speaks the same physics language.
          </p>
        </Card>
        <ul className="mt-4 space-y-3">
          {FLUID_PHYSICS_USES.map(u => (
            <li key={u.where}>
              <Card>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold text-white">{u.where}</h3>
                  <span className="flex items-center gap-2">
                    <Pill tone="micro">Shipped</Pill>
                    <Link to={u.to} className="text-xs text-micro-300 hover:underline">Open →</Link>
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-300">{u.idea}</p>
              </Card>
            </li>
          ))}
        </ul>
        <Takeaway>
          Treat Fluid Physics as the shared engine: export mechanism tags and heat-path state into Will It Burn?, Risk Ranking, Insights, Explorer, and Analyst instead of keeping the sims only on one tab.
        </Takeaway>
      </section>
    </div>
  );
}
