import { formatScore, scoreBg } from '@/lib/utils';

interface ScorePillProps {
  label: string;
  score: number | null;
}

export function ScorePill({ label, score }: ScorePillProps) {
  return (
    <span className={`score-pill ${scoreBg(score)}`}>
      <span className="opacity-60 text-[10px] uppercase tracking-wider">{label}</span>
      <span>{formatScore(score)}</span>
    </span>
  );
}
