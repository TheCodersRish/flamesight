import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { answerLocal, askRemote, SAMPLE_QUESTIONS, type Answer } from '../lib/retrieval';
import { Card, PageHeader, Pill, SourceChip } from '../components/ui';

interface Turn { a: Answer; ai: string | null; aiState: 'pending' | 'done' | 'off' }

export default function Analyst() {
  const [sp] = useSearchParams();
  const [q, setQ] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [useAI, setUseAI] = useState(true);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const asked = useRef<string | null>(null);

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text) return;
    const a = answerLocal(text);
    const turn: Turn = { a, ai: null, aiState: useAI && aiAvailable !== false && a.hits.length ? 'pending' : 'off' };
    setTurns(t => [turn, ...t]);
    setQ('');
    if (turn.aiState === 'pending') {
      const ctl = new AbortController();
      const to = window.setTimeout(() => ctl.abort(), 25000);
      const ai = await askRemote(text, a, ctl.signal);
      window.clearTimeout(to);
      setAiAvailable(!!ai);
      setTurns(ts => ts.map(x => (x === turn ? { ...x, ai, aiState: 'done' } : x)));
    }
  };

  useEffect(() => {
    const qq = sp.get('q');
    if (qq && asked.current !== qq) { asked.current = qq; void ask(qq); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  return (
    <div>
      <PageHeader kicker="Fire Safety Analyst" title="Ask a question. Get an answer from NASA data.">
        The analyst searches the 24 investigations and facts computed from their test tables, then asks Gemini to summarize those NASA sources. The search itself stays in the browser. The key never leaves the server.
      </PageHeader>
      <Card>
        <form onSubmit={e => { e.preventDefault(); void ask(q); }} className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="q" className="sr-only">Your question</label>
          <input id="q" value={q} onChange={e => setQ(e.target.value)} placeholder="e.g. Which gas puts out fuel fires best in microgravity?"
            className="flex-1 rounded-xl border border-white/10 bg-space-900 px-4 py-3 text-white placeholder:text-slate-500 focus:border-micro-500 focus:outline-none" />
          <button className="rounded-xl bg-gradient-to-r from-flame-500 to-flame-600 px-6 py-3 font-medium text-white shadow-glow hover:brightness-110">Ask</button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {SAMPLE_QUESTIONS.map(s => <button key={s} onClick={() => void ask(s)} className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300 ring-1 ring-white/10 hover:text-white">{s}</button>)}
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <input type="checkbox" checked={useAI} onChange={e => setUseAI(e.target.checked)} />
          Ask Gemini to summarize the matched NASA sources {aiAvailable === false && <Pill>Gemini unavailable: local sources only</Pill>}{aiAvailable && <Pill tone="green">Gemini connected</Pill>}
        </label>
      </Card>

      <div className="mt-6 space-y-4">
        <AnimatePresence initial={false}>
          {turns.map((t, i) => (
            <motion.div key={`${t.a.question}-${turns.length - i}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <p className="text-sm text-slate-400">You asked</p>
                <p className="text-lg font-medium text-white">{t.a.question}</p>
                {t.aiState === 'pending' && <p className="mt-3 animate-pulse text-sm text-slate-400">Checking for an AI summary…</p>}
                {t.ai && (
                  <div className="mt-3 rounded-xl bg-micro-500/10 p-4 ring-1 ring-micro-500/30">
                    <p className="text-[11px] uppercase tracking-widest text-micro-300">AI summary, grounded on the sources below</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-100">{t.ai}</p>
                  </div>
                )}
                <p className="mt-3 text-slate-200">{t.a.intro}</p>
                {t.a.caveats.map(c => <p key={c} className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-200 ring-1 ring-amber-500/30">⚠ {c}</p>)}
                <ol className="mt-3 space-y-3">
                  {t.a.hits.map((h, k) => (
                    <li key={h.inv.accession} className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link to={`/explorer/${h.inv.accession}`} className="font-semibold text-white hover:underline">{k + 1}. {h.inv.hasAcronym ? h.inv.acronym : h.inv.title}</Link>
                        <SourceChip acc={h.inv.accession} compact />
                      </div>
                      <p className="mt-1 text-sm text-slate-300">{h.inv.summary.split(/(?<=\.)\s/)[0]} <span className="text-flame-200">{h.inv.why}</span></p>
                      {h.passages.filter(p => p.kind === 'fact').slice(0, 2).map(p => <p key={p.id} className="mt-2 border-l-2 border-micro-500 pl-3 text-xs text-slate-300">{p.text}</p>)}
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-[11px] text-slate-500">Retrieval: BM25 keyword search + oxygen/pressure matching over the NASA PSI catalog and computed test facts. Answers quote the data; they are not safety advice.</p>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
        {turns.length === 0 && <p className="text-center text-sm text-slate-500">Try one of the sample questions above.</p>}
      </div>
    </div>
  );
}
