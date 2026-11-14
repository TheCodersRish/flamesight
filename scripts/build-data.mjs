// FlameSight data build: converts the NASA PSI CSVs in data/raw into JSON.
// Run: node scripts/build-data.mjs  (runs automatically before `npm run dev` / `npm run build`)
// Output: src/data/generated/*.json (bundled into the app) and a copy in public/data/ (open data).
// Rule: every number in the app comes from these CSVs. Nothing is invented here; where a column
// is missing we write null and the UI says "not in table".

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, 'data', 'raw');
const OUT_SRC = path.join(ROOT, 'src', 'data', 'generated');
const OUT_PUB = path.join(ROOT, 'public', 'data');
fs.mkdirSync(OUT_SRC, { recursive: true });
fs.mkdirSync(OUT_PUB, { recursive: true });

// ---------- CSV parsing (RFC4180-ish, handles quotes, BOM, CRLF, bad bytes) ----------
function parseCSV(text) {
  text = text.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(v => v.trim() !== ''));
}
function readCSV(rel) {
  const buf = fs.readFileSync(path.join(RAW, rel));
  // files are mostly utf-8; a few contain latin-1 bytes. Decode utf-8, replace invalid bytes.
  const text = new TextDecoder('utf-8', { fatal: false }).decode(buf).replace(/\uFFFD/g, '?');
  const rows = parseCSV(text);
  const header = rows[0].map(h => h.replace(/\s+/g, ' ').trim());
  return { header, rows: rows.slice(1).map(r => header.map((_, i) => (r[i] ?? '').replace(/\s+/g, ' ').trim())) };
}
const num = v => {
  if (v === undefined || v === null) return null;
  const s = String(v).replace(/[~≈]/g, '').replace(/,/g, '').trim();
  const m = s.match(/^[<>\s]*(-?\d*\.?\d+(e-?\d+)?)/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) ? n : null;
};
const round = (n, d = 3) => (n === null || n === undefined || !Number.isFinite(n) ? null : Math.round(n * 10 ** d) / 10 ** d);
const BAR_TO_ATM = 1 / 1.01325;
const MMHG_TO_ATM = 1 / 760;

// ---------- Catalog ----------
const cat = readCSV('investigations_catalog.csv');
const summaries = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'summaries.json'), 'utf8'));
const catalog = cat.rows.map(r => Object.fromEntries(cat.header.map((h, i) => [h, r[i]])));

function parseDate(s) { // MM-DD-YYYY
  const m = (s || '').match(/(\d{2})-(\d{2})-(\d{4})/);
  return m ? { iso: `${m[3]}-${m[1]}-${m[2]}`, year: +m[3] } : null;
}

// ---------- Test matrices -> normalized records + raw tables ----------
// Normalized record: { inv, id, fuel, fuelClass, o2 (mole fraction), pAtm, flow (cm/s), diluent, outcome, burn (0..1|null), note }
// burn score (used by the simulator k-NN) is defined ONLY for tables that record what the flame did:
//   1.0 = burned and kept burning / fully consumed / spread the whole sample
//   0.8 = droplet disruption (FLEX) — burned vigorously until the droplet broke apart
//   0.6 = ignited, then self-extinguished before the fuel was used up
//   0.25 = brief flash only
//   0.0 = failed to ignite / no flame spread
const tests = [];
const tables = {}; // accession -> [{ name, header, rows, kind }]
const countInfo = {}; // accession -> { count, unit, basis }
// Columns holding people's names (e.g. principal investigator) are dropped from what the app shows.
const NAME_COLS = /^(pi|principal investigator|investigator)$/i;
function addTable(acc, name, t, kind = 'per-test') {
  const keep = t.header.map((h, i) => (NAME_COLS.test(h) ? -1 : i)).filter(i => i >= 0);
  (tables[acc] ||= []).push({ name, header: keep.map(i => t.header[i]), rows: t.rows.map(r => keep.map(i => r[i])), kind });
}
function fuelClassOf(f) {
  const s = (f || '').toLowerCase();
  if (/methanol|heptane|octane|decane|dodecane|ethanol|propanol|c12h26/.test(s)) return 'liquid';
  if (/pmma|sibal|nomex|silicone|wax|candle|ultem|kapton|teflon|lampwick|pyrell|cotton|rod|film|sphere|slab|fabric/.test(s)) return 'solid';
  if (/ethane|propane|butane|methane|ethylene|propylene|ch4|c2h4|c2h6|c3h8|h2/.test(s)) return 'gas';
  if (/dust/.test(s)) return 'aerosol';
  return 'solid';
}

// PSI-69 FLEX
{
  const t = readCSV('test_matrices/PSI-69_FLEX.csv');
  addTable('PSI-69', 'FLEX test matrix', t);
  for (const r of t.rows) {
    const co2 = num(r[8]) || 0, he = num(r[9]) || 0;
    const p = num(r[5]);
    const end = r[14];
    const map = { Extinction: ['Self-extinguished (flame went out before fuel was used up)', 0.6], Disruption: ['Droplet disruption', 0.8], Completion: ['Burned out (fuel fully consumed)', 1] };
    const [outcome, burn] = map[end] || [end || null, null];
    tests.push({ inv: 'PSI-69', id: `FLEX #${r[0]} (${r[1]})`, fuel: r[4], fuelClass: 'liquid', o2: num(r[6]), pAtm: p ? round(p * MMHG_TO_ATM, 3) : null,
      flow: null, diluent: co2 > 0 ? `CO2 ${round(co2 * 100, 1)}%` : he > 0 ? `He ${round(he * 100, 1)}%` : 'N2 only', outcome, outcomeRaw: end, burn,
      extra: { d0_mm: num(r[10]), burnTime_s: num(r[13]), xCO2: co2, xHe: he, date: r[2] } });
  }
  countInfo['PSI-69'] = { count: t.rows.length, unit: 'tests', basis: 'rows in FLEX test matrix' };
}
// PSI-68 FLEX-2 (test plan, not individual tests)
{
  const t = readCSV('test_matrices/PSI-68_Flex2.csv');
  addTable('PSI-68', 'FLEX-2 test plan (fuels and condition ranges)', t, 'plan');
  countInfo['PSI-68'] = { count: t.rows.length, unit: 'fuel conditions in test plan', basis: 'test-plan rows (not individual tests)', notTests: true };
}
// PSI-159 CFI-G
{
  let n = 0;
  for (const [file, kind] of [['PSI-159_CFI-G_Normal_Flames.csv', 'Normal'], ['PSI-159_CFI-G_Inverse_Flames.csv', 'Inverse']]) {
    const t = readCSV('test_matrices/' + file);
    t.rows = t.rows.filter(r => r[3]); // drop blank spreadsheet rows
    addTable('PSI-159', `CFI-G ${kind.toLowerCase()} flames`, t);
    n += t.rows.length;
    const H = t.header;
    const ix = name => H.findIndex(h => h.toLowerCase().startsWith(name));
    const iO2 = kind === 'Normal' ? ix('xo2 before') : ix('xo2'), iP = ix('approx p'), iHot = ix('hot ignition'), iSE = ix('self'), iCool = ix('cool flame'), iCom = ix('comments');
    for (const r of t.rows) {
      const hot = (r[iHot] || '').toLowerCase(), se = r[iSE];
      let outcome, burn;
      if (hot === 'yes') { if (se === 'SE') { outcome = 'Hot flame ignited, then self-extinguished'; burn = 0.6; } else { outcome = 'Hot flame burned until flow was turned off'; burn = 1; } }
      else if (hot === 'flash') { outcome = 'Brief flash only'; burn = 0.25; }
      else if (hot === 'no') { outcome = 'No hot ignition'; burn = 0; }
      else { outcome = r[iHot] || null; burn = null; }
      const cool = iCool >= 0 && /yes/i.test(r[iCool]);
      if (cool && burn === 0) outcome = 'Cool flame only (no hot ignition)';
      const fuelRaw = r[2] || '';
      const fuel = fuelRaw.replace(/^\d+%\s*/, '');
      tests.push({ inv: 'PSI-159', id: `CFI-G ${r[3]} (${kind})`, fuel: fuel ? fuel[0].toUpperCase() + fuel.slice(1) : fuel, fuelClass: 'gas', o2: num(r[iO2]), pAtm: round(num(r[iP]) * BAR_TO_ATM, 3),
        flow: null, diluent: `${kind} flame${/%/.test(fuelRaw) ? `, fuel ${fuelRaw.split(' ')[0]} in N2` : ''}`, outcome, outcomeRaw: `${r[iHot]}/${se}`, burn,
        extra: { flameType: kind, coolFlame: cool, burnTime_s: num(r[ix('burn time')]), comments: iCom >= 0 ? r[iCom] : '' } });
    }
  }
  countInfo['PSI-159'] = { count: n, unit: 'tests', basis: 'rows in normal + inverse flame tables' };
}
// SAFFIRE I/II/III
{
  const t1 = readCSV('test_matrices/PSI-98_SAFFIRE-1.csv');
  t1.rows = t1.rows.filter(r => /^S\d/.test(r[0]));
  addTable('PSI-98', 'SAFFIRE-I samples', t1);
  for (const r of t1.rows) {
    const o = r[6].split('-').map(num).filter(v => v !== null);
    const bt = num(r[9]);
    tests.push({ inv: 'PSI-98', id: `SAFFIRE-I ${r[0]}`, fuel: r[1], fuelClass: 'solid', o2: round(o.reduce((a, b) => a + b, 0) / o.length / 100, 4), pAtm: null, flow: num(r[5]),
      diluent: `${r[10]} flow`, outcome: bt ? `Burned for ${bt} s (${r[10].toLowerCase()} flow)` : null, outcomeRaw: r[9], burn: bt ? 1 : null, extra: { thickness_cm: num(r[2]) } });
  }
  countInfo['PSI-98'] = { count: t1.rows.length, unit: 'large samples', basis: 'sample rows (flow-visualization rows excluded)' };

  const t2 = readCSV('test_matrices/PSI-99_SAFFIRE-2.csv');
  t2.rows = t2.rows.filter(r => /^2-\d/.test(r[0]));
  addTable('PSI-99', 'SAFFIRE-II samples (µg vs 1-g)', t2);
  for (const r of t2.rows) {
    const ug = r[11];
    let outcome, burn;
    if (/^~\s*0/.test(ug)) { outcome = `No flame spread in µg (burn length ~0); 1-g test: ${r[13]}`; burn = 0; }
    else if (/29 cm/.test(ug)) { outcome = `Burned full 29 cm in µg (spread ${r[12]}); 1-g test: ${r[13]}`; burn = 1; }
    else if (/note 2/.test(ug)) { outcome = 'PMMA part fully consumed; Nomex part did not ignite (table note 2)'; burn = 0.5; }
    else if (/10 cm/.test(ug)) { outcome = '~10 cm visibly damaged; flame stayed anchored at sample base (table notes 3–4)'; burn = 0.6; }
    else { outcome = ug || null; burn = null; }
    const o = (r[6] || '').split(/to/).map(num).filter(v => v !== null);
    const thick = r[2];
    tests.push({ inv: 'PSI-99', id: `SAFFIRE-II ${r[0]}`, fuel: r[1] || '(material not listed in table)', fuelClass: 'solid', o2: o.length ? round(o.reduce((a, b) => a + b, 0) / o.length / 100, 4) : null, pAtm: null, flow: num(r[5]),
      diluent: `${r[10]} flow`, outcome, outcomeRaw: ug, burn, extra: { thickness: thick, ugSpread: r[12], oneG_burn: r[13], oneG_spread: r[14] } });
  }
  countInfo['PSI-99'] = { count: t2.rows.length, unit: 'samples', basis: 'sample rows' };

  const t3 = readCSV('test_matrices/PSI-100_SAFFIRE-3.csv');
  addTable('PSI-100', 'SAFFIRE-III samples', t3);
  for (const r of t3.rows) tests.push({ inv: 'PSI-100', id: `SAFFIRE-III ${r[0]}`, fuel: r[1], fuelClass: 'solid', o2: null, pAtm: null, flow: num(r[5]), diluent: `${r[6]} flow`, outcome: null, outcomeRaw: '', burn: null, extra: { thickness: r[2] } });
  countInfo['PSI-100'] = { count: t3.rows.length, unit: 'large samples', basis: 'sample rows' };
}
// BASS & BASS-II
{
  const t = readCSV('test_matrices/PSI-26_BASS.csv');
  addTable('PSI-26', 'BASS test log', t);
  for (const r of t.rows) tests.push({ inv: 'PSI-26', id: `BASS run ${r[2]} (test ${r[3]})`, fuel: r[5], fuelClass: 'solid', o2: null, pAtm: null, flow: null, diluent: null, outcome: null, outcomeRaw: '', burn: null, extra: { date: r[0] } });
  countInfo['PSI-26'] = { count: t.rows.length, unit: 'tests', basis: 'rows in BASS test log' };
  const t2 = readCSV('test_matrices/PSI-25_BASS-II.csv');
  addTable('PSI-25', 'BASS-II test log', t2);
  for (const r of t2.rows) tests.push({ inv: 'PSI-25', id: `BASS-II ${r[1]}`, fuel: r[5], fuelClass: 'solid', o2: num(r[11]) !== null ? round(num(r[11]) / 100, 4) : null, pAtm: null, flow: null,
    diluent: null, outcome: null, outcomeRaw: '', burn: null, extra: { fanDisplay: num(r[7]), finalO2pct: num(r[12]), initialCO2pct: num(r[13]), date: r[2] } });
  countInfo['PSI-25'] = { count: t2.rows.length, unit: 'tests', basis: 'rows in BASS-II test log' };
}
// SAME, SAME-R, DAFT
{
  const a = readCSV('test_matrices/PSI-101_SAME-R.csv'); addTable('PSI-101', 'SAME-R smoke tests', a);
  for (const r of a.rows) tests.push({ inv: 'PSI-101', id: `SAME-R #${r[1]}`, fuel: r[0], fuelClass: 'solid', o2: null, pAtm: null, flow: num(r[4]), diluent: null, outcome: null, outcomeRaw: '', burn: null, extra: { description: r[2], RtR0: num(r[5]) } });
  countInfo['PSI-101'] = { count: a.rows.length, unit: 'smoke tests', basis: 'rows in SAME-R table' };
  const b = readCSV('test_matrices/PSI-102_SAME.csv'); addTable('PSI-102', 'SAME smoke tests', b);
  for (const r of b.rows) tests.push({ inv: 'PSI-102', id: `SAME sample ${r[0]}`, fuel: r[1], fuelClass: 'solid', o2: null, pAtm: null, flow: num(r[2]), diluent: null, outcome: null, outcomeRaw: '', burn: null, extra: { weightLoss_mg_min: num(r[3]) } });
  countInfo['PSI-102'] = { count: b.rows.length, unit: 'smoke tests', basis: 'rows in SAME table' };
  const d = readCSV('test_matrices/PSI-47_DAFT.csv'); addTable('PSI-47', 'DAFT sessions', d);
  countInfo['PSI-47'] = { count: d.rows.length, unit: 'sessions', basis: 'session rows' };
}
// PSI-10 Flame Design
{
  let n = 0;
  const tn = readCSV('test_matrices/PSI-10_Flame_Design_Normal_Flame.csv'); addTable('PSI-10', 'Flame Design normal flames', tn); n += tn.rows.length;
  for (const r of tn.rows) tests.push({ inv: 'PSI-10', id: `Flame Design ${r[3]} (Normal)`, fuel: r[2], fuelClass: 'gas', o2: num(r[8]), pAtm: num(r[12]), flow: null, diluent: 'Normal flame', outcome: null, outcomeRaw: '', burn: null, extra: {} });
  const ti = readCSV('test_matrices/PSI-10_Flame_Design_Inverse_Flame.csv'); addTable('PSI-10', 'Flame Design inverse flames', ti); n += ti.rows.length;
  for (const r of ti.rows) tests.push({ inv: 'PSI-10', id: `Flame Design ${r[2]} (Inverse)`, fuel: 'C2H4', fuelClass: 'gas', o2: num(r[3]), pAtm: num(r[11]), flow: null, diluent: 'Inverse flame', outcome: null, outcomeRaw: '', burn: null, extra: {} });
  countInfo['PSI-10'] = { count: n, unit: 'tests', basis: 'rows in normal + inverse flame tables' };
}
// PSI-39 CFI
{
  const t = readCSV('test_matrices/PSI-39_CFI.csv'); addTable('PSI-39', 'CFI droplet tests', t);
  for (const r of t.rows) { const he = num(r[7]) || 0; tests.push({ inv: 'PSI-39', id: `CFI FLEX #${r[0]}`, fuel: r[9], fuelClass: 'liquid', o2: num(r[5]), pAtm: num(r[4]), flow: null, diluent: he > 0 ? `He ${round(he * 100, 0)}%` : 'N2 only', outcome: null, outcomeRaw: '', burn: null, extra: {} }); }
  countInfo['PSI-39'] = { count: t.rows.length, unit: 'tests', basis: 'rows in CFI table' };
}
// PSI-107 SPICE
{
  const t = readCSV('test_matrices/PSI-107_Spice.csv'); addTable('PSI-107', 'SPICE flames', t);
  t.rows.forEach((r, i) => tests.push({ inv: 'PSI-107', id: `SPICE row ${i + 1}`, fuel: r[3], fuelClass: 'gas', o2: null, pAtm: null, flow: num(r[8]), diluent: null, outcome: null, outcomeRaw: '', burn: null, extra: { nozzle_mm: num(r[4]) } }));
  countInfo['PSI-107'] = { count: t.rows.length, unit: 'flame conditions', basis: 'rows in SPICE table' };
}
// Day-summary tables (ACME BRE, CLD, E-FIELD, s-Flame) and SLICE, PSI-142
function daySummary(acc, file, name, ignCol, extra) {
  const t = readCSV('test_matrices/' + file);
  t.rows = t.rows.filter(r => num(r[ignCol]) !== null);
  addTable(acc, name, t, 'daily');
  const n = t.rows.reduce((s, r) => s + (num(r[ignCol]) || 0), 0);
  countInfo[acc] = { count: n, unit: 'flames ignited', basis: `sum of "flames ignited" over ${t.rows.length} test days` };
  if (extra) extra(t);
}
const envelopeHints = {}; // acc -> { o2:[min,max], pAtm:[..], flow:[..], source }
daySummary('PSI-20', 'PSI-20_ACME_BRE.csv', 'ACME BRE test days', 6, t => {
  const o2s = [];
  for (const r of t.rows) for (const part of r[5].split(';')) { let v = num(part); if (v === null) continue; if (v > 100) v = v / 100; o2s.push(v / 100); }
  envelopeHints['PSI-20'] = { o2: [Math.min(...o2s), Math.max(...o2s)], o2Source: 'O2 column of BRE table',
    pAtm: [round(8.2 / 14.696, 3), round(14.7 / 14.696, 3)], pSource: 'NASA-considered atmospheres named in BRE objectives (8.2–14.7 psia); table says pressures varied but are not listed' };
});
daySummary('PSI-21', 'PSI-21_CLD_Flame.csv', 'ACME CLD Flame test days', 6);
daySummary('PSI-22', 'PSI-22_ACME_E-FIELD_Flames.csv', 'ACME E-FIELD test days', 8);
daySummary('PSI-23', 'PSI-23_ACME_s-Flame.csv', 'ACME s-Flame test days', 7, t => {
  const o2s = t.rows.flatMap(r => (r[5].match(/(\d+)%/g) || []).map(s => num(s) / 100));
  envelopeHints['PSI-23'] = { o2: [Math.min(...o2s), Math.max(...o2s)], o2Source: 'Atmosphere column (~21% / ~30% O2)', pAtm: [1, 1], pSource: 'table note: atmosphere is ~1 atm' };
});
{
  const t = readCSV('test_matrices/PSI-106_Slice.csv'); addTable('PSI-106', 'SLICE test days', t, 'daily');
  countInfo['PSI-106'] = { count: t.rows.length, unit: 'test days', basis: 'test-day rows (no per-test count in table)', notTests: true };
  const t2 = readCSV('test_matrices/PSI-142_Data_Summary_Table.csv'); addTable('PSI-142', 'PSI-142 data products', t2, 'plan');
  countInfo['PSI-142'] = { count: t2.rows.length, unit: 'data products', basis: 'analysis datasets (ground study)', notTests: true };
}
// FLEX-2 envelope from test plan
envelopeHints['PSI-68'] = { o2: [0.17, 0.30], o2Source: 'FLEX-2 test plan', pAtm: [0.5, 3.0], pSource: 'FLEX-2 test plan', flow: [0.1, 5], flowSource: 'FLEX-2 test plan' };

// ---------- PSI-117 analyzed data ----------
const psi117 = (() => {
  const t = readCSV('analyzed_data/PSI-117_PROCI_2023_C12_Extinction_Diameter_vs_pressure.csv');
  const series = (pc, vc) => t.rows.map(r => ({ p: num(r[pc]), d: num(r[vc]) })).filter(x => x.p !== null && x.d !== null);
  const k = readCSV('analyzed_data/PSI-117_MST_2024_Kavg.csv');
  return {
    source: 'PSI-117_PROCI_2023_C12_Extinction_Diameter_vs_pressure.csv; PSI-117_MST_2024_Kavg.csv',
    hotExpt: series(0, 1), hotModel: series(3, 4), coolExpt: series(6, 7), coolModel: series(9, 10),
    kavgExpt: k.rows.map(r => ({ p: num(r[1]), k: num(r[2]) })).filter(x => x.p !== null && x.k !== null),
    kbModel: k.rows.map(r => ({ p: num(r[5]), k: num(r[6]) })).filter(x => x.p !== null && x.k !== null).sort((a, b) => a.p - b.p),
  };
})();
envelopeHints['PSI-117'] = { pAtm: [0.5, 5], pSource: 'pressures in PSI-117 analyzed data files' };

// ---------- Envelopes per investigation ----------
function envelopeFor(acc) {
  const rows = tests.filter(t => t.inv === acc);
  const rng = key => { const v = rows.map(r => r[key]).filter(x => x !== null && x !== undefined && Number.isFinite(x)); return v.length ? [round(Math.min(...v), 3), round(Math.max(...v), 3)] : null; };
  const h = envelopeHints[acc] || {};
  const e = { o2: rng('o2'), pAtm: rng('pAtm'), flow: rng('flow'), sources: {} };
  if (e.o2) e.sources.o2 = 'test matrix'; if (e.pAtm) e.sources.pAtm = 'test matrix'; if (e.flow) e.sources.flow = 'test matrix';
  if (!e.o2 && h.o2) { e.o2 = h.o2.map(v => round(v, 3)); e.sources.o2 = h.o2Source; }
  if (!e.pAtm && h.pAtm) { e.pAtm = h.pAtm; e.sources.pAtm = h.pSource; }
  if (!e.flow && h.flow) { e.flow = h.flow; e.sources.flow = h.flowSource; }
  return e;
}

// ---------- Build investigations ----------
const investigations = catalog.map(c => {
  const acc = c.accession;
  const s = summaries[acc] || {};
  const st = parseDate(c.start), en = parseDate(c.end);
  const ci = countInfo[acc] || null;
  return {
    accession: acc,
    acronym: c.acronym || acc,
    hasAcronym: !!c.acronym,
    title: c.title,
    tier: num(c.fire_safety_tier),
    tierLabel: c.fire_safety_tier,
    role: c.fire_safety_role || 'Background research',
    roleGroup: (() => { const r = (c.fire_safety_role || '').toLowerCase();
      if (r.startsWith('prevention')) return 'Prevention'; if (r.startsWith('detection')) return 'Detection'; if (r.startsWith('suppression')) return 'Suppression';
      if (/high-o2|partial-gravity/.test(r)) return 'Exploration atmospheres'; if (/cool flame|extinction/.test(r)) return 'Extinction & cool flames';
      if (/model/.test(r)) return 'Modeling'; return 'Combustion fundamentals'; })(),
    subArea: c.sub_area, platform: c.platform || 'Not listed', hardware: c.hardware,
    start: st?.iso || null, end: en?.iso || null, startYear: st?.year || null, endYear: en?.year || null,
    objectives: c.objectives, keywords: c.keywords.split(';').map(k => k.trim()).filter(Boolean),
    files: num(c.files_listed_all_versions), sizeGB: num(c.total_size_GB), fileTypes: c.main_file_types,
    hasTestMatrix: c.has_test_matrix === 'yes', hasAnalyzedData: c.has_analyzed_data === 'yes' || acc === 'PSI-117',
    psiPage: c.psi_page,
    summary: s.summary || c.objectives, why: s.why || '',
    count: ci, envelope: envelopeFor(acc),
    tables: (tables[acc] || []).map(t => t.name),
  };
});

// ---------- Headline stats ----------
const flex = tests.filter(t => t.inv === 'PSI-69');
const flexCounts = flex.reduce((m, t) => (m[t.outcomeRaw] = (m[t.outcomeRaw] || 0) + 1, m), {});
const years = investigations.flatMap(i => [i.startYear, i.endYear]).filter(Boolean);
const totalGB = investigations.reduce((s, i) => s + (i.sizeGB || 0), 0);
const testsTotal = Object.values(countInfo).filter(c => !c.notTests).reduce((s, c) => s + c.count, 0);
const perTestRows = Object.entries(countInfo).filter(([, c]) => !c.notTests && c.unit !== 'flames ignited').reduce((s, [, c]) => s + c.count, 0);
const stats = {
  investigations: investigations.length,
  withTestMatrix: investigations.filter(i => i.hasTestMatrix).length,
  testsTotal, perTestRows, flamesIgnitedFromDailyTables: testsTotal - perTestRows,
  yearMin: Math.min(...years), yearMax: Math.max(...years),
  totalGB: round(totalGB, 2), totalTB: round(totalGB / 1000, 2),
  totalFiles: investigations.reduce((s, i) => s + (i.files || 0), 0),
  flex: { tests: flex.length, extinction: flexCounts.Extinction || 0, disruption: flexCounts.Disruption || 0, completion: flexCounts.Completion || 0,
    pctSelfExtinguished: round(100 * (flexCounts.Extinction || 0) / flex.length, 1) },
  countBasis: Object.fromEntries(Object.entries(countInfo).map(([k, v]) => [k, v])),
  knnPool: tests.filter(t => t.burn !== null && t.o2 !== null).length,
};

// ---------- Insights ----------
const insights = {};
// FLEX outcome by diluent
{
  const groups = {};
  for (const t of flex) { const g = t.extra.xCO2 > 0 ? 'CO2 added' : t.extra.xHe > 0 ? 'Helium added' : 'No CO2/He (O2 + N2)'; groups[g] ||= { group: g, Extinction: 0, Disruption: 0, Completion: 0, total: 0 }; groups[g][t.outcomeRaw]++; groups[g].total++; }
  const byFuel = {};
  for (const t of flex) { byFuel[t.fuel] ||= { fuel: t.fuel, Extinction: 0, Disruption: 0, Completion: 0, total: 0 }; byFuel[t.fuel][t.outcomeRaw]++; byFuel[t.fuel].total++; }
  // O2 bins: extinction share
  const o2bins = {};
  for (const t of flex) { const b = t.o2 <= 0.15 ? '≤15%' : t.o2 <= 0.18 ? '16–18%' : t.o2 <= 0.21 ? '19–21%' : '>21%'; o2bins[b] ||= { bin: b, Extinction: 0, Disruption: 0, Completion: 0, total: 0 }; o2bins[b][t.outcomeRaw]++; o2bins[b].total++; }
  insights.flex = { outcomes: [{ name: 'Self-extinguished', value: stats.flex.extinction }, { name: 'Disruption', value: stats.flex.disruption }, { name: 'Burned out', value: stats.flex.completion }],
    byDiluent: Object.values(groups), byFuel: Object.values(byFuel), byO2: ['≤15%', '16–18%', '19–21%', '>21%'].map(b => o2bins[b]).filter(Boolean),
    scatter: flex.filter(t => t.extra.burnTime_s !== null).map(t => ({ o2: round(t.o2 * 100, 1), burnTime: t.extra.burnTime_s, outcome: t.outcomeRaw, fuel: t.fuel, dil: t.extra.xCO2 > 0 ? 'CO2' : t.extra.xHe > 0 ? 'He' : 'N2' })) };
}
// BASS / BASS-II coverage
{
  const fam = f => { const s = f.toLowerCase(); if (/sibal/.test(s)) return 'SIBAL fabric'; if (/nomex/.test(s)) return 'Nomex'; if (/wax|candle/.test(s)) return 'Wax / candle'; if (/rod/.test(s)) return 'PMMA rod'; if (/sphere|spherical/.test(s)) return 'PMMA sphere'; if (/ultem/.test(s)) return 'Ultem'; if (/soot/.test(s)) return 'Cleaning run'; return 'PMMA sheet/film'; };
  const mats = {};
  for (const t of tests.filter(t => t.inv === 'PSI-26' || t.inv === 'PSI-25')) { const f = fam(t.fuel); mats[f] ||= { material: f, BASS: 0, 'BASS-II': 0 }; mats[f][t.inv === 'PSI-26' ? 'BASS' : 'BASS-II']++; }
  const b2 = tests.filter(t => t.inv === 'PSI-25' && t.o2 !== null);
  const binsB = [[0, 0.15, '<15%'], [0.15, 0.17, '15–17%'], [0.17, 0.19, '17–19%'], [0.19, 0.21, '19–21%'], [0.21, 1, '≥21%']];
  const o2Bins = binsB.map(([lo, hi, label]) => {
    const row = { bin: label, total: 0 };
    for (const t of b2) if (t.o2 >= lo && t.o2 < hi) { const f = fam(t.fuel); row[f] = (row[f] || 0) + 1; row.total++; }
    return row;
  });
  const b2all = tests.filter(t => t.inv === 'PSI-25' && t.o2 !== null);
  insights.bass = { o2Bins, belowAir: b2all.filter(t => t.o2 < 0.209).length, withO2: b2all.length, materials: Object.values(mats).sort((a, b) => (b.BASS + b['BASS-II']) - (a.BASS + a['BASS-II'])),
    o2Range: [Math.min(...b2.map(t => t.o2 * 100)), Math.max(...b2.map(t => t.o2 * 100))].map(v => round(v, 1)) };
}
// SAFFIRE-II µg vs 1-g
insights.saffire2 = tests.filter(t => t.inv === 'PSI-99').map(t => ({ id: t.id, material: t.fuel, thickness: t.extra.thickness, ug: t.outcomeRaw, ugSpread: t.extra.ugSpread, oneG: t.extra.oneG_burn, oneGSpread: t.extra.oneG_spread }));
// CFI-G normal vs inverse by O2
{
  const bins = [[0, 0.2, '<20%'], [0.2, 0.25, '20–25%'], [0.25, 0.35, '25–35%'], [0.35, 0.45, '35–45%'], [0.45, 0.6, '45–60%'], [0.6, 1.01, '>60%']];
  const rows = bins.map(([lo, hi, label]) => {
    const o = { bin: label };
    for (const k of ['Normal', 'Inverse']) {
      const g = tests.filter(t => t.inv === 'PSI-159' && t.extra.flameType === k && t.o2 !== null && t.o2 >= lo && t.o2 < hi && t.burn !== null);
      o[`${k}_n`] = g.length;
      o[`${k}_ign`] = g.length ? round(100 * g.filter(t => t.burn >= 0.6).length / g.length, 0) : null;
      o[`${k}_se`] = g.length ? round(100 * g.filter(t => t.burn === 0.6).length / g.length, 0) : null;
    }
    return o;
  });
  insights.cfig = { byO2: rows };
}
insights.psi117 = psi117;

// ---------- Fuel options for simulator ----------
const knn = tests.filter(t => t.burn !== null && t.o2 !== null).map(t => ({ inv: t.inv, id: t.id, fuel: t.fuel, fuelClass: t.fuelClass, o2: t.o2, pAtm: t.pAtm, flow: t.flow, diluent: t.diluent, outcome: t.outcome, burn: t.burn }));
const fuels = {};
for (const t of knn) { const k = t.fuel; fuels[k] ||= { fuel: k, fuelClass: t.fuelClass, n: 0, invs: new Set() }; fuels[k].n++; fuels[k].invs.add(t.inv); }
const fuelOptions = Object.values(fuels).filter(f => !/not listed/.test(f.fuel)).map(f => ({ fuel: f.fuel, fuelClass: f.fuelClass, n: f.n, invs: [...f.invs] })).sort((a, b) => b.n - a.n);

// ---------- Write ----------
const raw = Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v]));
const outputs = { 'investigations.json': investigations, 'tests.json': tests, 'tables.json': raw, 'stats.json': stats, 'insights.json': insights, 'knn.json': { pool: knn, fuels: fuelOptions } };
for (const [f, data] of Object.entries(outputs)) {
  const s = JSON.stringify(data);
  fs.writeFileSync(path.join(OUT_SRC, f), s);
  fs.writeFileSync(path.join(OUT_PUB, f), s);
}
console.log(`[flamesight data] ${investigations.length} investigations, ${tests.length} normalized test rows, ${knn.length} k-NN tests with outcomes`);
console.log(`[flamesight data] tests total ${stats.testsTotal} (per-test rows ${stats.perTestRows} + flames ignited ${stats.flamesIgnitedFromDailyTables}); years ${stats.yearMin}-${stats.yearMax}; ${stats.totalTB} TB`);
console.log(`[flamesight data] FLEX ${stats.flex.tests}: extinction ${stats.flex.extinction}, disruption ${stats.flex.disruption}, burnout ${stats.flex.completion} (${stats.flex.pctSelfExtinguished}% self-extinguished)`);
