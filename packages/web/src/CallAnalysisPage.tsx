import Card from "./components/Card";
import NavBar from "./components/NavBar";

export default function CallAnalysisPage() {
  return (
    <main className="min-h-screen w-full">
        <NavBar className="mb-4" />
        <h1 className="mb-4 text-left text-2xl font-semibold p-4">Call Analysis</h1>
        <Card className="mx-auto w-1/2">
            <p>Call Analysis Page</p>
        </Card>
    </main>
  );
}