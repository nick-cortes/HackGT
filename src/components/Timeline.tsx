'use client';

import { useRef, useEffect, useMemo, useState, useLayoutEffect } from "react";

// Function to decode HTML entities
const decodeHtmlEntities = (text: string): string => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

export type Publication = {
  id: number | string;
  title: string;
  date: string;
  pdfUrl: string;
  summary: string;
  isPrescriptionMarker?: boolean;
  abstract: string;
};

interface TimelineProps {
  publications: Publication[];
}

// --- CONFIGURATION CONSTANTS ---
const MIN_SPACING_PX = 400;   // The horizontal space between each event dot
const ARROW_GAP_PX = 200;      // The space between the last dot and the arrow

export default function Timeline({ publications }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const [startPadding, setStartPadding] = useState(300);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null);
  const [centeredPublication, setCenteredPublication] = useState<Publication | null>(null); 
  
  useLayoutEffect(() => {
    if (containerRef.current) {
      const centerScreen = containerRef.current.clientWidth / 2;
      setStartPadding(centerScreen);
    }
  }, []);

  const sortedPublications = useMemo(() => 
    publications && publications.length > 0 
      ? [...publications].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      : [], [publications]);

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
    
    let scrollTimeout: NodeJS.Timeout;
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      // Smoother scrolling with reduced delta sensitivity
      const scrollAmount = e.deltaY * 0.8;
      container.scrollLeft += scrollAmount;
      setScrollPosition(container.scrollLeft);
      
      // Clear existing timeout
      clearTimeout(scrollTimeout);
      
      // Set new timeout to snap after scrolling stops (reduced delay)
      scrollTimeout = setTimeout(() => {
        snapToClosestPoint();
      }, 100); // Wait 100ms after scrolling stops
    };
    
    const handleScroll = () => {
      setScrollPosition(container.scrollLeft);
      
      // Determine which publication is currently centered
      const centerX = container.scrollLeft + startPadding;
      let closestDistance = Infinity;
      let closestPublication = null;
      
      sortedPublications.forEach((pub) => {
        const pubPosition = positionMap.get(pub.id);
        if (pubPosition !== undefined) {
          const distance = Math.abs(centerX - pubPosition);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestPublication = pub;
          }
        }
      });
      
      setCenteredPublication(closestPublication);
    };

    const snapToClosestPoint = () => {
      const centerX = container.scrollLeft + startPadding;
      let closestDistance = Infinity;
      let closestPosition = centerX;
      
      // Find the closest publication position
      sortedPublications.forEach((pub) => {
        const pubPosition = positionMap.get(pub.id);
        if (pubPosition !== undefined) {
          const distance = Math.abs(centerX - pubPosition);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestPosition = pubPosition;
          }
        }
      });
      
      // Only snap if we're not already very close (reduces unnecessary micro-adjustments)
      const targetScrollLeft = closestPosition - startPadding;
      const currentDistance = Math.abs(container.scrollLeft - targetScrollLeft);
      
      if (currentDistance > 5) { // Only snap if more than 5px away
        container.scrollTo({
          left: targetScrollLeft,
          behavior: 'smooth'
        });
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("scroll", handleScroll);
    
    // Set initial centered publication
    const initialCenterX = container.scrollLeft + startPadding;
    let initialClosestDistance = Infinity;
    let initialClosestPublication = null;
    
    sortedPublications.forEach((pub) => {
      const pubPosition = positionMap.get(pub.id);
      if (pubPosition !== undefined) {
        const distance = Math.abs(initialCenterX - pubPosition);
        if (distance < initialClosestDistance) {
          initialClosestDistance = distance;
          initialClosestPublication = pub;
        }
      }
    });
    
    setCenteredPublication(initialClosestPublication);
    
    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [lastDotPosition, startPadding, sortedPublications, positionMap]);

  if (!publications || publications.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-800 rounded-lg border border-gray-700">
        <p className="text-gray-400 text-lg">No publication data available.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-x-auto overflow-y-hidden py-12 scrollbar-hide bg-gray-800 rounded-lg border border-gray-700 relative"
      style={{ 
        minHeight: '500px',
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
        backgroundSize: '20px 20px'
      }}
    >
      {/* Abstract Carousel - positioned above timeline */}
      <div className="absolute top-1/2 -translate-y-40 left-0 right-0 h-32 overflow-visible z-30">
        {sortedPublications.map((pub) => {
          // Only render cards for publications with abstracts and not prescription markers
          if (!pub.abstract || pub.isPrescriptionMarker) {
            return null;
          }
          
          const pubPosition = positionMap.get(pub.id) || 0;
          const centerX = scrollPosition + startPadding;
          const distance = Math.abs(centerX - pubPosition);
          const scale = Math.max(0.7, 1 - (distance / 400) * 0.3);
          const opacity = Math.max(0.5, 1 - (distance / 400) * 0.5);
          const isCentered = distance < 100;
          
          return (
            <div
              key={`abstract-${pub.id}`}
              className="absolute bottom-0 -translate-x-1/2 transition-all duration-500"
              style={{
                left: `${pubPosition}px`,
                transform: `scale(${scale})`,
                opacity: opacity,
                width: isCentered ? '300px' : '250px',
                height: isCentered ? '180px' : '100px',
                zIndex: isCentered ? 50 : 10
              }}
            >
              <a
                href={pub.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`h-full p-4 rounded-lg shadow-lg border transition-all duration-500 flex flex-col ${
                  isCentered 
                    ? 'bg-indigo-900/95 border-indigo-500 shadow-indigo-900/50 cursor-pointer hover:bg-indigo-800/95' 
                    : 'bg-gray-800/90 border-gray-600 cursor-default'
                }`}
                onClick={(e) => !isCentered && e.preventDefault()}
              >
                <p className={`text-xs leading-relaxed transition-all duration-300 flex-1 overflow-hidden ${
                  isCentered 
                    ? 'text-gray-200 line-clamp-8' 
                    : 'text-gray-400 line-clamp-2'
                }`}>
                  {pub.abstract ? decodeHtmlEntities(pub.abstract) : 'Abstract not available'}
                </p>
              </a>
            </div>
          );
        })}
      </div>
      
      <div
        className="relative h-full flex items-center"
        style={{ width: `${totalScrollableWidth}px` }}
      >
        {/* --- The rest of your JSX remains exactly the same --- */}
        <div 
          className="absolute top-1/2 h-2 -translate-y-1/2 
                     bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 z-10 rounded-full"
          style={{ 
            left: `${gradientStartPosition}px`,
            width: `${timelineEndPosition - gradientStartPosition}px` 
          }}
        />

        <div
          className="absolute top-1/2 -translate-y-1/2 z-10"
          style={{ left: `${timelineEndPosition}px` }}
        >
          <svg width="16" height="24" viewBox="0 0 12 20" fill="none" xmlns="http://www.w3.org/2000/svg">
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
        
        {sortedPublications.map((pub) => {
          const isCentered = centeredPublication?.id === pub.id;
          const isPrescription = pub.isPrescriptionMarker;
          
          return (
            <div
              key={pub.id}
              className={`absolute flex flex-col items-center -translate-x-1/2 group z-20 ${
                isPrescription ? 'cursor-default' : 'cursor-pointer'
              }`}
              style={{ left: `${positionMap.get(pub.id)}px`, top: "50%" }}
              onClick={isPrescription ? undefined : () => window.open(pub.pdfUrl, "_blank")}
            >
              <div
                className={`rounded-full mb-2 -translate-y-1/2 border-3 transition-all duration-300 ease-in-out ${
                  isCentered 
                    ? 'w-8 h-8' 
                    : 'w-6 h-6'
                } ${
                  isPrescription
                    ? 'bg-indigo-500 border-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.7)] group-hover:scale-125 group-hover:border-purple-300 group-hover:shadow-[0_0_12px_rgba(192,132,252,0.9)]'
                    : isCentered
                    ? 'bg-white border-purple-500 shadow-[0_0_12px_rgba(147,51,234,0.9)] scale-125'
                    : 'bg-white border-purple-500 shadow-[0_0_8px_rgba(147,51,234,0.7)] group-hover:scale-150 group-hover:border-pink-400 group-hover:shadow-[0_0_12px_rgba(244,114,182,0.9)]'
                }`}
              />
              <span className="text-sm text-gray-400 whitespace-nowrap font-medium">
                {new Date(pub.date).toLocaleDateString()}
              </span>
              <span className={`text-base mt-2 whitespace-nowrap ${
                isPrescription ? 'text-indigo-300 font-semibold' : 'text-gray-300'
              }`}>
                {isPrescription && pub.title.startsWith("Started") && pub.title}
              </span>
              
              {/* Show simple title for centered publication */}
              {isCentered && !isPrescription && (
                <div className="absolute top-full mt-4 w-64 p-3 text-white rounded-lg shadow-xl border z-30 bg-gray-800 border-gray-700">
                  <h3 className="text-sm font-semibold text-purple-300 text-center">
                    {pub.title}
                  </h3>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}