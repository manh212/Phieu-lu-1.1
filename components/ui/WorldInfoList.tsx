

import React from 'react';
import Button from './Button';

// Generic type constraint: T must have an 'id' and either 'name' or 'title'.
// FIX: Corrected typo from stirng to string
export interface WorldInfoListProps<T extends {id: string, name: string} | {id: string, title: string}> {
  items: T[];
  onItemClick: (item: T) => void;
  onEditClick?: (item: T) => void; // New: Optional handler for the edit button
  emptyMessage: string;
  getItemDisplay: (item: T) => React.ReactNode; // Changed to React.ReactNode
  getItemTitleString: (item: T) => string; // New prop for string title for aria attributes
}

function WorldInfoList<T extends {id: string, name: string} | {id: string, title: string}>({ items, onItemClick, onEditClick, emptyMessage, getItemDisplay, getItemTitleString }: WorldInfoListProps<T>) {
  if (items.length === 0) {
    return <p className="text-gray-400 italic p-2 text-sm">{emptyMessage}</p>;
  }
  return (
    <ul className="space-y-1">
      {items.map(item => {
        const displayNode = getItemDisplay(item);
        const titleString = getItemTitleString(item);
        return (
          <li
            key={item.id}
            className="text-sm text-gray-300 hover:bg-gray-700 p-2 rounded transition-colors flex justify-between items-center group"
          >
            <div
              className="flex-grow flex items-center cursor-pointer"
              onClick={() => onItemClick(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onItemClick(item)}
              aria-label={`Details for ${titleString}`}
              title={titleString} // Show full text on hover
            >
                {displayNode}
            </div>
            {onEditClick && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="!p-1.5 ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                    onClick={(e) => {
                        e.stopPropagation();
                        onEditClick(item);
                    }}
                    title={`Chỉnh sửa ${titleString}`}
                    aria-label={`Chỉnh sửa ${titleString}`}
                >
                    ✏️
                </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default React.memo(WorldInfoList) as typeof WorldInfoList;