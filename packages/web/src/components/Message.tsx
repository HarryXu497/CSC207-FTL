import ProfileIcon from "./ProfileIcon";

type MessageProps = {
  className?: string
  name: string;
  time: Date;
  content: string;
};

export default function Message({className = "", name, time, content}: MessageProps){
    return (
        <div className={`message ${className}`}>
            
            <div className="messageHeader">
                <ProfileIcon />
                <div>
                    <p className = "text-lg font-bold">{name}</p>
                    <p className = "text-sm text-secondary">{time.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</p>
                </div>
            </div>
            <div className="messageContent">
                <p>{content}</p>
            </div>
        </div>
    )
}