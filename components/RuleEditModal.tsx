import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { VIETNAMESE } from '../constants';

interface RuleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  ruleKey: string;
  ruleLabel: string;
  currentContent: string;
  defaultContent: string;
  onSave: (ruleKey: string, newContent: string) => void;
}

const RuleEditModal: React.FC<RuleEditModalProps> = ({
  isOpen, onClose, ruleKey, ruleLabel, currentContent, defaultContent, onSave
}) => {
  const [editedContent, setEditedContent] = useState(currentContent);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setEditedContent(currentContent);
    setHasChanges(false); // Reset changes when modal opens or content changes
  }, [currentContent, isOpen]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setEditedContent(e.target.value);
      setHasChanges(true);
  };

  const handleSave = () => {
    onSave(ruleKey, editedContent);
  };

  const handleReset = () => {
    setEditedContent(defaultContent);
    setHasChanges(true);
  };

  // Override the default Modal's footer buttons by passing an empty fragment
  const customFooter = <></>;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Chỉnh Sửa Quy Tắc: ${ruleLabel}`}>
        <div className="flex flex-col h-[60vh]">
            <p className="text-sm text-gray-400 mb-3">
                Bạn đang chỉnh sửa nội dung của quy tắc <strong className="text-indigo-300">{ruleLabel}</strong>. Những thay đổi này sẽ ảnh hưởng đến cách AI kể chuyện.
            </p>
            <textarea
                value={editedContent}
                onChange={handleContentChange}
                className="flex-grow w-full p-3 bg-gray-900 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 transition-colors duration-150 font-mono text-sm custom-scrollbar"
                rows={15}
                aria-label={`Nội dung quy tắc ${ruleLabel}`}
            />
        </div>
         <div className="mt-6 pt-4 border-t border-gray-700 flex flex-col sm:flex-row justify-between items-center">
            <Button variant="danger" onClick={handleReset}>
                Khôi Phục Mặc Định
            </Button>
            <div className="flex space-x-2">
                <Button variant="secondary" onClick={onClose}>
                    {VIETNAMESE.cancelEditButton || "Hủy"}
                </Button>
                <Button variant="primary" onClick={handleSave} disabled={!hasChanges}>
                    {VIETNAMESE.saveEditButton || "Lưu Thay Đổi"}
                </Button>
            </div>
        </div>
    </Modal>
  );
};

export default RuleEditModal;
