// components/CustomBlockEditModal.tsx
import React, { useState, useEffect } from 'react';
import { PromptBlock, KnowledgeBase } from '../types/index';
import Modal from './ui/Modal';
import Button from './ui/Button';
import InputField from './ui/InputField';
import { VIETNAMESE } from '../constants';
import { interpolate } from '../utils/gameLogicUtils';
import ToggleSwitch from './ui/ToggleSwitch';


interface CustomBlockEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  block: PromptBlock | null;
  onSave: (block: PromptBlock) => void;
  onDelete: (id: string) => void;
  onOpenExplorer: () => void;
  onOpenLibrary: () => void;
  knowledgeBase: KnowledgeBase;
}

const AVAILABLE_VARS = [
    '{{PLAYER_NAME}}', '{{CURRENCY_NAME}}', '{{MAIN_REALMS}}', 
    '{{SEASON_CONTEXT}}', '{{TIME_OF_DAY_CONTEXT}}'
];

const CustomBlockEditModal: React.FC<CustomBlockEditModalProps> = ({ isOpen, onClose, block, onSave, onDelete, onOpenExplorer, onOpenLibrary, knowledgeBase }) => {
  const [editedBlock, setEditedBlock] = useState<PromptBlock | null>(null);
  const [previewContent, setPreviewContent] = useState(''); // NEW: For live preview

  useEffect(() => {
    if (block) {
      const blockWithDefaults = { includeLabelInPrompt: true, ...block };
      setEditedBlock(JSON.parse(JSON.stringify(blockWithDefaults)));
    }
  }, [block]);
  
  // NEW: Effect for Live Preview
  useEffect(() => {
    if (isOpen && editedBlock && knowledgeBase) {
        const interpolated = interpolate(editedBlock.content || '', knowledgeBase);
        setPreviewContent(interpolated);
    }
  }, [editedBlock?.content, isOpen]);


  if (!isOpen || !editedBlock) {
    return null;
  }
  
  const handleFieldChange = (field: keyof PromptBlock, value: any) => {
      setEditedBlock(prev => prev ? { ...prev, [field]: value } : null);
  };
  
  const handleInsertVariable = (variable: string) => {
    setEditedBlock(prev => {
        if (!prev) return null;
        return { ...prev, content: (prev.content || '') + variable };
    });
  };

  const handleSave = () => {
    if (editedBlock) {
      onSave(editedBlock);
    }
  };
  
  const handleDelete = () => {
      if (editedBlock && window.confirm(`Bạn có chắc muốn xóa khối "${editedBlock.label}" không?`)) {
          onDelete(editedBlock.id);
      }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={block?.content ? 'Chỉnh Sửa Khối Tùy Chỉnh' : 'Thêm Khối Tùy Chỉnh Mới'}>
      <div className="space-y-4">
        <InputField
          label="Tên Nhãn (Label)"
          id="custom-block-label"
          value={editedBlock.label}
          onChange={(e) => handleFieldChange('label', e.target.value)}
        />
        <div className="flex justify-between items-center bg-gray-900/40 p-3 rounded-md border border-gray-700/50">
            <label htmlFor="custom-include-label-toggle" className="text-sm font-medium text-gray-300">
                Gửi kèm tiêu đề vào prompt?
                <p className="text-xs text-gray-400 mt-1">Bật để gửi `**Tiêu đề:**` trước nội dung. Tắt để chỉ gửi nội dung.</p>
            </label>
            <ToggleSwitch
                id="custom-include-label-toggle"
                checked={editedBlock.includeLabelInPrompt ?? true} // Default to true if undefined
                onChange={(checked) => handleFieldChange('includeLabelInPrompt', checked)}
            />
        </div>
        <InputField
          label="Mô tả"
          id="custom-block-description"
          value={editedBlock.description}
          onChange={(e) => handleFieldChange('description', e.target.value)}
          textarea
          rows={2}
        />
        <div>
            <div className="flex justify-between items-center mb-1">
                 <label htmlFor="custom-block-content" className="block text-sm font-medium text-gray-300">Nội dung</label>
                 <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={onOpenExplorer} className="!text-xs">Khám phá Biến</Button>
                    <Button variant="ghost" size="sm" onClick={onOpenLibrary} className="!text-xs">Thư viện Bộ lọc</Button>
                 </div>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
                {AVAILABLE_VARS.map(variable => (
                    <Button key={variable} size="sm" variant="ghost" className="!text-xs !py-0.5 !px-1.5" onClick={() => handleInsertVariable(variable)}>
                        {variable}
                    </Button>
                ))}
            </div>
            <textarea
                id="custom-block-content"
                value={editedBlock.content || ''}
                onChange={(e) => handleFieldChange('content', e.target.value)}
                rows={8}
                className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 font-mono text-sm custom-scrollbar"
                placeholder="Nhập nội dung của bạn tại đây..."
            />
        </div>
        {/* --- START: Live Preview Section --- */}
        <div className="mt-4">
            <label className="block text-sm font-medium text-indigo-300 mb-1">Xem trước Trực tiếp</label>
            <div className="w-full p-3 bg-gray-900 border border-gray-600 rounded-md text-gray-200 text-sm whitespace-pre-wrap min-h-[80px] font-mono">
                {previewContent || <span className="text-gray-500 italic font-sans">Bản xem trước sẽ hiện ở đây...</span>}
            </div>
        </div>
        {/* --- END: Live Preview Section --- */}
      </div>
      <div className="mt-6 pt-4 border-t border-gray-700 flex justify-between">
        <Button variant="danger" onClick={handleDelete}>
          Xóa Khối
        </Button>
        <div className="flex space-x-2">
            <Button variant="secondary" onClick={onClose}>
                {VIETNAMESE.cancelEditButton}
            </Button>
            <Button variant="primary" onClick={handleSave}>
                {VIETNAMESE.saveEditButton}
            </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CustomBlockEditModal;