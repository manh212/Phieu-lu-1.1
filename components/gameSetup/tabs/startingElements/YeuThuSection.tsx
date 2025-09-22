

import React from 'react';
// FIX: Corrected import path for types.
import { WorldSettings, StartingYeuThu } from '@/types/index';
import { VIETNAMESE } from '../../../../constants';
import InputField from '../../../ui/InputField';
import Button from '../../../ui/Button';

interface YeuThuSectionProps {
  settings: WorldSettings;
  handleStartingYeuThuChange: (index: number, field: keyof StartingYeuThu, value: string | boolean) => void;
  addStartingYeuThu: () => void;
  removeStartingYeuThu: (index: number) => void;
  handlePinToggle: (index: number) => void;
}

const YeuThuSection: React.FC<YeuThuSectionProps> = ({ settings, handleStartingYeuThuChange, addStartingYeuThu, removeStartingYeuThu, handlePinToggle }) => {
  return (
    <>
      {(settings.startingYeuThu || []).map((yeuThu, index) => (
        <div key={index} className="space-y-2 border-b border-gray-800 py-3">
          <InputField label={`Tên Yêu Thú ${index + 1}`} id={`yeuthuName-${index}`} value={yeuThu.name} onChange={(e) => handleStartingYeuThuChange(index, 'name', e.target.value)} />
          <InputField label="Loài" id={`yeuthuSpecies-${index}`} value={yeuThu.species} onChange={(e) => handleStartingYeuThuChange(index, 'species', e.target.value)} placeholder="Ví dụ: Hỏa Lang, Băng Giao..." />
          <InputField label="Mô Tả" id={`yeuthuDesc-${index}`} value={yeuThu.description} onChange={(e) => handleStartingYeuThuChange(index, 'description', e.target.value)} textarea rows={2} />
          {settings.isCultivationEnabled && (
            <InputField 
              label="Cảnh Giới (Tùy chọn)" 
              id={`yeuthuRealm-${index}`} 
              value={yeuThu.realm || ''} 
              onChange={(e) => handleStartingYeuThuChange(index, 'realm', e.target.value)} 
              placeholder="Vd: Luyện Khí Kỳ, Trúc Cơ Viên Mãn" 
            />
          )}
          <InputField label="Thù Địch?" id={`yeuthuHostile-${index}`} type="checkbox" checked={yeuThu.isHostile} onChange={(e) => handleStartingYeuThuChange(index, 'isHostile', (e.target as HTMLInputElement).checked)} />

          <div className="flex justify-between items-center mt-2">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePinToggle(index)}
                className={`!py-1 !px-2 text-xs w-24 justify-center transition-colors ${
                    yeuThu.isPinned
                    ? 'text-yellow-300 border-yellow-500 bg-yellow-900/40 hover:bg-yellow-800/60'
                    : 'text-gray-400 border-gray-600 hover:border-yellow-500 hover:text-yellow-300'
                }`}
                title={yeuThu.isPinned ? 'Bỏ ghim khỏi bối cảnh cốt lõi' : 'Ghim yếu tố này vào bối cảnh cốt lõi'}
            >
                {yeuThu.isPinned ? 'Đã ghim' : 'Chưa ghim'}
            </Button>
            <Button variant="danger" size="sm" onClick={() => removeStartingYeuThu(index)}>Xóa Yêu Thú</Button>
          </div>
        </div>
      ))}
      <Button onClick={addStartingYeuThu} variant="secondary" size="sm" className="mt-3">+ Thêm Yêu Thú</Button>
    </>
  );
};

export default YeuThuSection;