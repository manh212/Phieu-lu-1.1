

import React from 'react';
// FIX: Corrected import path for types.
import { StartingLore } from '@/types/index';
import { VIETNAMESE } from '../../../../constants';
import InputField from '../../../ui/InputField';
import Button from '../../../ui/Button';

interface LoreSectionProps {
  startingLore: StartingLore[];
  handleStartingLoreChange: (index: number, field: keyof StartingLore, value: string) => void;
  addStartingLore: () => void;
  removeStartingLore: (index: number) => void;
  handlePinToggle: (index: number) => void;
}

const LoreSection: React.FC<LoreSectionProps> = ({ startingLore, handleStartingLoreChange, addStartingLore, removeStartingLore, handlePinToggle }) => {
  return (
    <>
      {(startingLore || []).map((lore, index) => (
        <div key={index} className="space-y-2 border-b border-gray-800 py-3">
          <InputField label={`${VIETNAMESE.loreTitleLabel} ${index + 1}`} id={`loreTitle-${index}`} value={lore.title} onChange={(e) => handleStartingLoreChange(index, 'title', e.target.value)} />
          <InputField label={VIETNAMESE.loreContentLabel} id={`loreContent-${index}`} value={lore.content} onChange={(e) => handleStartingLoreChange(index, 'content', e.target.value)} textarea rows={3} />
          <div className="flex justify-between items-center mt-2">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePinToggle(index)}
                className={`!py-1 !px-2 text-xs w-24 justify-center transition-colors ${
                    lore.isPinned
                    ? 'text-yellow-300 border-yellow-500 bg-yellow-900/40 hover:bg-yellow-800/60'
                    : 'text-gray-400 border-gray-600 hover:border-yellow-500 hover:text-yellow-300'
                }`}
                title={lore.isPinned ? 'Bỏ ghim khỏi bối cảnh cốt lõi' : 'Ghim yếu tố này vào bối cảnh cốt lõi'}
            >
                {lore.isPinned ? 'Đã ghim' : 'Chưa ghim'}
            </Button>
            <Button variant="danger" size="sm" onClick={() => removeStartingLore(index)}>{VIETNAMESE.removeLore}</Button>
          </div>
        </div>
      ))}
      <Button onClick={addStartingLore} variant="secondary" size="sm" className="mt-3">{VIETNAMESE.addStartingLore}</Button>
    </>
  );
};

export default LoreSection;