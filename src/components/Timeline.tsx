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
  drug: {
    id: string;
    name: string;
  };
  impactScore?: number;
};

interface TimelineProps {
  publications: Publication[];
  patientId?: string;
}

// --- CONFIGURATION CONSTANTS ---
const MIN_SPACING_PX = 400;   // The horizontal space between each event dot
const ARROW_GAP_PX = 200;      // The space between the last dot and the arrow

export default function Timeline({ publications, patientId }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const [startPadding, setStartPadding] = useState(300);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null);
  const [centeredPublication, setCenteredPublication] = useState<Publication | null>(null);
  const savedScrollPosition = useRef<number | null>(null);
  const [generatedSummary, setGeneratedSummary] = useState<{
    impactScore: number;
    summary: string;
    relevanceSummary: string;
  } | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const handleAbstractClick = async (pub: Publication) => {
    if (!patientId) {
      alert('Patient ID is required to generate summaries');
      return;
    }

    setSelectedPublication(pub);
    setLoadingSummary(true);
    setGeneratedSummary(null);

    try {
      // First try to get existing summary
      const existingResponse = await fetch(`/api/generate-summary?publicationId=${pub.id}&patientId=${patientId}`);
      
      if (existingResponse.ok) {
        const existingSummary = await existingResponse.json();
        setGeneratedSummary(existingSummary);
        setLoadingSummary(false);
        return;
      }

      // If no existing summary, generate new one
      const response = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicationId: pub.id,
          patientId: patientId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to generate summary');
      }

      const summary = await response.json();
      setGeneratedSummary(summary);
    } catch (error) {
      console.error('Error generating summary:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate summary. Please try again.';
      alert(errorMessage);
    } finally {
      setLoadingSummary(false);
    }
  }; 
  
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


  // Effect to handle modal state and disable scrolling
  useEffect(() => {
    const preventScroll = (e: Event) => {
      // Allow scrolling within modal content
      const target = e.target as Element;
      if (target && target.closest('.modal-content')) {
        return; // Allow scrolling within modal content
      }
      e.preventDefault();
      e.stopPropagation();
    };

    const container = containerRef.current;

    if (selectedPublication) {
      // Save current scroll position before opening modal
      if (container) {
        savedScrollPosition.current = container.scrollLeft;
      }
      
      // Disable body scroll when modal is open
      document.body.style.overflow = 'hidden';
      // Hide scrollbar on timeline container
      if (container) {
        container.style.overflow = 'hidden';
      }
      // Add global event listeners to prevent scrolling outside modal
      document.addEventListener('wheel', preventScroll, { passive: false });
      document.addEventListener('touchmove', preventScroll, { passive: false });
      document.addEventListener('keydown', (e) => {
        // Allow scrolling within modal content
        const target = e.target as Element;
        if (target && target.closest('.modal-content')) {
          return; // Allow keyboard navigation within modal
        }
        // Prevent arrow keys, page up/down, home, end
        if ([32, 33, 34, 35, 36, 37, 38, 39, 40].includes(e.keyCode)) {
          e.preventDefault();
        }
      });
    } else {
      // Re-enable body scroll when modal is closed
      document.body.style.overflow = 'auto';
      // Re-enable scrollbar on timeline container
      if (container) {
        container.style.overflow = 'auto';
      }
      
      // Restore saved scroll position after a brief delay to ensure other effects have run
      if (savedScrollPosition.current !== null && container) {
        setTimeout(() => {
          if (container && savedScrollPosition.current !== null) {
            container.scrollLeft = savedScrollPosition.current;
            savedScrollPosition.current = null;
          }
        }, 0);
      }
      
      // Remove global event listeners
      document.removeEventListener('wheel', preventScroll);
      document.removeEventListener('touchmove', preventScroll);
    }

    // Cleanup function
    return () => {
      document.body.style.overflow = 'auto';
      if (container) {
        container.style.overflow = 'auto';
      }
      document.removeEventListener('wheel', preventScroll);
      document.removeEventListener('touchmove', preventScroll);
    };
  }, [selectedPublication]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Don't set up scroll handlers if modal is open
    if (selectedPublication) return;

    // Only set initial scroll if we haven't restored a saved position
    if (savedScrollPosition.current === null) {
      // Set the initial scroll to center the last dot. Because of our new width
      // calculation, this is also the maximum scroll position.
      container.scrollLeft = lastDotPosition - startPadding;
    } else {
      // If we have a saved position, restore it immediately
      container.scrollLeft = savedScrollPosition.current;
      savedScrollPosition.current = null;
    } 
    
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
  }, [lastDotPosition, startPadding, sortedPublications, positionMap, selectedPublication]);

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
      className={`w-full h-full overflow-x-auto overflow-y-hidden py-12 bg-gray-800 rounded-lg border border-gray-700 relative ${
        selectedPublication ? 'scrollbar-hide' : 'scrollbar-hide'
      }`}
      style={{ 
        minHeight: '500px',
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
        backgroundSize: '20px 20px'
      }}
    >
      {/* Title Carousel - positioned above timeline */}
      <div className="absolute top-1/2 -translate-y-48 left-0 right-0 h-40 overflow-visible z-30">
        {sortedPublications.map((pub) => {
          // Only render cards for publications with titles and not prescription markers
          if (!pub.title || pub.isPrescriptionMarker) {
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
                width: isCentered ? '380px' : '320px',
                height: isCentered ? '220px' : '140px',
                zIndex: isCentered ? 50 : 10
              }}
            >
                <div
                  className={`h-full p-5 rounded-lg shadow-lg border transition-all duration-500 flex flex-col ${
                    isCentered 
                      ? 'bg-indigo-900/95 border-indigo-500 shadow-indigo-900/50 cursor-pointer hover:bg-indigo-800/95' 
                      : 'bg-gray-800/90 border-gray-600 cursor-default'
                  }`}
                  onClick={() => isCentered && handleAbstractClick(pub)}
                >
                <p className={`text-base leading-relaxed transition-all duration-300 flex-1 overflow-hidden font-medium ${
                  isCentered 
                    ? 'text-gray-200 line-clamp-8' 
                    : 'text-gray-400 line-clamp-3'
                }`}>
                  {pub.title ? decodeHtmlEntities(pub.title) : 'Title not available'}
                </p>
                {isCentered && (
                  <div className="mt-3 flex items-center justify-between border-t border-indigo-400/30 pt-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-indigo-200 font-medium">Click to analyze</span>
                    </div>
                    <svg className="w-4 h-4 text-indigo-300 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
                </div>
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
              onClick={isPrescription ? undefined : () => handleAbstractClick(pub)}
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
              
              {/* Impact Score Stars - only show for publications, not prescription markers */}
              {!isPrescription && pub.impactScore !== undefined && pub.impactScore > 0 && (
                <div className="flex items-center space-x-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-3 h-3 ${
                        star <= pub.impactScore!
                          ? 'text-yellow-400'
                          : 'text-gray-600'
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              )}
              
              <span className={`text-base mt-2 whitespace-nowrap ${
                isPrescription ? 'text-indigo-300 font-semibold' : 'text-gray-300'
              }`}>
                {isPrescription && pub.title.startsWith("Started") && pub.title}
              </span>
              
              {/* Show simple title for centered publication */}
              {isCentered && !isPrescription && (
                <div className="absolute top-full mt-4 w-64 p-3 text-white rounded-lg shadow-xl border z-30 bg-gray-800 border-gray-700">
                  <h3 className="text-sm font-semibold text-purple-300 text-center">
                    {pub.drug.name}
                  </h3>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Modal */}
      {selectedPublication && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm 
                     flex items-center justify-center z-50 p-4"
          onClick={() => {
            setSelectedPublication(null);
            setGeneratedSummary(null);
          }}
          style={{ overflow: 'hidden' }}
        >
          <div 
            className="bg-gray-900/95 backdrop-blur-md rounded-2xl 
                       border border-gray-700/50 max-w-4xl max-h-[85vh] overflow-hidden 
                       shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-700/50 bg-gray-800/30 
                            flex justify-between items-start">
              <div className="flex-1 pr-4">
                <h2 className="text-xl font-semibold text-white leading-tight mb-3">
                  {selectedPublication.title}
                </h2>
                <a 
                  href={selectedPublication.pdfUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 
                             bg-indigo-600/80 hover:bg-indigo-500/80
                             text-white rounded-lg text-sm font-medium
                             transition-all duration-200 hover:shadow-lg"
                >
                  View Full Study
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
              <button
                onClick={() => {
                  setSelectedPublication(null);
                  setGeneratedSummary(null);
                }}
                className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50
                           text-gray-400 hover:text-white transition-colors duration-200 flex-shrink-0"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh] scrollbar-hide modal-content">
              {loadingSummary ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                  <span className="ml-3 text-gray-300">Generating AI summary...</span>
                </div>
              ) : generatedSummary ? (
                <div className="space-y-6">
                  {/* Impact Score */}
                  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                    <h3 className="text-lg font-semibold text-white mb-3">Impact Score</h3>
                    <div className="flex items-center space-x-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className={`w-6 h-6 ${
                              star <= generatedSummary.impactScore
                                ? 'text-yellow-400'
                                : 'text-gray-600'
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-gray-300 text-lg font-medium">
                        {generatedSummary.impactScore}/5
                      </span>
                    </div>
                  </div>

                  {/* AI Summary */}
                  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                    <h3 className="text-lg font-semibold text-white mb-3">AI Summary</h3>
                    <p className="text-gray-200 leading-relaxed">
                      {generatedSummary.summary}
                    </p>
                  </div>

                  {/* Patient Relevance */}
                  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                    <h3 className="text-lg font-semibold text-white mb-3">Patient Relevance</h3>
                    <p className="text-gray-200 leading-relaxed">
                      {generatedSummary.relevanceSummary}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">Click on a publication to generate AI insights</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}