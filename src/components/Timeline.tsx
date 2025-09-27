'use client';

import { useRef, useEffect, useMemo } from "react";

export type Publication = {
  id: number | string;
  title: string;
  date: string;
  pdfUrl: string;
  summary: string;
  isPrescriptionMarker?: boolean;
};

interface TimelineProps {
  publications: Publication[];
}

// --- NEW: Define constants for our layout ---
const PADDING_PX = 75; // Space on the far left and far right of the timeline
const MIN_SPACING_PX = 250; // The minimum horizontal space between each event dot

export default function Timeline({ publications }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  if (!publications || publications.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-gray-500">No publication data available.</p>
      </div>
    );
  }
  
  const sortedPublications = useMemo(() => 
    [...publications].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    ), [publications]);

  // --- START: NEW INDEX-BASED LAYOUT LOGIC ---

  // 1. Calculate the new, dynamic width of the timeline based on the number of items.
  const newTimelineWidth = (sortedPublications.length - 1) * MIN_SPACING_PX + (PADDING_PX * 2);

  // 2. Pre-calculate the position of every single item and store it in a Map.
  //    This is more efficient than calculating it on every render for every item.
  const positionMap = useMemo(() => {
    const map = new Map<string | number, number>();
    sortedPublications.forEach((pub, index) => {
      const position = PADDING_PX + (index * MIN_SPACING_PX);
      map.set(pub.id, position);
    });
    return map;
  }, [sortedPublications]); // This only recalculates if the publications change.

  // 3. Find the prescription marker to determine where the gradient starts.
  const prescriptionMarker = sortedPublications.find(p => p.isPrescriptionMarker);
  
  // Get the pre-calculated position of the marker from our map.
  // If there's no marker, the gradient starts at the end (so the whole line is gray).
  const gradientStartPosition = prescriptionMarker
    ? positionMap.get(prescriptionMarker.id) || newTimelineWidth 
    : newTimelineWidth;

  // --- END: NEW LOGIC ---

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
  }, [publications]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-x-auto overflow-y-hidden py-8 scrollbar-hide bg-gray-900 rounded-lg"
    >
      {/* Use the new dynamic width for the inner container */}
      <div
        className="relative h-full flex items-center"
        style={{ width: `${newTimelineWidth}px` }}
      >
        {/* 1. The Gray Line (The Past) */}
        <div
          className="absolute top-1/2 left-0 h-1 bg-gray-700 -translate-y-1/2 rounded-l-full z-10"
          style={{ width: `${gradientStartPosition}px` }}
        />

        {/* 2. The Gradient Line (The Present/Future) */}
        <div 
          className="absolute top-1/2 h-1 -translate-y-1/2 
                     bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-r-full z-10"
          style={{ 
            left: `${gradientStartPosition}px`,
            width: `${newTimelineWidth - gradientStartPosition}px` 
          }}
        />

        {/* Map publications and use the pre-calculated positions from the map */}
        {sortedPublications.map((pub) => (
          <div
            key={pub.id}
            className={`absolute flex flex-col items-center -translate-x-1/2 group z-20 ${
              pub.isPrescriptionMarker ? 'cursor-default' : 'cursor-pointer'
            }`}
            // --- Use the position from our map ---
            style={{ left: `${positionMap.get(pub.id)}px`, top: "50%" }}
            onClick={pub.isPrescriptionMarker ? undefined : () => window.open(pub.pdfUrl, "_blank")}
          >
            {/* The rest of your dot/tooltip styling is perfect and needs no changes */}
            <div
              className={`w-4 h-4 rounded-full mb-1 -translate-y-1/2 border-2 transition-all duration-300 ease-in-out ${
                pub.isPrescriptionMarker
                  ? 'bg-red-500 border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.7)] group-hover:scale-125 group-hover:border-red-300 group-hover:shadow-[0_0_12px_rgba(239,68,68,0.9)]'
                  : 'bg-white border-purple-500 shadow-[0_0_8px_rgba(147,51,234,0.7)] group-hover:scale-150 group-hover:border-pink-400 group-hover:shadow-[0_0_12px_rgba(244,114,182,0.9)]'
              }`}
            />
            <span className={`text-sm mt-1 whitespace-nowrap ${
              pub.isPrescriptionMarker ? 'text-red-300 font-semibold' : 'text-gray-300'
            }`}>
              {pub.title}
            </span>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {new Date(pub.date).toLocaleDateString()}
            </span>
            <div 
              className={`absolute top-full mt-3 w-64 p-3 text-white rounded-lg shadow-xl border z-30
                         opacity-0 scale-95 invisible group-hover:visible group-hover:opacity-100 group-hover:scale-100
                         transition-all duration-300 ease-in-out pointer-events-none ${
                pub.isPrescriptionMarker 
                  ? 'bg-red-800 border-red-700' 
                  : 'bg-gray-800 border-gray-700'
              }`}
            >
              <p className="text-xs text-center text-gray-300">{pub.summary}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}