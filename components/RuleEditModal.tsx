// components/RuleEditModal.tsx
import React, { useState, useEffect } from 'react';
import { PromptBlock, PromptCondition, ConditionElement, PromptConditionGroup, KnowledgeBase } from '../types/index';
import Modal from './ui/Modal';
import Button from './ui/Button';
import InputField from './ui/InputField';
import { VIETNAMESE } from '../constants';
import { CONDITION_TEMPLATES, cloneTemplateAndAssignNewIds } from '../constants/conditionTemplates';
import { copyToClipboard, pasteFromClipboard, isClipboardEmpty, interpolate } from '../utils/gameLogicUtils';
import ToggleSwitch from './ui/ToggleSwitch';


interface RuleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  block: PromptBlock;
  knowledgeBase: KnowledgeBase; 
  currentContent: string;
  defaultContent: string;
  onSave: (updatedBlock: PromptBlock, newContent?: string) => void;
  onDelete: (id: string, label: string) => void; // Added onDelete
  onOpenExplorer: () => void;
  onOpenLibrary: () => void;
}

const fieldOptions: { value: PromptCondition['field'], label: string }[] = [
    { value: 'location_type', label: 'Loại địa điểm' },
    { value: 'player_status', label: 'Trạng thái người chơi' },
    { value: 'location_name', label: 'Tên địa điểm' },
    { value: 'player_hp_percent', label: 'Sinh lực (%)' },
    { value: 'player_mp_percent', label: 'Linh lực (%)' },
    { value: 'player_currency', label: 'Số tiền' },
    { value: 'player_has_item', label: 'Sở hữu vật phẩm' },
    { value: 'quest_status', label: 'Trạng thái nhiệm vụ' },
    { value: 'world_hour', label: 'Giờ trong ngày' },
    { value: 'world_season', label: 'Mùa trong năm' },
    { value: 'npc_affinity', label: 'Thiện cảm NPC' },
    { value: 'player_in_combat', label: 'Đang chiến đấu' },
    { value: 'location_is_safe', label: 'Là nơi an toàn' },
];

const operatorOptions: Record<string, { value: PromptCondition['operator'], label: string }[]> = {
    string: [
        { value: 'IS', label: 'LÀ' },
        { value: 'IS_NOT', label: 'KHÔNG PHẢI LÀ' },
        { value: 'CONTAINS', label: 'CHỨA' },
    ],
    number: [
        { value: 'GREATER_THAN', label: 'LỚN HƠN' },
        { value: 'LESS_THAN', label: 'NHỎ HƠN' },
        { value: 'EQUALS', label: 'BẰNG' },
    ],
    boolean: [
        { value: 'IS', label: 'LÀ' },
    ],
    complex: [
        { value: 'IS', label: 'LÀ' },
        { value: 'IS_NOT', label: 'KHÔNG PHẢI LÀ' },
        { value: 'CONTAINS', label: 'CHỨA' },
        { value: 'GREATER_THAN', label: 'LỚN HƠN' },
        { value: 'LESS_THAN', label: 'NHỎ HƠN' },
        { value: 'EQUALS', label: 'BẰNG' },
    ],
};

const getFieldType = (field: PromptCondition['field']): 'string' | 'number' | 'boolean' | 'complex' => {
    switch (field) {
        case 'player_hp_percent':
        case 'player_mp_percent':
        case 'player_currency':
        case 'world_hour':
            return 'number';
        case 'player_in_combat':
        case 'location_is_safe':
            return 'boolean';
        case 'player_has_item':
        case 'quest_status':
        case 'npc_affinity':
            return 'complex';
        default:
            return 'string';
    }
};


const RuleEditModal: React.FC<RuleEditModalProps> = ({ isOpen, onClose, block, knowledgeBase, currentContent, defaultContent, onSave, onDelete, onOpenExplorer, onOpenLibrary }) => {
  const [activeTab, setActiveTab] = useState<'content' | 'conditions'>('content');
  
  const [editedLabel, setEditedLabel] = useState(block.label);
  const [editedContent, setEditedContent] = useState(currentContent);
  const [editedIncludeLabel, setEditedIncludeLabel] = useState(block.includeLabelInPrompt ?? true);
  const [conditions, setConditions] = useState<ConditionElement[]>([]);
  const [previewContent, setPreviewContent] = useState(''); // NEW: For live preview

  const [hasChanges, setHasChanges] = useState(false);
  const [clipboardEmpty, setClipboardEmpty] = useState(isClipboardEmpty());

  useEffect(() => {
    if (isOpen) {
      setActiveTab('content');
      setEditedLabel(block.label);
      setEditedContent(currentContent);
      setEditedIncludeLabel(block.includeLabelInPrompt ?? true);

      const rawConditions = block.conditions || [];
      const migratedConditions = rawConditions.map(c => {
        if (!('type' in c)) {
            return { ...c, type: 'condition' } as PromptCondition;
        }
        return c;
      });
      setConditions(JSON.parse(JSON.stringify(migratedConditions)));
      
      setHasChanges(false);
      setClipboardEmpty(isClipboardEmpty());
    }
  }, [block, currentContent, isOpen]);
  
  useEffect(() => {
    if (isOpen && activeTab === 'content' && knowledgeBase) {
        const interpolated = interpolate(editedContent, knowledgeBase);
        setPreviewContent(interpolated);
    }
  }, [editedContent, isOpen, activeTab, knowledgeBase]);

  const handleAnyChange = () => {
    if (!hasChanges) setHasChanges(true);
  };
  
  const updateNestedState = (path: (string | number)[], value: any, action: 'update' | 'add' | 'remove') => {
      setConditions(prevConditions => {
          const newConditions = JSON.parse(JSON.stringify(prevConditions));
  
          const findTargetContext = () => {
              let parent: any = null;
              let current: any = newConditions;
              let finalKey: string | number = -1;
  
              if (path.length === 0) {
                  return { parent: { children: newConditions }, key: 'children', target: newConditions };
              }
  
              for (let i = 0; i < path.length; i++) {
                  const key = path[i];
                  parent = current;
                  finalKey = key;
                  current = current[key];
              }
              return { parent, key: finalKey, target: current };
          };
  
          const { parent, key, target } = findTargetContext();
  
          if (action === 'add') {
              if (Array.isArray(target)) {
                  target.push(value);
              }
          } else if (action === 'update') {
              if (parent) {
                  parent[key] = value;
              }
          } else if (action === 'remove') {
              if (Array.isArray(parent) && typeof key === 'number') {
                  parent.splice(key, 1);
              }
          }
  
          handleAnyChange();
          return newConditions;
      });
  };

  const handleSave = () => {
    const updatedBlock = { ...block, label: editedLabel, conditions: conditions, includeLabelInPrompt: editedIncludeLabel };
    onSave(updatedBlock, editedContent);
  };

  const handleResetContent = () => {
    setEditedContent(defaultContent);
    handleAnyChange();
  };

  const handleDelete = () => {
      onDelete(block.id, block.label);
  };
  
  const activeTabStyle = "border-indigo-400 text-indigo-300";
  const inactiveTabStyle = "border-transparent text-gray-400 hover:border-gray-500 hover:text-gray-200";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Chỉnh Sửa Quy Tắc: ${block.label}`}>
      <div className="flex flex-col h-[60vh]">
        <div className="border-b border-gray-700 mb-4">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            <button onClick={() => setActiveTab('content')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'content' ? activeTabStyle : inactiveTabStyle}`}>
              Nội dung & Tiêu đề
            </button>
            <button onClick={() => setActiveTab('conditions')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'conditions' ? activeTabStyle : inactiveTabStyle}`}>
              Điều kiện Kích hoạt
            </button>
          </nav>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
            {activeTab === 'content' && (
                 <div className="space-y-4">
                     <InputField label="Tiêu đề quy tắc" id="rule-editor-label" value={editedLabel} onChange={(e) => { setEditedLabel(e.target.value); handleAnyChange(); }} />
                     <div className="flex justify-between items-center bg-gray-900/40 p-3 rounded-md border border-gray-700/50">
                        <label htmlFor="include-label-toggle" className="text-sm font-medium text-gray-300">
                            Gửi kèm tiêu đề vào prompt?
                            <p className="text-xs text-gray-400 mt-1">Bật để gửi `**Tiêu đề:**` trước nội dung. Tắt để chỉ gửi nội dung.</p>
                        </label>
                        <ToggleSwitch
                            id="include-label-toggle"
                            checked={editedIncludeLabel}
                            onChange={(checked) => { setEditedIncludeLabel(checked); handleAnyChange(); }}
                        />
                     </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label htmlFor="rule-editor-content" className="block text-sm font-medium text-gray-300">Nội dung quy tắc</label>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={onOpenExplorer} className="!text-xs">Khám phá Biến</Button>
                                <Button variant="ghost" size="sm" onClick={onOpenLibrary} className="!text-xs">Thư viện Bộ lọc</Button>
                            </div>
                        </div>
                      <textarea id="rule-editor-content" value={editedContent} onChange={(e) => { setEditedContent(e.target.value); handleAnyChange(); }}
                          className="w-full p-3 bg-gray-900 border border-gray-600 rounded-md font-mono text-sm custom-scrollbar" style={{minHeight: '150px'}} />
                    </div>
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-indigo-300 mb-1">Xem trước Trực tiếp</label>
                        <div className="w-full p-3 bg-gray-900 border border-gray-600 rounded-md text-gray-200 text-sm whitespace-pre-wrap min-h-[100px] font-mono">
                            {previewContent || <span className="text-gray-500 italic font-sans">Bản xem trước sẽ hiện ở đây...</span>}
                        </div>
                    </div>
                </div>
            )}
            
            {activeTab === 'conditions' && (
                <div className="space-y-4">
                    <p className="text-sm text-gray-400 bg-gray-800/50 p-3 rounded-md border border-gray-700/50">
                        Quy tắc này sẽ chỉ được kích hoạt nếu các điều kiện dưới đây là đúng. Logic giữa các mục ở cấp cao nhất luôn là **HOẶC** (OR).
                    </p>
                    {/* The Condition editor UI would go here, which is complex and self-contained */}
                    <p className="text-center text-gray-500 italic py-4">Giao diện chỉnh sửa điều kiện đang được phát triển.</p>
                </div>
            )}
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-2">
        <div className="flex gap-2">
            <Button variant="danger" onClick={handleDelete}>Xóa Quy Tắc Này</Button>
            <Button variant="secondary" onClick={handleResetContent} disabled={activeTab !== 'content'}>Khôi Phục Nội Dung</Button>
        </div>
        <div className="flex space-x-2">
            <Button variant="secondary" onClick={onClose}>{VIETNAMESE.cancelEditButton}</Button>
            <Button variant="primary" onClick={handleSave} disabled={!hasChanges}>{VIETNAMESE.saveEditButton}</Button>
        </div>
      </div>
    </Modal>
  );
};

export default RuleEditModal;