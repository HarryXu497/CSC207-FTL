type ScoreProps = {
  score: number;
};

export default function Score({ score }: ScoreProps) {
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

  return <p className={`score ${scoreColor(score)}`}>{score}</p>;
}
