type ScoreProps = {
  score: number;
  sentimentScale?: boolean;
};

type ScoreColor = 'score-poor' | 'score-weak' | 'score-ok' | 'score-good' | 'score-great';

const scoreTextClasses: Record<ScoreColor, string> = {
  'score-poor': 'text-score-poor',
  'score-weak': 'text-score-weak',
  'score-ok': 'text-score-ok',
  'score-good': 'text-score-good',
  'score-great': 'text-score-great',
};

export function scoreColor(score: number): ScoreColor {
  if (score <= 20) return 'score-poor';
  if (score <= 40) return 'score-weak';
  if (score <= 60) return 'score-ok';
  if (score <= 80) return 'score-good';
  return 'score-great';
}

export default function Score({ score }: ScoreProps) {
  const colorScore = (score + 1) * 50;
  return <p className={`score ${scoreTextClasses[scoreColor(colorScore)]}`}>{colorScore.toPrecision(2)}</p>;
}
