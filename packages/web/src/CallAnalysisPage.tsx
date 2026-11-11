import Card from "./components/Card";
import Conversation from "./components/Conversation";
import NavBar from "./components/NavBar";
import {messages} from "./tempCall";

export default function CallAnalysisPage() {
  return (
    <main className="min-h-screen w-full">
        <NavBar className="mb-4" />
        <h1 className="mb-4 text-left text-2xl font-semibold p-4">Call Analysis</h1>
        <Conversation messages={messages} title="Upgrade Plan Error" />

    </main>
  );
}