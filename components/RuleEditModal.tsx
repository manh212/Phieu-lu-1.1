import React, { useState, useEffect } from 'react';
import { PromptBlock, PromptCondition, ConditionElement, PromptConditionGroup, KnowledgeBase } from '../types/index';
import Modal from './ui/Modal';
import Button from './ui/Button';
import InputField from './ui/InputField';
// FIX: Corrected import paths to resolve module export errors for `CONDITION_TEMPLATES` and `cloneTemplateAndAssignNewIds`.
import { VIETNAMESE } from '../constants';
import { CONDITION_TEMPLATES, cloneTemplateAndAssignNewIds } from '../constants/conditionTemplates';
import { copyToClipboard, pasteFromClipboard, isClipboardEmpty, interpolate } from '../utils/gameLogicUtils';


interface RuleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  block: PromptBlock;
  knowledgeBase: KnowledgeBase; 
  currentContent: string;
  defaultContent: string;
  onSave: (updatedBlock: PromptBlock, newContent?: string) => void;
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


const RuleEditModal: React.FC<RuleEditModalProps> = ({ isOpen, onClose, block, knowledgeBase, currentContent, defaultContent, onSave, onOpenExplorer, onOpenLibrary }) => {
  const [activeTab, setActiveTab] = useState<'content' | 'conditions'>('content');
  
  const [editedLabel, setEditedLabel] = useState(block.label);
  const [editedContent, setEditedContent] = useState(currentContent);
  const [conditions, setConditions] = useState<ConditionElement[]>([]);
  const [previewContent, setPreviewContent] = useState(''); // NEW: For live preview

  const [hasChanges, setHasChanges] = useState(false);
  const [clipboardEmpty, setClipboardEmpty] = useState(isClipboardEmpty());

  useEffect(() => {
    if (isOpen) {
      setActiveTab('content');
      setEditedLabel(block.label);
      setEditedContent(currentContent);

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
  
  // NEW: Effect for Live Preview
  useEffect(() => {
    if (isOpen && activeTab === 'content' && knowledgeBase) {
        const interpolated = interpolate(editedContent, knowledgeBase);
        setPreviewContent(interpolated);
    }
  }, [editedContent, isOpen, activeTab]);

  const handleAnyChange = () => {
    if (!hasChanges) setHasChanges(true);
  };
  
  const updateNestedState = (path: (string | number)[], value: any, action: 'update' | 'add' | 'remove') => {
      setConditions(prevConditions => {
          const newConditions = JSON.parse(JSON.stringify(prevConditions));
  
          // Helper to traverse the structure and get the parent and the key/index of the target.
          const findTargetContext = () => {
              let parent: any = null;
              let current: any = newConditions; // The root array
              let finalKey: string | number = -1; // -1 indicates root array itself
  
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
              } else {
                  console.error("ADD action target is not an array:", target);
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
    const updatedBlock = { ...block, label: editedLabel, conditions: conditions };
    onSave(updatedBlock, editedContent);
  };

  const handleResetContent = () => {
    setEditedContent(defaultContent);
    handleAnyChange();
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
                    {/* --- START: Live Preview Section --- */}
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-indigo-300 mb-1">Xem trước Trực tiếp</label>
                        <div className="w-full p-3 bg-gray-900 border border-gray-600 rounded-md text-gray-200 text-sm whitespace-pre-wrap min-h-[100px] font-mono">
                            {previewContent || <span className="text-gray-500 italic font-sans">Bản xem trước sẽ hiện ở đây...</span>}
                        </div>
                    </div>
                    {/* --- END: Live Preview Section --- */}
                </div>
            )}
            
            {activeTab === 'conditions' && (
                <div className="space-y-4">
                    <p className="text-sm text-gray-400 bg-gray-800/50 p-3 rounded-md border border-gray-700/50">
                        Quy tắc này sẽ chỉ được kích hoạt nếu các điều kiện dưới đây là đúng. Logic giữa các mục ở cấp cao nhất luôn là **HOẶC** (OR).
                    </p>
                    <ConditionGroupEditor 
                        elements={conditions}
                        path={[]} // Start path at the root array
                        updateNestedState={updateNestedState}
                        knowledgeBase={knowledgeBase}
                        refreshClipboardStatus={() => setClipboardEmpty(isClipboardEmpty())}
                        clipboardEmpty={clipboardEmpty}
                    />
                </div>
            )}
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-2">
        <Button variant="danger" onClick={handleResetContent} disabled={activeTab !== 'content'}>Khôi Phục Nội Dung Mặc Định</Button>
        <div className="flex space-x-2">
            <Button variant="secondary" onClick={onClose}>{VIETNAMESE.cancelEditButton}</Button>
            <Button variant="primary" onClick={handleSave} disabled={!hasChanges}>{VIETNAMESE.saveEditButton}</Button>
        </div>
      </div>
    </Modal>
  );
};

// --- RECURSIVE SUB-COMPONENTS ---
interface ConditionGroupEditorProps {
    elements: ConditionElement[];
    path: (string | number)[];
    updateNestedState: (path: (string | number)[], value: any, action: 'update' | 'add' | 'remove') => void;
    knowledgeBase: any;
    refreshClipboardStatus: () => void;
    clipboardEmpty: boolean;
}

const ConditionGroupEditor: React.FC<ConditionGroupEditorProps> = ({ elements, path, updateNestedState, knowledgeBase, refreshClipboardStatus, clipboardEmpty }) => {
    const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);

    const handleAddCondition = () => {
        const newCond: PromptCondition = { id: `cond-${Date.now()}`, type: 'condition', field: 'location_type', operator: 'IS', value: '' };
        updateNestedState(path, newCond, 'add');
    };
    const handleAddGroup = () => {
        const newGroup: PromptConditionGroup = { id: `group-${Date.now()}`, type: 'group', logic: 'AND', children: [] };
        updateNestedState(path, newGroup, 'add');
    };
     const handleAddFromTemplate = (template: ConditionElement) => {
        const newElement = cloneTemplateAndAssignNewIds(template);
        updateNestedState(path, newElement, 'add');
        setIsTemplateMenuOpen(false);
    };
    const handlePaste = () => {
        const newElement = pasteFromClipboard();
        if (newElement) {
            updateNestedState(path, newElement, 'add');
        }
    };

    return (
        <div className="space-y-3">
            {elements.map((el, index) => {
                const currentPath = [...path, index];
                if (el.type === 'condition') {
                    return <ConditionEditor key={el.id} condition={el} path={currentPath} updateNestedState={updateNestedState} knowledgeBase={knowledgeBase} refreshClipboardStatus={refreshClipboardStatus} />;
                } else {
                    return <GroupContainer key={el.id} group={el} path={currentPath} updateNestedState={updateNestedState} knowledgeBase={knowledgeBase} refreshClipboardStatus={refreshClipboardStatus} clipboardEmpty={clipboardEmpty} />;
                }
            })}
            <div className="flex gap-2 pt-2 border-t border-gray-700/50 flex-wrap">
                <Button onClick={handleAddCondition} variant="ghost" size="sm" className="flex-1 border-dashed">+ Điều Kiện</Button>
                <Button onClick={handleAddGroup} variant="ghost" size="sm" className="flex-1 border-dashed">+ Nhóm</Button>
                 <div className="relative flex-1">
                    <Button onClick={() => setIsTemplateMenuOpen(prev => !prev)} variant="ghost" size="sm" className="w-full border-dashed" aria-haspopup="true" aria-expanded={isTemplateMenuOpen}>
                        + Mẫu...
                    </Button>
                    {isTemplateMenuOpen && (
                        <div className="absolute bottom-full left-0 mb-1 w-full bg-gray-700 rounded-lg shadow-lg z-20 border border-gray-600 max-h-48 overflow-y-auto custom-scrollbar">
                             {CONDITION_TEMPLATES.map((template, index) => (
                                <button key={index} onClick={() => handleAddFromTemplate(template.element)} className="block w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-indigo-500 first:rounded-t-lg last:rounded-b-lg">
                                    {template.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <Button onClick={handlePaste} variant="ghost" size="sm" className="flex-1 border-dashed" disabled={clipboardEmpty}>
                    Dán
                </Button>
            </div>
        </div>
    );
};

interface GroupContainerProps extends ConditionGroupEditorProps {
    group: PromptConditionGroup;
}

const GroupContainer: React.FC<Omit<GroupContainerProps, 'elements'>> = ({ group, path, updateNestedState, knowledgeBase, refreshClipboardStatus, clipboardEmpty }) => {
    const handleLogicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newGroup = { ...group, logic: e.target.value as 'AND' | 'OR' };
        updateNestedState(path, newGroup, 'update');
    };
    const handleTriggerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newGroup = { ...group, trigger: e.target.value as any };
        updateNestedState(path, newGroup, 'update');
    };
    const handleRemoveGroup = () => updateNestedState(path, null, 'remove');
    const handleCopy = () => { copyToClipboard(group); refreshClipboardStatus(); };
    
    return (
        <div className="p-3 border border-gray-600 rounded-md bg-gray-900/30 space-y-3">
            <div className="flex justify-between items-center gap-2 flex-wrap">
                <select value={group.logic} onChange={handleLogicChange} className="bg-gray-700 text-sm rounded p-1 border-gray-600 focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="AND">Kích hoạt khi TẤT CẢ đúng (AND)</option>
                    <option value="OR">Kích hoạt khi BẤT KỲ đúng (OR)</option>
                </select>
                 <select value={group.trigger || 'always'} onChange={handleTriggerChange} className="bg-gray-700 text-sm rounded p-1 border-gray-600 focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="always">Luôn kiểm tra</option>
                    <option value="on_true">Trigger 1 lần khi đúng</option>
                    <option value="on_false">Trigger 1 lần khi sai</option>
                </select>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={handleCopy} className="!p-1.5 leading-none">Sao chép</Button>
                    <Button variant="danger" size="sm" onClick={handleRemoveGroup} className="!p-1.5 leading-none">Xóa Nhóm</Button>
                </div>
            </div>
            <div className="pl-3 border-l-2 border-gray-700">
                 <ConditionGroupEditor elements={group.children} path={[...path, 'children']} updateNestedState={updateNestedState} knowledgeBase={knowledgeBase} refreshClipboardStatus={refreshClipboardStatus} clipboardEmpty={clipboardEmpty}/>
            </div>
        </div>
    );
};

interface ConditionEditorProps {
    condition: PromptCondition;
    path: (string | number)[];
    updateNestedState: any;
    knowledgeBase: any;
    refreshClipboardStatus: () => void;
}

const ConditionEditor: React.FC<ConditionEditorProps> = ({ condition, path, updateNestedState, knowledgeBase, refreshClipboardStatus }) => {
    const handleFieldChange = (field: keyof PromptCondition, value: any) => {
        const newCondition = { ...condition, [field]: value };
        // Reset operator if it's not compatible with the new field type
        const newFieldType = getFieldType(newCondition.field);
        if (!operatorOptions[newFieldType].some(op => op.value === newCondition.operator)) {
            newCondition.operator = operatorOptions[newFieldType][0].value;
        }
        updateNestedState(path, newCondition, 'update');
    };
    const handleRemove = () => updateNestedState(path, null, 'remove');
    const handleCopy = () => { copyToClipboard(condition); refreshClipboardStatus(); };

    const fieldType = getFieldType(condition.field);

    return (
         <div className="p-2 bg-gray-800/70 rounded-md">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <InputField label="" id={`cond-field-${condition.id}`} type="select" options={fieldOptions.map(o => o.label)}
                    value={fieldOptions.find(o => o.value === condition.field)?.label}
                    onChange={(e) => handleFieldChange('field', fieldOptions.find(o => o.label === e.target.value)!.value)}
                    className="!mb-0" />
                <InputField label="" id={`cond-op-${condition.id}`} type="select" options={operatorOptions[fieldType].map(o => o.label)}
                    value={operatorOptions[fieldType].find(o => o.value === condition.operator)?.label}
                    onChange={(e) => handleFieldChange('operator', operatorOptions[fieldType].find(o => o.label === e.target.value)!.value)}
                    className="!mb-0" />
            </div>
             <div className="mt-2">
                 <ValueEditor fieldType={fieldType} condition={condition} onValueChange={(value) => handleFieldChange('value', value)} knowledgeBase={knowledgeBase} />
            </div>
            <div className="flex justify-between items-center mt-2">
                <select value={condition.trigger || 'always'} onChange={(e) => handleFieldChange('trigger', e.target.value)} className="bg-gray-700 text-xs rounded p-1 border-gray-600 focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="always">Luôn kiểm tra</option>
                    <option value="on_true">Trigger 1 lần khi đúng</option>
                    <option value="on_false">Trigger 1 lần khi sai</option>
                </select>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={handleCopy} className="!py-1 !px-2 text-xs">Sao chép</Button>
                    <Button variant="danger" size="sm" onClick={handleRemove} className="!py-1 !px-2 text-xs">Xóa</Button>
                </div>
            </div>
        </div>
    );
};

const ValueEditor: React.FC<{ fieldType: 'string' | 'number' | 'boolean' | 'complex', condition: PromptCondition, onValueChange: (value: any) => void, knowledgeBase: any }> = ({ fieldType, condition, onValueChange, knowledgeBase }) => {
    switch (fieldType) {
        case 'number':
            return <InputField label="" type="number" id={`cond-value-${condition.id}`} value={condition.value ?? ''} onChange={(e) => onValueChange(parseFloat(e.target.value))} placeholder="Nhập giá trị số..." className="!mb-0" />;
        case 'boolean':
            return <InputField label="" type="select" id={`cond-value-${condition.id}`} options={['true', 'false']} value={String(condition.value)} onChange={(e) => onValueChange(e.target.value)} className="!mb-0" />;
        case 'complex':
            if (condition.field === 'player_has_item') {
                return <InputField label="" id={`cond-value-${condition.id}`} value={condition.value ?? ''} onChange={(e) => onValueChange(e.target.value)} placeholder="Nhập tên vật phẩm..." className="!mb-0" />;
            }
            if (condition.field === 'quest_status') {
                return <div className="grid grid-cols-2 gap-2">
                    <InputField label="" id={`cond-value-quest-title-${condition.id}`} value={condition.value?.title ?? ''} onChange={(e) => onValueChange({ ...condition.value, title: e.target.value })} placeholder="Nhập tên nhiệm vụ..." className="!mb-0" />
                    <InputField label="" type="select" id={`cond-value-quest-status-${condition.id}`} options={['active', 'completed', 'failed']} value={condition.value?.status ?? 'active'} onChange={(e) => onValueChange({ ...condition.value, status: e.target.value })} className="!mb-0" />
                </div>;
            }
            if (condition.field === 'npc_affinity') {
                const npcOptions = [...knowledgeBase.discoveredNPCs, ...knowledgeBase.wives, ...knowledgeBase.slaves].map((npc: any) => npc.name);
                return <div className="grid grid-cols-2 gap-2">
                    <InputField label="" type="select" id={`cond-value-npc-name-${condition.id}`} options={npcOptions} value={condition.value?.name ?? ''} onChange={(e) => onValueChange({ ...condition.value, name: e.target.value })} className="!mb-0" />
                    <InputField label="" type="number" id={`cond-value-npc-value-${condition.id}`} value={condition.value?.value ?? ''} onChange={(e) => onValueChange({ ...condition.value, value: parseFloat(e.target.value) })} placeholder="Nhập giá trị thiện cảm..." className="!mb-0" />
                </div>;
            }
            return null;
        default:
            return <InputField label="" id={`cond-value-${condition.id}`} value={condition.value ?? ''} onChange={(e) => onValueChange(e.target.value)} placeholder="Nhập giá trị..." className="!mb-0" />;
    }
};

export default RuleEditModal;