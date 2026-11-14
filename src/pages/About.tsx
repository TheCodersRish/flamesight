import { investigations, stats } from '../lib/data';
import { DEFAULT_WEIGHTS, SCALES, UNKNOWN } from '../lib/scoring';
import { Card, PageHeader, SourceChip } from '../components/ui';

export default function About() {
  const basis = Object.entries(stats.countBasis).sort((a, b) => b[1].count - a[1].count);
  return (
    <div className="space-y-4">
      <PageHeader kicker="About" title="The challenge, how we work, limits, and sources">
        Written so students and mission planners can both follow: everyday language first, with the formulas kept for transparency.
      </PageHeader>
      <Card>
        <h2 className="text-lg font-semibold text-white">The challenge</h2>
        <p className="mt-2 text-slate-300">NASA Space Apps 2026 — <b>Flame in Freefall: AI-Powered Fire Safety Insights from Microgravity Combustion Data</b>. In near-zero gravity there is no rising hot air: flames are round, slow, and blue, and they get oxygen only from cabin fans or slow mixing. Future Moon and Mars homes will use lower pressure and more oxygen. FlameSight summarizes, ranks, and explains NASA's freefall fire studies so you can see which experiments matter for each habitat—and what they actually showed.</p>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-white">Data</h2>
        <p className="mt-2 text-slate-300">All numbers come from NASA's Physical Sciences Informatics library (<a className="underline" href="https://psi.nasa.gov" target="_blank" rel="noreferrer">psi.nasa.gov</a>): the catalog of {stats.investigations} Combustion Science studies, test tables for {stats.withTestMatrix} of them, and PSI-117 analyzed results. A build script (<code className="font-mono text-xs">scripts/build-data.mjs</code>) turns the CSVs into JSON—each table needs its own cleanup because headers differ. We do not invent values; missing cells show as “not in table.”</p>
        <ul className="mt-3 grid gap-1 text-sm text-slate-300 md:grid-cols-2">
          <li>• <b>{stats.testsTotal.toLocaleString()}</b> test records = {stats.perTestRows.toLocaleString()} per-test table rows + {stats.flamesIgnitedFromDailyTables.toLocaleString()} flames lit in ACME daily logs (BRE, CLD, E-FIELD, s-Flame)</li>
          <li>• FLEX: <b>{stats.flex.tests}</b> tests — {stats.flex.extinction} went out alone, {stats.flex.disruption} disrupted, {stats.flex.completion} burned out ({stats.flex.pctSelfExtinguished}% went out on their own)</li>
          <li>• Mission dates {stats.yearMin}–{stats.yearMax}; {stats.totalTB} TB and {stats.totalFiles.toLocaleString()} files listed in PSI</li>
          <li>• {stats.knnPool} tests record what the flame did and power the simulator</li>
        </ul>
        <details className="mt-3 text-sm text-slate-300"><summary className="cursor-pointer text-micro-300">How each investigation's test count was counted</summary>
          <ul className="mt-2 space-y-1 text-xs">{basis.map(([acc, c]) => <li key={acc}><SourceChip acc={acc} compact /> {c.count.toLocaleString()} {c.unit} — {c.basis}{c.notTests ? ' (not added to the total)' : ''}</li>)}</ul>
        </details>
      </Card>
      <Card>
        <h2 id="scoring" className="text-lg font-semibold text-white">Scenario scoring (plain English + formula)</h2>
        <p className="mt-2 text-sm text-slate-300">In plain English: we mix five ingredients—oxygen match, pressure match, airflow match, fire-safety role, and how much data the study has—then turn that mix into a 0–100 score. You can change the ingredient weights on Risk Ranking.</p>
        <p className="mt-2 rounded-lg bg-white/5 p-3 font-mono text-sm text-slate-100">score = 100 × (w_O₂·s_O₂ + w_P·s_P + w_flow·s_flow + w_role·s_role + w_data·s_data) ÷ Σw</p>
        <ul className="mt-3 space-y-1 text-sm text-slate-300">
          <li>• Default weights: oxygen {DEFAULT_WEIGHTS.o2}, pressure {DEFAULT_WEIGHTS.pressure}, flow {DEFAULT_WEIGHTS.flow}, role {DEFAULT_WEIGHTS.role}, data {DEFAULT_WEIGHTS.data}. The Spacesuit preset favors oxygen and pressure (40 / 25 / 5 / 15 / 15) because suit airflow is only an assumption.</li>
          <li>• Match parts are 1.0 inside the tested range, fade smoothly outside (scale = the larger of {SCALES.o2 * 100} oxygen points / {SCALES.pAtm} atmospheres / {SCALES.flow} cm/s and 25% of the habitat value), and {UNKNOWN} when the table lacks that variable.</li>
          <li>• Role: tier 1 = 1.0, 2 = 0.7, 3 = 0.4, +0.2 if that role is a priority for the habitat. Tiers are our team's judgment, not NASA's.</li>
          <li>• Data richness: 0.7·log₁₀(1+tests)/log₁₀(701) + 0.15 (test table) + 0.15 (analyzed data).</li>
        </ul>
        <h2 id="model" className="mt-5 text-lg font-semibold text-white">“Will It Burn?” model</h2>
        <p className="mt-2 text-sm text-slate-300">In plain English: we find the seven closest NASA tests (FLEX, ACME CFI-G, SAFFIRE-I/II) that recorded what the flame did, then blend their outcomes with a simple physics check. More oxygen, rising hot air, and fan flow tend to feed flames; carbon dioxide and helium tend to quiet them. Likely ≥ 62, Borderline 38–62, Unlikely &lt; 38. Confidence falls when neighbors disagree, are far away, or your settings sit outside the measured data.</p>
        <p className="mt-2 text-sm text-slate-400">Details: distance uses oxygen (per 10 points), log-pressure (per factor of 2), airflow (per 15 cm/s), fuel match, and extra gas. Burn scores: 1 kept burning · 0.8 droplet disruption · 0.6 ignited then went out · 0.5 partial · 0.25 flash · 0 no catch / no spread. Prediction = 80% neighbor blend + 20% physics check (50% when outside tested oxygen or pressure).</p>
        <h2 className="mt-5 text-lg font-semibold text-white">Fire Safety Analyst</h2>
        <p className="mt-2 text-sm text-slate-300">Your browser finds matching NASA studies and answers from those notes—no big model download on the device. On the live site, FlameSight then asks Gemini through the <code className="rounded bg-white/10 px-1 font-mono text-xs">/api/ask</code> function (the key stays on the server). If that AI call fails, you still get the NASA-notes answer.</p>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-white">Data limits (please read)</h2>
        <ul className="mt-2 space-y-1 text-sm text-slate-300">
          <li>• <b>PSI has no Moon/Mars-gravity fire tables.</b> Those results are estimated from near-zero-gravity data and labeled that way. ACME E-FIELD (PSI-22) is the closest rising-hot-air stand-in.</li>
          <li>• The highest oxygen in any PSI test is 85% (ACME CFI-G). Spacesuit conditions (100% oxygen at 4.3 pounds per square inch) sit beyond the data.</li>
          <li>• BASS and BASS-II list materials and conditions but not how fast flames spread; BASS has no oxygen/flow columns.</li>
          <li>• Several ACME tables are daily summaries (flames lit per day), not one-row-per-test. FLEX-2's table is a test plan.</li>
          <li>• Habitat airflow values are assumptions (20 cm/s from SAFFIRE; 5 cm/s for suits). Mars air is assumed equal to the lunar preset.</li>
          <li>• The flame animation is a teaching picture, not a real fire simulation. FlameSight is for learning—not a safety certificate.</li>
        </ul>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-white">Sources</h2>
        <p className="mt-2 text-sm text-slate-300">NASA Physical Sciences Informatics — <a className="underline" href="https://psi.nasa.gov" target="_blank" rel="noreferrer">psi.nasa.gov</a>. Each investigation:</p>
        <div className="mt-2 flex flex-wrap gap-1">{investigations.map(i => <SourceChip key={i.accession} acc={i.accession} />)}</div>
        <p className="mt-3 text-sm text-slate-300">Atmosphere references: ISS ≈ 21% O₂ at 14.7 psi; spacesuit 100% O₂ at 4.3 psi; Moon base likely 30%+ O₂ at ≤10.2 psi (challenge brief); 14.7 psia/21%, 10.2 psia/26.5%, 8.2 psia/34% (ACME BRE objectives, PSI-20).</p>
      </Card>
      <Card glow="flame">
        <h2 className="text-lg font-semibold text-white">AI tools disclosure</h2>
        <p className="mt-2 text-slate-200">Built with AI assistance (Hark, Cursor) — credited per Space Apps rules.</p>
        <p className="mt-1 text-sm text-slate-400">AI helped write code and draft the plain-English summaries from NASA's objectives text; the team reviewed them against the data. All numbers are computed from NASA PSI files by the build script.</p>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-white">Team</h2>
        <p className="mt-2 text-slate-300">Team AstroGhosts, NASA Space Apps 2026 (Dallas local event).</p>
        <p className="mt-2 text-sm text-slate-300">Live site: <a className="underline text-micro-300 hover:text-white" href="https://flamesight.vercel.app" target="_blank" rel="noreferrer">https://flamesight.vercel.app</a></p>
        <p className="mt-3 text-xs text-slate-500">Not affiliated with or endorsed by NASA. No NASA logos are used.</p>
      </Card>
    </div>
  );
}
