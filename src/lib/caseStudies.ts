/** Real spacecraft fire events mapped to NASA PSI experiments that explain the physics. */

export interface CaseStudy {
  id: string;
  title: string;
  year: number;
  place: string;
  summary: string;
  conditions: { label: string; value: string }[];
  lessons: string[];
  /** PSI investigations that illuminate why the event unfolded as it did. */
  experiments: { accession: string; link: string }[];
  storytelling: string;
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: 'apollo1',
    title: 'Apollo 1 pad fire',
    year: 1967,
    place: 'Kennedy Space Center, Command Module AS-204',
    summary:
      'A flash fire during a plugs-out countdown test killed the crew in seconds. The cabin was pressurized with nearly pure oxygen above sea-level pressure — an atmosphere that makes ordinary materials violently flammable.',
    conditions: [
      { label: 'Atmosphere', value: '~100% O₂ at >14.7 psi (overpressure)' },
      { label: 'Gravity', value: 'Earth 1 g (pad test)' },
      { label: 'Ignition', value: 'Electrical short in wiring / equipment' },
      { label: 'Outcome', value: 'Catastrophic cabin fire; three fatalities' },
    ],
    lessons: [
      'Pure oxygen at elevated pressure collapses the margin between “material passes Earth screening” and “material feeds a fire.”',
      'Escape hatches and suit/cabin design must assume a fire can grow faster than crews can react.',
      'Modern exploration cabins still chase high O₂ / low pressure — the same chemistry lesson applies, even when total pressure is lower.',
    ],
    experiments: [
      { accession: 'PSI-159', link: 'CFI-G maps how hot ignition probability climbs with oxygen enrichment (tested to 85% O₂).' },
      { accession: 'PSI-20', link: 'ACME BRE explicitly lists NASA-considered high-O₂ / low-pressure atmospheres for human missions.' },
      { accession: 'PSI-25', link: 'BASS-II solid-material flammability under forced flow shows how cabin fabrics behave once oxygen rises.' },
      { accession: 'PSI-99', link: 'SAFFIRE-II compares orbit burns with 1-g screening — Earth tests alone are not enough.' },
    ],
    storytelling:
      'Apollo 1 is the cautionary tale behind every “Will it burn?” slider in FlameSight. When you push oxygen toward suit levels, you are replaying the chemistry that made a spacecraft cabin a flash chamber — now measured, test by test, in PSI.',
  },
  {
    id: 'mir1997',
    title: 'Mir oxygen-generator fire',
    year: 1997,
    place: 'Mir space station (Kvant-1 module)',
    summary:
      'A solid-fuel oxygen generator (SFOG / “candle”) malfunctioned and sprayed a jet of flame and molten metal for about 14 minutes. Crews fought it with foam extinguishers while smoke filled the station — a real on-orbit fire in microgravity.',
    conditions: [
      { label: 'Atmosphere', value: '~Earth-like cabin air (≈21% O₂)' },
      { label: 'Gravity', value: 'Microgravity (orbital freefall)' },
      { label: 'Source', value: 'Solid-fuel oxygen generator malfunction' },
      { label: 'Outcome', value: 'Contained after ~14 min; station filled with smoke' },
    ],
    lessons: [
      'In microgravity there is no buoyant plume: smoke and hot products linger where ventilation carries them.',
      'A fire that lasts minutes is long enough to threaten life support and optics even if the flame itself is small.',
      'Detection and ventilation shutdown matter as much as the extinguisher chemical.',
    ],
    experiments: [
      { accession: 'PSI-98', link: 'SAFFIRE-I large-sample burns show how forced cabin airflow feeds and stretches a flame in freefall.' },
      { accession: 'PSI-99', link: 'SAFFIRE-II measures spread length under ventilation — the same “fan feeds the fire” lesson Mir crews lived.' },
      { accession: 'PSI-69', link: 'FLEX droplet flames with CO₂ / He diluents quantify inert-gas suppression options.' },
      { accession: 'PSI-102', link: 'SAME smoke-particle data informs why detectors must be tuned for low-g smoke, not only Earth plumes.' },
      { accession: 'PSI-47', link: 'DAFT studied smoke and aerosol behavior relevant to post-fire cabin air.' },
    ],
    storytelling:
      'Mir 1997 is why FlameSight treats airflow as a first-class control. Without buoyancy, the ventilation that keeps a crew alive is also the wind that keeps a flame alive — exactly what SAFFIRE measured decades later on Cygnus.',
  },
];

export function caseStudyById(id: string): CaseStudy | undefined {
  return CASE_STUDIES.find(c => c.id === id);
}
