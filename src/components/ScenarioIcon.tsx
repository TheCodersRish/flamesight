// Simple line icons (no emoji, so they render the same on every device).
export default function ScenarioIcon({ id, className = 'h-8 w-8' }: { id: string; className?: string }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      {id === 'iss' && (<g {...common}><rect x="12" y="12" width="8" height="8" rx="1.5" /><path d="M12 16H8M20 16h4" /><rect x="2" y="9" width="6" height="14" rx="1" /><rect x="24" y="9" width="6" height="14" rx="1" /><path d="M16 12V7M14 7h4" /></g>)}
      {id === 'lunar' && (<g {...common}><path d="M4 24h24" /><path d="M7 24v-5a9 9 0 0 1 18 0v5" /><path d="M13 24v-4h6v4" /><circle cx="24" cy="7" r="3" /></g>)}
      {id === 'mars' && (<g {...common}><path d="M3 25c4-3 7-3 10-1s7 2 9 0 4-2 7 0" /><path d="M9 22v-6l7-5 7 5v6" /><circle cx="25" cy="7" r="3" /></g>)}
      {id === 'rover' && (<g {...common}><path d="M5 19h22v-5l-4-5H11l-3 5H5z" /><circle cx="10" cy="23" r="2.5" /><circle cx="22" cy="23" r="2.5" /><path d="M14 9v5M19 9v5" /></g>)}
      {id === 'suit' && (<g {...common}><circle cx="16" cy="12" r="7" /><path d="M11 12a5 4 0 0 1 10 0" /><path d="M8 28v-4a8 6 0 0 1 16 0v4" /><path d="M13 23h6" /></g>)}
      {id.startsWith('custom') && (<g {...common}><path d="M12 5h8M14 5v7l-5 11h14l-5-11V5" /><path d="M11 18h10" /></g>)}
    </svg>
  );
}
