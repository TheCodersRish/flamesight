import type { InsightId } from './burnSession';
import { insights } from './data';
import type { SimInput, SimResult } from './knn';
import { GRAVITY, psiToAtm } from './scenarios';

export interface InsightBrief {
  headline: string;
  points: string[];
  action: string;
}

const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);

function flexO2(o2pct: number) {
  const bins = insights.flex.byO2;
  if (o2pct <= 15) return bins.find(b => b.bin.startsWith('≤'));
  if (o2pct <= 18) return bins.find(b => b.bin.startsWith('16'));
  if (o2pct <= 21) return bins.find(b => b.bin.startsWith('19'));
  return bins.find(b => b.bin.startsWith('>'));
}

function cfigBin(o2pct: number) {
  const rows = insights.cfig.byO2;
  const bin = o2pct < 20 ? '<20%' : o2pct <= 25 ? '20–25%' : o2pct <= 35 ? '25–35%' : o2pct <= 45 ? '35–45%' : o2pct <= 60 ? '45–60%' : '>60%';
  return rows.find(r => r.bin === bin);
}

function num(v: string | number | null | undefined): number {
  return typeof v === 'number' ? v : Number(v) || 0;
}

function nearestDiameter(points: { p: number; d: number }[], atm: number) {
  if (!points.length) return null;
  return points.reduce((best, p) => Math.abs(p.p - atm) < Math.abs(best.p - atm) ? p : best);
}

export function briefFor(id: InsightId, x: SimInput, result: SimResult): InsightBrief {
  const o2 = Math.round(x.o2 * 100);
  const gas = x.diluent === 'CO2' ? 'CO₂' : x.diluent === 'He' ? 'helium' : 'no suppressant gas';
  const gravity = GRAVITY[x.gravity].extrapolated
    ? `${GRAVITY[x.gravity].label} is not in the NASA tables, so this chart is from microgravity tests.`
    : 'These tests were run in microgravity, the same gravity you set.';
  const score = `Will It Burn calls this ${result.verdict.toLowerCase()} (${Math.round(result.p * 100)}/100, ${result.confidenceLabel.toLowerCase()} confidence).`;
  const none = insights.flex.byDiluent.find(d => d.group.startsWith('No'))!;
  const co2 = insights.flex.byDiluent.find(d => d.group.startsWith('CO2'))!;
  const he = insights.flex.byDiluent.find(d => d.group.startsWith('Helium'))!;
  const yours = x.diluent === 'CO2' ? co2 : x.diluent === 'He' ? he : none;

  if (id === 'cfig') {
    const row = cfigBin(o2);
    const lo = insights.cfig.byO2.find(r => r.bin === '20–25%');
    const hi = insights.cfig.byO2.find(r => r.bin === '35–45%');
    const suit = insights.cfig.byO2.find(r => r.bin === '>60%');
    const aboveBass = o2 > insights.bass.o2Range[1];
    const inBin = row ? `Your ${o2}% oxygen falls in the ${row.bin} bin, where ${num(row.Normal_n) ? `${num(row.Normal_ign)}% of ${num(row.Normal_n)} normal-flame tests ignited` : 'normal flames were not tested'}.` : `No CFI-G bin matches ${o2}% oxygen.`;
    return {
      headline: o2 > 85 ? `${o2}% oxygen is past every NASA test` : row && num(row.Normal_n) ? `At ${o2}% oxygen, ${num(row.Normal_ign)}% of normal-flame tests ignited` : `${o2}% oxygen is where fires start more easily`,
      points: [
        score,
        inBin,
        `For comparison, normal flames ignited in ${num(lo?.Normal_ign)}% of tests at 20–25% oxygen and ${num(hi?.Normal_ign)}% at 35–45%.`,
        o2 > 45
          ? `Inverse flames ignited in ${num(suit?.Inverse_ign)}% of ${num(suit?.Inverse_n)} tests above 60% oxygen. Normal flames were not tested that high.`
          : aboveBass
            ? `BASS-II never tested solids above ${insights.bass.o2Range[1]}% oxygen, so cabin materials are not screened at ${o2}%.`
            : `BASS-II tested solids up to ${insights.bass.o2Range[1]}% oxygen, so ${o2}% is inside that range. Use this chart for ignition, and the solids chart for whether a material keeps burning.`,
        gravity,
      ],
      action: o2 > 85
        ? 'Treat a pure-oxygen suit as outside the data. The closest evidence is ACME CFI-G, which stops at 85% oxygen.'
        : aboveBass
          ? `Screen solids at ${o2}% oxygen. BASS-II cannot answer that, and CFI-G says ignition gets easier as oxygen rises.`
          : `CFI-G is the ignition evidence at ${o2}% oxygen. Check a solid on the solids chart before treating an Earth test as enough.`,
    };
  }

  if (id === 'psi117') {
    const atm = psiToAtm(x.psi);
    const hot = nearestDiameter(insights.psi117.hotExpt, atm);
    const cool = nearestDiameter(insights.psi117.coolExpt, atm);
    return {
      headline: `${x.psi.toFixed(1)} psi changes how a fuel fire ends, more than whether it starts`,
      points: [
        score,
        `Your pressure is ${atm.toFixed(2)} atm. The nearest hot-flame measurement went out at ${hot ? `${hot.d} mm and ${hot.p} atm` : 'an unlisted size'}.`,
        `The nearest cool flame lasted down to ${cool ? `${cool.d} mm at ${cool.p} atm` : 'an unlisted size'}. Cool flames get smaller as pressure rises, so a low-pressure cabin can leave a flame that is hard to see.`,
        gravity,
      ],
      action: atm < 0.9
        ? 'In a low-pressure cabin, plan for a cool flame that continues after the bright flame is gone. Detectors and suppression should not stop at the first visible flame-out.'
        : 'Hot-flame size barely changes with pressure. Use this chart when the question is how the fire ends, not whether it ignites.',
    };
  }

  if (id === 'bass') {
    const sibal = insights.saffire2.filter(s => /SIBAL/i.test(s.material));
    const sil = insights.saffire2.filter(s => /Silicone/i.test(s.material));
    const named = /sibal|silicone|pmma|cotton|nomex|fabric/i.test(x.fuel) ? x.fuel : 'a solid';
    const above = o2 > insights.bass.o2Range[1];
    return {
      headline: above
        ? `${named} at ${o2}% oxygen is above the BASS-II range`
        : `${named} should be checked against SAFFIRE, not only an Earth test`,
      points: [
        score,
        `BASS-II tested solids from ${insights.bass.o2Range[0]}% to ${insights.bass.o2Range[1]}% oxygen${above ? `, below your ${o2}%` : `, which includes your ${o2}%`}.`,
        `In SAFFIRE-II, all ${sil.length} silicone samples showed about 0 burn length in microgravity, while SIBAL fabric burned the full sample (${sibal.map(s => s.ugSpread).filter(Boolean).join(', ') || 'full length'}).`,
        'An Earth pass does not guarantee the same result in orbit.',
        gravity,
      ],
      action: above
        ? `Do not approve ${named} for this cabin from BASS-II alone. Those tests never reached ${o2}% oxygen.`
        : 'Compare the Earth screening result with the SAFFIRE microgravity burn before you treat a material as safe.',
    };
  }

  const bin = flexO2(o2);
  const binLine = bin
    ? `At ${bin.bin} oxygen, ${pct(bin.Extinction, bin.total)}% of ${bin.total} FLEX droplets went out on their own and ${pct(bin.Completion, bin.total)}% burned out.`
    : 'FLEX did not record an oxygen bin for this setting.';
  return {
    headline: x.diluent === 'none'
      ? `At ${o2}% oxygen, many droplet fires do not go out by themselves`
      : `${gas} put out more FLEX fires than plain nitrogen mix`,
    points: [
      score,
      `You added ${gas}. FLEX droplets self-extinguished in ${pct(yours.Extinction, yours.total)}% of ${yours.total} tests with that choice, versus ${pct(co2.Extinction, co2.total)}% with CO₂, ${pct(he.Extinction, he.total)}% with helium, and ${pct(none.Extinction, none.total)}% with neither.`,
      binLine,
      gravity,
    ],
    action: x.diluent === 'none' && o2 >= 19
      ? 'If this is a liquid-fuel risk, helium and CO₂ both beat an undiluted cabin in the FLEX table. Helium had the higher self-extinction rate.'
      : 'Use the gas with the higher extinction rate for the fuel you actually fly, and do not assume a flame that looks out is finished.',
  };
}
