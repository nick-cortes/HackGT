'use client';

import { useRef, useEffect } from "react";

type Publication = {
  id: number;
  title: string;
  date: string;
  pdfUrl: string;
  summary: string; // Summary of the paper
};

const publications: Publication[] = [
    { id: 1, title: "Initial Findings", date: "2022-01-15", pdfUrl: "#", summary: "This paper details the foundational research and initial discovery of the compound's potential." },
    { id: 2, title: "Phase I Trials", date: "2022-08-20", pdfUrl: "#", summary: "Results from the first-in-human trials, focusing on safety, tolerability, and dosage." },
    { id: 3, title: "Efficacy Study", date: "2023-03-10", pdfUrl: "#", summary: "A double-blind, placebo-controlled study demonstrating significant efficacy in the target patient population." },
    { id: 4, title: "Long-term Effects", date: "2023-06-01", pdfUrl: "#", summary: "Follow-up study over 12 months, assessing the long-term benefits and side effect profile." },
    { id: 5, title: "Review Article", date: "2023-11-25", pdfUrl: "#", summary: "A comprehensive review of the drug's mechanism of action and its place in the current therapeutic landscape." },
    { id: 6, title: "FDA Submission", date: "2024-02-18", pdfUrl: "#", summary: "Key data and analysis from the new drug application (NDA) submitted for regulatory review." },
];


export default function Timeline() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timelineWidth = 2000; // px

  const sortedPublications = publications.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const startDate = new Date(sortedPublications[0].date);
  const endDate = new Date(sortedPublications[sortedPublications.length - 1].date);
  
  const timeSpan = endDate.getTime() - startDate.getTime();

  const computeLeft = (dateStr: string) => {
    const date = new Date(dateStr);
    const ratio = (date.getTime() - startDate.getTime()) / timeSpan;
    const padding = 50; 
    return padding + ratio * (timelineWidth - padding * 2);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollLeft = container.scrollWidth;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-64 overflow-x-auto overflow-y-hidden py-8 scrollbar-hide bg-gray-900 rounded-lg" // Changed background to dark for contrast
    >
      <div
        className="relative h-32 pt-16"
        style={{ width: `${timelineWidth}px` }}
      >
        {/* --- CHANGE 1: The Gradient Timeline --- */}
        <div 
            className="absolute top-1/2 left-0 w-full h-1 -translate-y-1/2 
                       bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full" 
        />

        {sortedPublications.map((pub) => (
          <div
            key={pub.id}
            className="absolute flex flex-col items-center cursor-pointer -translate-x-1/2 group"
            style={{ left: `${computeLeft(pub.date)}px`, top: "50%" }}
            onClick={() => window.open(pub.pdfUrl, "_blank")}
          >
            {/* --- CHANGE 2: The Modernized Glowing Dot --- */}
            <div
              className="w-4 h-4 rounded-full mb-1 -translate-y-1/2 
                         bg-white border-2 border-purple-500 
                         shadow-[0_0_8px_rgba(147,51,234,0.7)] 
                         transition-all duration-300 ease-in-out 
                         group-hover:scale-150 group-hover:border-pink-400 group-hover:shadow-[0_0_12px_rgba(244,114,182,0.9)]"
            />
            
            {/* The text below the circle */}
            <span className="text-sm text-gray-300 mt-1 whitespace-nowrap">{pub.title}</span> {/* Text color changed for dark bg */}
            <span className="text-xs text-gray-500 whitespace-nowrap">{pub.date}</span>

            {/* The summary tooltip that appears on hover */}
            <div 
              className="absolute top-full mt-3 w-64 p-3 bg-gray-800 text-white rounded-lg shadow-xl border border-gray-700 z-10
                         opacity-0 scale-95 invisible group-hover:visible group-hover:opacity-100 group-hover:scale-100
                         transition-all duration-300 ease-in-out pointer-events-none"
            >
              <p className="text-xs text-center text-gray-300">{pub.summary}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}