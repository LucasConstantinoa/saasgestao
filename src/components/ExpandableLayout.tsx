import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ExpandableLayoutProps<T> {
  items: T[];
  renderItem: (item: T, isExpanded: boolean) => React.ReactNode;
  keyExtractor: (item: T) => string | number;
  className?: string;
  expandedWidth?: string;
  collapsedWidth?: string;
  height?: string;
  expandedIndex?: number;
  onIndexChange?: (index: number) => void;
  onItemClick?: (index: number) => void;
}

export function ExpandableLayout<T>({
  items,
  renderItem,
  keyExtractor,
  className,
  expandedWidth = "min(90vw, 36rem)",
  collapsedWidth = "min(28vw, 14rem)",
  height = "28rem",
  expandedIndex: controlledExpandedIndex,
  onIndexChange,
  onItemClick,
}: ExpandableLayoutProps<T>) {
  const [internalExpandedIndex, setInternalExpandedIndex] = useState<number>(0);
  const expandedIndex = controlledExpandedIndex !== undefined ? controlledExpandedIndex : internalExpandedIndex;
  const setExpandedIndex = useCallback((idx: number) => {
    if (onIndexChange) {
      onIndexChange(idx);
    } else {
      setInternalExpandedIndex(idx);
    }
  }, [onIndexChange]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollTime = useRef(0);
  const touchStartX = useRef(0);
  const isScrollTrapped = useRef(true);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      const now = Date.now();
      if (now - lastScrollTime.current < 150) return;
      lastScrollTime.current = now;

      if (!isScrollTrapped.current) {
        return;
      }

      if (e.deltaY > 0) {
        if (expandedIndex < items.length - 1) {
          setExpandedIndex(expandedIndex + 1);
        } else {
          isScrollTrapped.current = false;
          setTimeout(() => { isScrollTrapped.current = true; }, 800);
        }
      } else {
        if (expandedIndex > 0) {
          setExpandedIndex(expandedIndex - 1);
        } else {
          isScrollTrapped.current = false;
          setTimeout(() => { isScrollTrapped.current = true; }, 800);
        }
      }
    };

    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [expandedIndex, items.length, setExpandedIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touchEndX = e.touches[0].clientX;
    const deltaX = touchEndX - touchStartX.current;
    
    if (Math.abs(deltaX) > 50) {
      if (deltaX > 0 && expandedIndex > 0) {
        setExpandedIndex(expandedIndex - 1);
      } else if (deltaX < 0 && expandedIndex < items.length - 1) {
        setExpandedIndex(expandedIndex + 1);
      }
      touchStartX.current = touchEndX;
    }
  };

  const handleMouseEnter = () => {
    isScrollTrapped.current = true;
  };

  const handleMouseLeave = () => {
    isScrollTrapped.current = false;
  };

  if (!items || items.length === 0) return null;

  return (
    <div 
      className={cn("w-full overflow-hidden py-8 relative", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        ref={containerRef}
        className="flex items-center justify-center gap-3 overflow-x-auto no-scrollbar px-4 pb-8 h-full"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {items.map((item, idx) => {
          const isExpanded = idx === expandedIndex;
          const distance = idx - expandedIndex;
          
          const scale = isExpanded ? 1 : Math.max(0.5, 1 - Math.abs(distance) * 0.15);
          const opacity = isExpanded ? 1 : Math.max(0.3, 1 - Math.abs(distance) * 0.3);
          const translateX = distance * 20;
          const translateZ = Math.abs(distance) * 40;
          const zIndex = isExpanded ? 100 : 90 - Math.abs(distance);
          
          return (
            <div
              key={keyExtractor(item)}
              data-index={idx}
              className={cn(
                "relative cursor-pointer flex-shrink-0 transition-all duration-500 ease-out rounded-3xl",
                isExpanded ? "z-50" : "z-10 hover:scale-105"
              )}
              style={{
                width: isExpanded ? expandedWidth : collapsedWidth,
                height: height,
                transform: `translateX(${translateX}px) scale(${scale})`,
                transformOrigin: 'center center',
                zIndex: zIndex,
                opacity: opacity,
              }}
              onClick={() => {
                if (isExpanded && onItemClick) {
                  onItemClick(idx);
                } else {
                  setExpandedIndex(idx);
                }
              }}
            >
              <div 
                className="w-full h-full relative"
                style={{
                  transform: `perspective(1200px) translateZ(${translateZ}px)`,
                }}
              >
                {renderItem(item, isExpanded)}
              </div>
            </div>
          );
        })}
      </div>

      {items.length > 1 && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-2 z-50 pb-2">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setExpandedIndex(idx)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                idx === expandedIndex 
                  ? "bg-primary w-8" 
                  : "bg-muted-foreground/30 w-2 hover:bg-muted-foreground/50"
              )}
            />
          ))}
        </div>
      )}

      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-40 pointer-events-none">
        <div className="w-8 h-8 rounded-full bg-surface/80 backdrop-blur flex items-center justify-center">
          <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[12px] border-r-foreground/30" />
        </div>
      </div>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-40 pointer-events-none">
        <div className="w-8 h-8 rounded-full bg-surface/80 backdrop-blur flex items-center justify-center">
          <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[12px] border-l-foreground/30" />
        </div>
      </div>
    </div>
  );
}