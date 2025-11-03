import React from 'react';
import { Item } from '@/types/index';
import { VIETNAMESE } from '@/constants';
import Button from '../ui/Button';

interface InventoryPanelProps {
  items: Item[];
  onItemClick: (item: Item) => void;
  onItemEditClick: (item: Item) => void;
}

const InventoryPanel: React.FC<InventoryPanelProps> = React.memo(({items, onItemClick, onItemEditClick}) => {
  return (
    <div className="bg-gray-800 p-3 sm:p-4 rounded-lg shadow-md mb-4">
       <h3 className="text-lg font-semibold text-indigo-400 mb-3 border-b border-gray-700 pb-2">{VIETNAMESE.inventory}</h3>
       {items.length === 0 ? <p className="text-gray-400 italic text-sm">Túi đồ trống rỗng.</p> : (
        <ul className="space-y-1 max-h-48 sm:max-h-60 overflow-y-auto custom-scrollbar">
          {items.map(item => (
            <li
              key={item.id}
              className="text-sm text-gray-300 hover:bg-gray-700 p-2 rounded transition-colors flex justify-between items-center group"
            >
              <div
                className="flex-grow cursor-pointer"
                onClick={() => onItemClick(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onItemClick(item)}
                aria-label={`Details for ${item.name}`}
                title={`${item.name} (x${item.quantity})`}
              >
                <span className="truncate block">
                  <strong className="text-indigo-300">{item.name}</strong> (x{item.quantity})
                </span>
              </div>
               <Button
                    variant="ghost"
                    size="sm"
                    className="!py-1 !px-2 text-xs border border-gray-600 ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                    onClick={(e) => {
                        e.stopPropagation();
                        onItemEditClick(item);
                    }}
                    title={`Chỉnh sửa ${item.name}`}
                    aria-label={`Chỉnh sửa ${item.name}`}
                >
                    Sửa
                </Button>
            </li>
          ))}
        </ul>
       )}
    </div>
  );
});

export default InventoryPanel;