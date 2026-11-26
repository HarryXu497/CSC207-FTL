import type { SentimentScore } from '@recall/server/entities';
import ProfileIcon from './ProfileIcon';
import Score from './Score';

type MessageProps = {
  id?: string;
  className?: string;
  name: string;
  time: Date;
  content: string;
  sentiment?: SentimentScore;
  onBranch?: () => void;
  branching?: boolean;
  branchDisabled?: boolean;
};

export default function Message({
  id,
  className = '',
  name,
  time,
  content,
  sentiment,
  onBranch,
  branching = false,
  branchDisabled = false,
}: MessageProps) {
  return (
    <div
      id={id}
      tabIndex={id ? -1 : undefined}
      className={`message ${className} flex scroll-mt-28 target:bg-base target:ring-2 target:ring-accent-blue focus-visible:outline-2 focus-visible:outline-accent-blue`}
    >
      <div className="score">{sentiment && <Score score={sentiment.score} sentimentScale />}</div>
      <div>
        <div className="messageHeader">
          <ProfileIcon name={name} />
          <div>
            <p className="text-lg font-bold">{name}</p>
            <p className="text-sm text-secondary">
              {time.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </p>
          </div>
        </div>
        <div className="messageContent">
          <p>{content}</p>
        </div>
        {onBranch && (
          <button
            type="button"
            onClick={onBranch}
            disabled={branchDisabled}
            className="mt-3 rounded-md border border-tertiary px-3 py-1.5 text-sm font-medium hover:border-accent-blue focus-visible:outline-2 focus-visible:outline-accent-blue disabled:opacity-50"
          >
            {branching ? 'Creating practice…' : 'Practice from here'}
          </button>
        )}
      </div>
    </div>
  );
}
