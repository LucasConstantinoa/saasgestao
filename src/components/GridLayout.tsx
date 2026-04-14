import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Branch } from '@/types';

interface GridLayoutProps {
  items: Branch[];
  onItemClick: (branch: Branch) => void;
  renderItem: (branch: Branch, isExpanded: boolean) => React.ReactNode;
}

export function GridLayout({ items, onItemClick, renderItem }: GridLayoutProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const getGridClass = () => {
    if (expandedId === null) {
      return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4';
    }
    const total = items.length;
    if (total <= 2) return 'grid-cols-1 gap-4';
    if (total <= 4) return 'grid-cols-2 gap-4';
    return 'grid-cols-3 gap-4';
  };

  const getItemClasses = (branch: Branch) => {
    const isExpanded = branch.id === expandedId;
    return cn(
      "relative transition-all duration-300 ease-out cursor-pointer min-h-[280px]",
      isExpanded 
        ? "md:col-span-2 md:row-span-2 z-50" 
        : "col-span-1"
    );
  };

  if (!items || items.length === 0) return null;

  return (
    <div className={cn("w-full", getGridClass())}>
      {items.map((branch) => {
        const isExpanded = branch.id === expandedId;
        return (
          <div
            key={branch.id}
            className={getItemClasses(branch)}
            onClick={() => {
              if (expandedId === branch.id) {
                onItemClick(branch);
                setExpandedId(null);
              } else {
                setExpandedId(branch.id);
              }
            }}
          >
            <div className={cn(
              "w-full h-full relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
              isExpanded ? "ring-2 ring-primary" : ""
            )}>
              {renderItem(branch, isExpanded)}
            </div>
          </div>
        );
      })}
    </div>
  );
}