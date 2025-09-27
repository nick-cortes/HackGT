'use client';

import { useRef, useEffect, useMemo, useState, useLayoutEffect } from "react";

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

// --- CONFIGURATION CONSTANTS ---
const MIN_SPACING_PX = 250;   // The horizontal space between each event dot
const ARROW_GAP_PX = 200;      // The space between the last dot and the arrow

export default function Timeline({ publications }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const [startPadding, setStartPadding] = useState(300); 
  
  useLayoutEffect(() => {
    if (containerRef.current) {
      const centerScreen = containerRef.current.clientWidth / 2;
      setStartPadding(centerScreen);
    }
  }, []);

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

  const positionMap = useMemo(() => {
    const map = new Map<string | number, number>();
    sortedPublications.forEach((pub, index) => {
      const position = startPadding + (index * MIN_SPACING_PX);
      map.set(pub.id, position);
    });
    return map;
  }, [sortedPublications, startPadding]);

  const lastDotPosition = useMemo(() => {
    if (sortedPublications.length === 0) return startPadding;
    const lastPubId = sortedPublications[sortedPublications.length - 1].id;
    return positionMap.get(lastPubId) || startPadding;
  }, [sortedPublications, positionMap, startPadding]);

  const timelineEndPosition = lastDotPosition + ARROW_GAP_PX;

  const prescriptionMarker = sortedPublications.find(p => p.isPrescriptionMarker);
  
  const gradientStartPosition = prescriptionMarker
    ? positionMap.get(prescriptionMarker.id) || timelineEndPosition 
    : timelineEndPosition;

  // --- FIXED: Calculate the exact width needed to prevent over-scrolling. ---
  // The total width is the position of the last dot plus exactly half the screen width.
  // This ensures that when scrolled all the way to the end, the last dot aligns
  // perfectly with the center of the screen, leaving no extra space to scroll into.
  const totalScrollableWidth = lastDotPosition + startPadding;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Set the initial scroll to center the last dot. Because of our new width
    // calculation, this is also the maximum scroll position.
    container.scrollLeft = lastDotPosition - startPadding; 
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [lastDotPosition, startPadding]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-x-auto overflow-y-hidden py-8 scrollbar-hide bg-gray-900 rounded-lg"
    >
      <div
        className="relative h-full flex items-center"
        style={{ width: `${totalScrollableWidth}px` }}
      >
        {/* --- The rest of your JSX remains exactly the same --- */}
        <div 
          className="absolute top-1/2 h-1 -translate-y-1/2 
                     bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 z-10"
          style={{ 
            left: `${gradientStartPosition}px`,
            width: `${timelineEndPosition - gradientStartPosition}px` 
          }}
        />

        <div
          className="absolute top-1/2 -translate-y-1/2 z-10"
          style={{ left: `${timelineEndPosition}px` }}
        >
          <svg width="12" height="20" viewBox="0 0 12 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="arrowGradient" x1="0" y1="10" x2="12" y2="10" gradientUnits="userSpaceOnUse">
                <stop stopColor="#EC4899"/>
                <stop offset="1" stopColor="#EC4899"/>
                <stop offset="1" stopColor="#EC4899"/>
              </linearGradient>
            </defs>
            <path d="M0 0L12 10L0 20V0Z" fill="url(#arrowGradient)"/>
          </svg>
        </div>
        
        {sortedPublications.map((pub) => (
          <div
            key={pub.id}
            className={`absolute flex flex-col items-center -translate-x-1/2 group z-20 ${
              pub.isPrescriptionMarker ? 'cursor-default' : 'cursor-pointer'
            }`}
            style={{ left: `${positionMap.get(pub.id)}px`, top: "50%" }}
            onClick={pub.isPrescriptionMarker ? undefined : () => window.open(pub.pdfUrl, "_blank")}
          >
            <div
              className={`w-4 h-4 rounded-full mb-1 -translate-y-1/2 border-2 transition-all duration-300 ease-in-out ${
                pub.isPrescriptionMarker
                  ? 'bg-indigo-500 border-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.7)] group-hover:scale-125 group-hover:border-purple-300 group-hover:shadow-[0_0_12px_rgba(192,132,252,0.9)]'
                  : 'bg-white border-purple-500 shadow-[0_0_8px_rgba(147,51,234,0.7)] group-hover:scale-150 group-hover:border-pink-400 group-hover:shadow-[0_0_12px_rgba(244,114,182,0.9)]'
              }`}
            />
            <span className={`text-sm mt-1 whitespace-nowrap ${
              pub.isPrescriptionMarker ? 'text-indigo-300 font-semibold' : 'text-gray-300'
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
                  ? 'bg-indigo-900 border-indigo-700' 
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