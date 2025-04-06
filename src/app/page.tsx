import AudioEditor from "@/components/audio-editor";


export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-white">
      <header className="bg-zinc-900 text-white p-4 shadow-md">
        <h1 className="text-2xl font-bold">CAMB.AI Audio Pill Player</h1>
      </header>
      <div className="flex-1 p-6">
        <AudioEditor />
      </div>
    </main>
  );
}
