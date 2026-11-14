import { Link } from 'react-router-dom';
import { Card, PageHeader, Pill, Takeaway } from '../components/ui';

const FEATURE_IDEAS = [
  {
    title: 'Habitat atmosphere twin',
    impact: 'Mission planning',
    blurb:
      'Let planners dial O₂, pressure, and ventilation for a cabin, then see Will It Burn?, Risk Ranking, and a spherical flame update from the same atmosphere state—one twin, three views.',
  },
  {
    title: 'Mechanism-aware risk cards',
    impact: 'Risk Ranking',
    blurb:
      'Annotate each ranked investigation with the dominant freefall mechanism it illustrates (diffusion limit, Stefan flow, radiation extinction) so scores read as physics stories, not just numbers.',
  },
  {
    title: 'Compare two habitats side-by-side',
    impact: 'Insights',
    blurb:
      'Split-view lunar vs Mars (or ISS vs suit) with shared axes: predicted burn likelihood, top experiments, and which transport regime dominates when buoyancy is gone.',
  },
  {
    title: 'Guided “why it went out” walkthrough',
    impact: 'Explorer',
    blurb:
      'On FLEX and ACME detail pages, a short path that scrubbing oxygen and heat loss walks the live flame from ignition to radiative extinction using the Fluid Physics models.',
  },
  {
    title: 'Analyst with physics citations',
    impact: 'Analyst',
    blurb:
      'When the Fire Safety Analyst answers, pin the Gr / Pe / Lewis / radiation mechanism that backs the claim and deep-link into the matching Fluid Physics panel.',
  },
  {
    title: 'Classroom lab mode',
    impact: 'Education',
    blurb:
      'A timer-boxed lesson: morph gravity on Overview, run one thermodynamic path, rank a lunar preset, export a one-page PDF—built for Space Apps demos and classrooms.',
  },
];

const FLUID_PHYSICS_USES = [
  {
    where: 'Will It Burn?',
    to: '/',
    idea:
      'Under the flame, show a live “feeding mode” chip—buoyant plume vs diffusion vs forced ventilation—driven by the same gravity, O₂, and flow sliders that already feed the k-NN model.',
  },
  {
    where: 'Overview',
    to: '/overview',
    idea:
      'Replace the gravity-only morph with a short cycle through no-buoyancy → diffusion → weak cabin flow so visitors feel transport before they open the full Fluid Physics tab.',
  },
  {
    where: 'Risk Ranking',
    to: '/scenarios',
    idea:
      'Weight experiments higher when their tested Pe / O₂ window matches the habitat’s ventilation Peclet number, not only O₂ and pressure match scores.',
  },
  {
    where: 'Insights',
    to: '/insights',
    idea:
      'Add a “physics brief” strip: adiabatic cooling vs isothermal cabin anchors, and when radiative extinction is the likely end state for droplet flames.',
  },
  {
    where: 'Experiments',
    to: '/explorer',
    idea:
      'On each investigation, offer “Open in Fluid Physics” presets (e.g. FLEX → radiation / Lewis; SAFFIRE → ventilation Pe) so tables jump straight into the matching live sim.',
  },
  {
    where: 'Analyst',
    to: '/analyst',
    idea:
      'Seed follow-up prompts from mechanism tags—“Explain Stefan flow for this fuel”—so answers stay grounded in the same models shown on Fluid Physics.',
  },
  {
    where: 'Guided demo',
    to: '/fluid-physics',
    idea:
      'Insert a Fluid Physics stop between Risk Ranking and Will It Burn? so the demo narrates why freefall flames are round before predicting ignition.',
  },
];

export default function NewFeatures() {
  return (
    <div className="space-y-8">
      <PageHeader kicker="New features" title="Ideas to grow FlameSight—and weave fluid physics through every screen">
        A living backlog for Team AstroGhosts: product ideas that deepen fire-safety storytelling, plus concrete ways to reuse the{' '}
        <Link to="/fluid-physics" className="text-micro-300 underline hover:text-white">Fluid Physics</Link> mechanisms and thermodynamic paths across the app.
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
              </div>
              <p className="mt-2 text-sm text-slate-300">{f.blurb}</p>
            </Card>
          ))}
        </div>
        <Takeaway>
          Prioritize ideas that share one atmosphere state across Will It Burn?, Risk Ranking, and Fluid Physics so physics and predictions never diverge.
        </Takeaway>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">Use fluid physics throughout the app</h2>
          <Pill tone="micro">Transport · thermo · mechanisms</Pill>
        </div>
        <Card glow="micro">
          <p className="text-sm text-slate-300">
            Fluid Physics already teaches freefall transport (no buoyancy, diffusion, ventilation, Stefan flow) and thermal/surface effects (Lewis number, radiation, Marangoni), plus adiabatic / isothermal / isochoric / polytropic paths.
            The next step is surfacing those same models wherever users rank risks, scrub flames, or ask the analyst—so every page speaks the same physics language.
          </p>
        </Card>
        <ul className="mt-4 space-y-3">
          {FLUID_PHYSICS_USES.map(u => (
            <li key={u.where}>
              <Card>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold text-white">{u.where}</h3>
                  <Link to={u.to} className="text-xs text-micro-300 hover:underline">Open →</Link>
                </div>
                <p className="mt-2 text-sm text-slate-300">{u.idea}</p>
              </Card>
            </li>
          ))}
        </ul>
        <Takeaway>
          Treat Fluid Physics as the shared engine: export mechanism tags and thermo state into Command, Scenarios, Insights, Explorer, and Analyst instead of keeping the sims siloed on one tab.
        </Takeaway>
      </section>
    </div>
  );
}
