import type { SentimentScore } from '@recall/shared';
import ProfileIcon from './ProfileIcon';
import Score from './Score';

type MessageProps = {
  className?: string;
  name: string;
  time: Date;
  content: string;
  sentiment?: SentimentScore;
};

export default function Message({ className = '', name, time, content, sentiment }: MessageProps) {
  return (
    <div className={`message ${className} flex`}>
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
      </div>
    </div>
  );
}
