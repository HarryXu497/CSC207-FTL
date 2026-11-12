import Card from "./components/Card";
import Conversation from "./components/Conversation";
import NavBar from "./components/NavBar";
import {messages} from "./tempCall";

export default function CallAnalysisPage() {
  return (
    <main className="min-h-screen w-full">
        <NavBar className="mb-4" />
        <h1 className="mb-4 text-left text-2xl font-semibold p-4">Call Analysis</h1>
        <div className = "flex gap-4">
          <div className = "flex-col gap-4 m-4 p-2 w-1/4">
            <div className = "flex gap-4 mb-4">
              <Card className = "scoreCardSimple"> <h1>Accuracy Score</h1> <p className = "score">85</p></Card>
              <Card className = "scoreCardSimple"> <h1>Sentiment Score</h1> <p className = "score">70</p></Card>
            </div>
            <Card className = "feedback"> <p>Feedback</p>
              <ul>
                <li>Agent did not explain why they needed the customer's information</li>
                <li>Agent did not provide clear instructions for the customer to follow</li>
                <li>Agent was not helpful in resolving the customer's issue</li>
              </ul>
            </Card>
          </div>
          <div className = "w-3/4">
            <Conversation className = "conversation" messages={messages} title="Upgrade Plan Error" />
          </div>
        </div>
        
    </main>
  );
}