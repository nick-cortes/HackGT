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

const PADDING_PX = 75; 
const MIN_SPACING_PX = 250;
const END_PADDING_PX = 500;

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

  const timelineContentWidth = (sortedPublications.length - 1) * MIN_SPACING_PX + (PADDING_PX * 2);
  const totalScrollableWidth = timelineContentWidth + END_PADDING_PX;

  const positionMap = useMemo(() => {
    const map = new Map<string | number, number>();
    sortedPublications.forEach((pub, index) => {
      const position = PADDING_PX + (index * MIN_SPACING_PX);
      map.set(pub.id, position);
    });
    return map;
  }, [sortedPublications]);

  const prescriptionMarker = sortedPublications.find(p => p.isPrescriptionMarker);
  
  const gradientStartPosition = prescriptionMarker
    ? positionMap.get(prescriptionMarker.id) || timelineContentWidth 
    : timelineContentWidth;

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
      <div
        className="relative h-full flex items-center"
        style={{ width: `${totalScrollableWidth}px` }}
      >
        <div 
          className="absolute top-1/2 h-1 -translate-y-1/2 
                     bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 z-10"
          style={{ 
            left: `${gradientStartPosition}px`,
            width: `${timelineContentWidth - gradientStartPosition}px` 
          }}
        />

        <div
          className="absolute top-1/2 -translate-y-1/2 z-10"
          style={{ left: `${timelineContentWidth}px` }}
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
            {/* --- THIS IS THE MODIFIED SECTION FOR THE DOT --- */}
            <div
              className={`w-4 h-4 rounded-full mb-1 -translate-y-1/2 border-2 transition-all duration-300 ease-in-out ${
                pub.isPrescriptionMarker
                  ? 'bg-indigo-500 border-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.7)] group-hover:scale-125 group-hover:border-purple-300 group-hover:shadow-[0_0_12px_rgba(192,132,252,0.9)]'
                  : 'bg-white border-purple-500 shadow-[0_0_8px_rgba(147,51,234,0.7)] group-hover:scale-150 group-hover:border-pink-400 group-hover:shadow-[0_0_12px_rgba(244,114,182,0.9)]'
              }`}
            />
            {/* --- THIS IS THE MODIFIED SECTION FOR THE TEXT --- */}
            <span className={`text-sm mt-1 whitespace-nowrap ${
              pub.isPrescriptionMarker ? 'text-gray-300font-semibold' : 'text-gray-300'
            }`}>
              {pub.title}
            </span>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {new Date(pub.date).toLocaleDateString()}
            </span>
            {/* --- THIS IS THE MODIFIED SECTION FOR THE TOOLTIP --- */}
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