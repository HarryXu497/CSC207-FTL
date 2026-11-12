type ScoreProps = {
  score: number;
  sentimentScale?: boolean;
};

export default function Score({ score, sentimentScale = true }: ScoreProps) {
  function scoreColor(score: number): string {
    if (score <= 20) {
      return 'text-score-poor';
    }
    if (score <= 40) {
      return 'text-score-weak';
    }
    if (score <= 60) {
      return 'text-score-ok';
    }
    if (score <= 80) {
      return 'text-score-good';
    }
    return 'text-score-great';
  }

  const colorScore = sentimentScale ? (score + 1) * 50 : score;
  return <p className={`score ${scoreColor(colorScore)}`}>{score.toPrecision(3)}</p>;
}
