import { investigations, stats } from '../lib/data';
import { DEFAULT_WEIGHTS, SCALES, UNKNOWN } from '../lib/scoring';
import { Card, PageHeader, SourceChip } from '../components/ui';

export default function About() {
  const basis = Object.entries(stats.countBasis).sort((a, b) => b[1].count - a[1].count);
  return (
    <div className="space-y-4">
      <PageHeader kicker="About" title="Challenge, method, limits and sources" />
      <Card>
        <h2 className="text-lg font-semibold text-white">The challenge</h2>
        <p className="mt-2 text-slate-300">NASA Space Apps 2026 — <b>Flame in Freefall: AI-Powered Fire Safety Insights from Microgravity Combustion Data</b>. Fire in microgravity has no buoyancy: flames are round, slow and blue, and they are fed only by ventilation or diffusion. Future Moon and Mars habitats will use lower pressure and more oxygen. FlameSight summarizes, ranks and interprets NASA's microgravity combustion investigations so mission planners (and students) can see which experiments matter for each habitat and what they show.</p>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-white">Data</h2>
        <p className="mt-2 text-slate-300">All data comes from NASA's Physical Sciences Informatics repository (<a className="underline" href="https://psi.nasa.gov" target="_blank" rel="noreferrer">psi.nasa.gov</a>): the catalog of {stats.investigations} Combustion Science investigations, test tables for {stats.withTestMatrix} of them, and PSI-117 analyzed results. A build script (<code className="font-mono text-xs">scripts/build-data.mjs</code>) converts the CSVs into JSON with a normalizer per table, because every table has different headers. Values are not invented; where a table has no value we show “not in table”.</p>
        <ul className="mt-3 grid gap-1 text-sm text-slate-300 md:grid-cols-2">
          <li>• <b>{stats.testsTotal.toLocaleString()}</b> test records = {stats.perTestRows.toLocaleString()} per-test table rows + {stats.flamesIgnitedFromDailyTables.toLocaleString()} flames ignited listed in ACME daily logs (BRE, CLD, E-FIELD, s-Flame)</li>
          <li>• FLEX: <b>{stats.flex.tests}</b> tests — {stats.flex.extinction} extinction, {stats.flex.disruption} disruption, {stats.flex.completion} burnout ({stats.flex.pctSelfExtinguished}% self-extinguished)</li>
          <li>• Mission dates {stats.yearMin}–{stats.yearMax}; {stats.totalTB} TB and {stats.totalFiles.toLocaleString()} files listed in PSI</li>
          <li>• {stats.knnPool} tests record what the flame did and power the simulator</li>
        </ul>
        <details className="mt-3 text-sm text-slate-300"><summary className="cursor-pointer text-micro-300">How each investigation's test count was counted</summary>
          <ul className="mt-2 space-y-1 text-xs">{basis.map(([acc, c]) => <li key={acc}><SourceChip acc={acc} compact /> {c.count.toLocaleString()} {c.unit} — {c.basis}{c.notTests ? ' (not added to the total)' : ''}</li>)}</ul>
        </details>
      </Card>
      <Card>
        <h2 id="scoring" className="text-lg font-semibold text-white">Scenario scoring formula</h2>
        <p className="mt-2 rounded-lg bg-white/5 p-3 font-mono text-sm text-slate-100">score = 100 × (w_O₂·s_O₂ + w_P·s_P + w_flow·s_flow + w_role·s_role + w_data·s_data) ÷ Σw</p>
        <ul className="mt-3 space-y-1 text-sm text-slate-300">
          <li>• Default weights: O₂ {DEFAULT_WEIGHTS.o2}, pressure {DEFAULT_WEIGHTS.pressure}, flow {DEFAULT_WEIGHTS.flow}, role {DEFAULT_WEIGHTS.role}, data {DEFAULT_WEIGHTS.data} (adjustable on the Risk Ranking page). The Spacesuit preset defaults to O₂ 40, pressure 25, flow 5, role 15, data 15 because suit airflow is only an assumption.</li>
          <li>• Match parts are 1.0 inside the tested range, e^(−distance/scale) outside (scale = the larger of {SCALES.o2 * 100} O₂ points / {SCALES.pAtm} atm / {SCALES.flow} cm/s and 25% of the habitat value), and {UNKNOWN} when the table lacks that variable.</li>
          <li>• Role: tier 1 = 1.0, 2 = 0.7, 3 = 0.4, +0.2 if the role is a priority for that habitat. Tiers are our team's judgment, not NASA's.</li>
          <li>• Data richness: 0.7·log₁₀(1+tests)/log₁₀(701) + 0.15 (test table) + 0.15 (analyzed data).</li>
        </ul>
        <h2 id="model" className="mt-5 text-lg font-semibold text-white">“Will It Burn?” model</h2>
        <p className="mt-2 text-sm text-slate-300">k-nearest neighbors (k = 7) over FLEX, ACME CFI-G and SAFFIRE-I/II tests that record an outcome. Distance uses O₂ (per 10 points), log-pressure (per factor of 2), airflow (per 15 cm/s), fuel match (same fuel 0, same class 1.0, other 1.5) and suppressant gas. Each test has a burn score (1 kept burning · 0.8 droplet disruption · 0.6 ignited then self-extinguished · 0.5 partial · 0.25 flash · 0 no ignition/spread). The prediction is 80% the distance-weighted neighbor score and 20% a simple physics prior (50% when the inputs are outside the tested O₂ or pressure range) (more O₂, buoyancy and forced flow feed flames; CO₂/He suppresses). Likely ≥ 62, Borderline 38–62, Unlikely &lt; 38. Confidence falls when neighbors disagree, are far away, or the conditions are outside the data.</p>
        <h2 className="mt-5 text-lg font-semibold text-white">Fire Safety Analyst</h2>
        <p className="mt-2 text-sm text-slate-300">Local BM25 retrieval over the catalog and computed facts, plus oxygen and pressure matching, entirely in the browser. The short answer is written from those NASA passages on the device. No API key is required.</p>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-white">Data limits (please read)</h2>
        <ul className="mt-2 space-y-1 text-sm text-slate-300">
          <li>• <b>No partial-gravity combustion data exists in PSI.</b> Moon and Mars results are extrapolated from microgravity data and labeled as such. ACME E-FIELD (PSI-22) is the closest buoyancy proxy.</li>
          <li>• The highest O₂ in any PSI test is 85% (ACME CFI-G). Spacesuit conditions (100% O₂ at 4.3 psi) are beyond the data.</li>
          <li>• BASS and BASS-II tables list materials and conditions but not flame-spread rates; BASS has no O₂/flow columns.</li>
          <li>• Several ACME tables are daily summaries (flames ignited per day), not per-test rows. FLEX-2's table is a test plan.</li>
          <li>• Habitat airflow values are assumptions (20 cm/s, the SAFFIRE test flow; 5 cm/s for suits). Mars atmosphere is assumed equal to the lunar preset.</li>
          <li>• The flame animation is illustrative, not a combustion simulation. FlameSight is an educational tool, not a safety certification.</li>
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
        <p className="mt-3 text-xs text-slate-500">Not affiliated with or endorsed by NASA. No NASA logos are used.</p>
      </Card>
    </div>
  );
}
