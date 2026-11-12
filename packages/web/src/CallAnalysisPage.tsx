import Card from './components/Card';
import Conversation from './components/Conversation';
import NavBar from './components/NavBar';
import Score from './components/Score';
import { messages } from './tempCall';

export default function CallAnalysisPage() {
  return (
    <main className="min-h-screen w-full">
      <NavBar className="mb-4" />
      <h1 className="mb-4 text-left text-2xl font-semibold p-4">Call Analysis</h1>
      <div className="flex gap-4 pb-4">
        <div className="flex-col gap-4 ml-4 w-1/4 h-[calc(100vh-8rem)]">
          <div className="flex w-full gap-4 mb-4">
            <Card className="scoreCardSimple">
              {' '}
              <h1>Accuracy</h1> <Score score={85} />
            </Card>
            <Card className="scoreCardSimple">
              {' '}
              <h1>Sentiment</h1> <Score score={70} />
            </Card>
          </div>
          <Card className="feedback">
            {' '}
            <h1>Feedback</h1>
            <ul className="list-disc pl-5">
              <li>Agent did not explain why they needed the customer's information</li>
              <li>Agent did not provide clear instructions for the customer to follow</li>
              <li>Agent was not helpful in resolving the customer's issue</li>
            </ul>
          </Card>
        </div>
        <div className="mr-4 w-3/4">
          <Conversation className="conversation" messages={messages} title="Upgrade Plan Error" />
        </div>
      </div>
    </main>
  );
}
