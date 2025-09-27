'use client';

import { useRef, useEffect } from "react";

type Publication = {
  id: number;
  title: string;
  date: string;
  pdfUrl: string;
};

const publications: Publication[] = [
  { id: 1, title: "Paper 1", date: "2023-01-15", pdfUrl: "/papers/paper1.pdf" },
  { id: 2, title: "Paper 2", date: "2023-02-20", pdfUrl: "/papers/paper2.pdf" },
  { id: 3, title: "Paper 3", date: "2023-03-10", pdfUrl: "/papers/paper3.pdf" },
  { id: 4, title: "Paper 4", date: "2023-06-01", pdfUrl: "/papers/paper4.pdf" },
];

export default function Timeline() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timelineWidth = 2000; // px

  const startDate = new Date(
    Math.min(...publications.map((p) => new Date(p.date).getTime()))
  );
  const endDate = new Date(
    Math.max(...publications.map((p) => new Date(p.date).getTime()))
  );

  const computeLeft = (dateStr: string) => {
    const date = new Date(dateStr);
    const ratio = (date.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime());
    return ratio * timelineWidth;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Start at rightmost
    container.scrollLeft = container.scrollWidth;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      container.scrollLeft += e.deltaY; // scroll down -> move left
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [startDate, endDate]);

  return (
    <div
      ref={containerRef}
      className="w-full h-64 overflow-x-auto overflow-y-hidden py-8 scrollbar-hide"
    >
      <div
        className="relative h-32"
        style={{ width: `${timelineWidth}px` }}
      >
        {/* Red timeline line in the middle */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-red-600 -translate-y-1/2" />

        {/* Tick marks only at publication positions */}
        {publications.map((pub) => (
          <div
            key={pub.id}
            className="absolute flex flex-col items-center"
            style={{ left: `${computeLeft(pub.date)}px`, top: "50%" }}
          >
            <div className="w-px h-4 bg-orange-800" />
          </div>
        ))}

        {/* Publications */}
        {publications.map((pub) => (
          <div
            key={pub.id}
            className="absolute flex flex-col items-center cursor-pointer -translate-x-1/2"
            style={{ left: `${computeLeft(pub.date)}px`, top: "50%" }}
            onClick={() => window.open(pub.pdfUrl, "_blank")}
          >
            <div className="w-4 h-4 bg-blue-600 rounded-full mb-1 -translate-y-1/2" />
            <span className="text-sm text-gray-700 mt-1">{pub.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}