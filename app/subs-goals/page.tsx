"use client";

import { useEffect, useState } from "react";

export default function SubsOverlay() {
  const [subs, setSubs] = useState<number | null>(null);

  useEffect(() => {
    const fetchSubs = async () => {
      const res = await fetch("/api/youtube-subs");
      const data = await res.json();
      setSubs(data.subscriberCount);
    };

    fetchSubs();
    const interval = setInterval(fetchSubs, 20000); // every 20s

    return () => clearInterval(interval);
  }, []);

  if (!subs) return null;

  const goal = subs + 1;
  const progress = (subs / goal) * 100;

  return (
    <div className="w-full h-screen bg-transparent flex flex-col items-center justify-center text-white">
      <h1 className="text-5xl text-center font-bold text-shadow-lg/30">
        Subs Goals <br />
        {subs} / {goal}
      </h1>

      <div className="w-96 h-6 bg-gray-700 rounded-full mt-4 overflow-hidden">
        <div
          className="h-full bg-red-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
