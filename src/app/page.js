"use client";

import { useState } from "react";
import { BookOpen, Loader } from "lucide-react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [urduTranslation, setUrduTranslation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSummarize = async () => {
    if (!url) return;
    setLoading(true);
    setSummary("");
    setUrduTranslation("");
    setError("");

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch summary. Check your URL and try again.");
      }

      const data = await response.json();
      setSummary(data.summary);
      setUrduTranslation(data.urduTranslation);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center p-4 font-serif relative overflow-hidden"
      style={{
        backgroundColor: "#9caf88", // sage green
        backgroundImage: "url('/art (1).png')", // your rose background
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      }}
    >
      <div
        className="max-w-xl w-full shadow-lg rounded-xl p-8 border border-[#e2dcd5] z-10 backdrop-blur-md"
        style={{ backgroundColor: "rgba(255, 255, 255, 0.8)" }}
      >
        <h1 className="text-3xl md:text-4xl font-bold mb-6 flex justify-center items-center gap-3 text-[#4a3c31]">
          <BookOpen size={36} className="text-[#4a3c31]" /> AI Blog Summarizer
        </h1>

        <input
          type="text"
          placeholder="Paste blog URL here..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-[#4a3c31]/30 focus:border-[#4a3c31] transition bg-white placeholder-gray-500 text-gray-800"
        />

        <button
          onClick={handleSummarize}
          disabled={loading || !url}
          className={`w-full flex justify-center items-center bg-[#4a3c31] text-white px-4 py-2 rounded hover:bg-[#3b3128] transition font-semibold ${
            loading || !url ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {loading ? <Loader className="animate-spin" /> : "Summarize"}
        </button>

        {error && <p className="text-red-500 mt-4 text-center">{error}</p>}

        {summary && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-3 text-[#4a3c31] border-b border-gray-300 pb-1">
              Summary (English)
            </h2>
            <p className="bg-white p-4 rounded border border-gray-300 whitespace-pre-line text-gray-800">
              {summary}
            </p>
          </div>
        )}

        {urduTranslation && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-3 text-[#4a3c31] border-b border-gray-300 pb-1">
              Summary (Urdu)
            </h2>
            <p className="bg-white p-4 rounded border border-gray-300 whitespace-pre-line text-gray-800">
              {urduTranslation}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
