"use client";

import { useEffect, useState } from "react";

export interface SubsResponse {
  subscriberCount: string;
  nextSubGoal: string;
}

export const noAPI = () => {
  const [subs, setSubs] = useState<SubsResponse>({
    subscriberCount: "67",
    nextSubGoal: "69",
  });

  useEffect(() => {
    const fetchSubsData = async () => {
      const res = await fetch("/api/no-api-yt");
      const data = await res.json();
      setSubs(data);
    };

    fetchSubsData();
    const interval = setInterval(fetchSubsData, 2000); // every 2s

    return () => clearInterval(interval);
  }, []);
  if (!subs) return null;

  const subsCount = Number(subs.subscriberCount);
  const goal = Number(subs.nextSubGoal);

  const progress = Number(((subsCount / goal) * 100).toFixed(2));

  return (
    <div className="w-full h-screen bg-transparent flex flex-col items-center justify-center text-white">
      <h1 className="text-5xl text-center font-bold text-shadow-lg/30">
        Subs Goals <br />
        {subs.subscriberCount} / {subs.nextSubGoal}
      </h1>

      <div className="w-96 h-6 bg-gray-700 rounded-full mt-4 overflow-hidden">
        <div
          className="h-full bg-red-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default noAPI;
