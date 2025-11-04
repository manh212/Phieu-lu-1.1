
// components/AIContextScreen.tsx
import React, { useState, useRef, useEffect, useMemo, ChangeEvent } from 'react';
import { AIRulebook, AIPreset, PromptBlock, WorldSettings, PromptCondition, ConditionElement, PromptConditionGroup } from '../types/index';
import Button from './ui/Button';
import { useGame } from '../hooks/useGame';
import { VIETNAMESE, APP_VERSION } from '../constants';
import { DEFAULT_PROMPT_STRUCTURE } from '../constants/promptStructure';
import { DEFAULT_AI_RULEBOOK } from '../constants/systemRulesNormal';
import Modal from './ui/Modal';
import RuleEditModal from './RuleEditModal';
import SavePresetModal from './SavePresetModal';
import ManagePresetsModal from './ManagePresetsModal';
import CustomBlockEditModal from './CustomBlockEditModal';
import InputField from './ui/InputField';
import { getApiSettings } from '../services';
import { getSeason, getTimeOfDayContext, interpolate } from '../utils/gameLogicUtils';
import VariableExplorer from './ai/VariableExplorer';
import FunctionFilterLibrary from './ai/FunctionFilterLibrary';

const formatConditionsForTooltip = (conditions: ConditionElement[], isGroup: boolean = false, groupLogic: 'AND' | 'OR' = 'OR'): string => {
    if (!conditions || conditions.length === 0) return isGroup ? "" : "Không có điều kiện.";

    const triggerMap: Record<string, string> = {
        on_true: ' (Trigger 1 lần khi đúng)',
        on_false: ' (Trigger 1 lần khi sai)'
    };

    const conditionToString = (c: PromptCondition): string => {
        const fieldMap: Record<string, string> = {
            'location_type': 'Loại địa điểm',
            'player_status': 'Trạng thái người chơi',
            'location_name': 'Tên địa điểm',
            'player_hp_percent': 'Sinh lực (%)',
            'player_mp_percent': 'Linh lực (%)',
            'player_currency': 'Số tiền',
            'player_has_item': 'Sở hữu vật phẩm',
            'quest_status': 'Trạng thái nhiệm vụ',
            'world_hour': 'Giờ trong ngày',
            'world_season': 'Mùa trong năm',
            'npc_affinity': 'Thiện cảm với NPC'
        };
        const opMap: Record<PromptCondition['operator'], string> = {
            'IS': 'LÀ',
            'IS_NOT': 'KHÔNG PHẢI LÀ',
            'CONTAINS': 'CHỨA',
            'GREATER_THAN': 'LỚN HƠN',
            'LESS_THAN': 'NHỎ HƠN',
            'EQUALS': 'BẰNG'
        };
        const fieldLabel = fieldMap[c.field] || c.field;
        const opLabel = opMap[c.operator] || c.operator;
        let valueLabel = '';

        // Handle complex value types
        if (c.field === 'npc_affinity' && typeof c.value === 'object' && c.value !== null) {
            return `${fieldLabel} "${c.value?.name || ''}" ${opLabel} ${c.value?.value || 0}`;
        }
        if (c.field === 'quest_status' && typeof c.value === 'object' && c.value !== null) {
            return `${fieldLabel} "${c.value?.title || ''}" ${opLabel} "${c.value?.status || ''}"`;
        }
        if (c.field === 'player_has_item') {
            return `${fieldLabel} chứa "${c.value}"`;
        }
        valueLabel = `"${c.value}"`;
        
        const triggerText = triggerMap[c.trigger || ''] || '';
        return `${fieldLabel} ${opLabel} ${valueLabel}${triggerText}`;
    };
    
    const parts = conditions.map(c => {
        const conditionType = 'type' in c ? c.type : 'condition';

        if (conditionType === 'condition') {
            return conditionToString(c as PromptCondition);
        }
        if (conditionType === 'group') {
            const group = c as PromptConditionGroup;
            const childrenString = formatConditionsForTooltip(group.children, true, group.logic);
            const triggerText = triggerMap[group.trigger || ''] || '';
            return childrenString ? `(${childrenString})${triggerText}` : "";
        }
        return "";
    }).filter(Boolean);

    const joiner = groupLogic === 'AND' ? '\n  VÀ\n' : '\nHOẶC\n';
    const finalString = parts.join(joiner);

    return isGroup ? finalString : "Kích hoạt khi:\n" + finalString;
};

interface AIContextScreenProps {
    onClose: () => void;
}

const AIContextScreen: React.FC<AIContextScreenProps> = ({ onClose }) => {
    const { knowledgeBase, setKnowledgeBase, showNotification, aiPresets, saveNewAIPreset } = useGame();
    
    // --- START: LOCAL DRAFT STATE ---
    // This is the core of the fix. All UI interactions modify this local state.
    const [draftStructure, setDraftStructure] = useState<PromptBlock[]>([]);
    const [draftRulebook, setDraftRulebook] = useState<AIRulebook>(DEFAULT_AI_RULEBOOK);
    const [hasChanges, setHasChanges] = useState(false);
    // --- END: LOCAL DRAFT STATE ---

    const [selectedPresetName, setSelectedPresetName] = useState<string>('load_current_game_config');
    
    const [editingRule, setEditingRule] = useState<{ block: PromptBlock } | null>(null);
    const [editingCustomBlock, setEditingCustomBlock] = useState<PromptBlock | null>(null);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [previewPromptContent, setPreviewPromptContent] = useState('');
    const [isExplorerOpen, setIsExplorerOpen] = useState(false);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [viewFilter, setViewFilter] = useState<'all' | 'enabled' | 'disabled'>('all');


    const [moveModeState, setMoveModeState] = useState<{ sourceIndex: number } | null>(null);

    // Initialize local state from global state ONLY when the component mounts/opens.
    useEffect(() => {
        const initialStructure = knowledgeBase.promptStructure || DEFAULT_PROMPT_STRUCTURE;
        const initialRulebook = knowledgeBase.aiRulebook || DEFAULT_AI_RULEBOOK;
        setDraftStructure(JSON.parse(JSON.stringify(initialStructure)));
        setDraftRulebook(JSON.parse(JSON.stringify(initialRulebook)));

        const activePresetNameInGame = knowledgeBase.activeAiPresetName;
        if (activePresetNameInGame && aiPresets[activePresetNameInGame]) {
            setSelectedPresetName(activePresetNameInGame);
        } else {
            setSelectedPresetName('load_current_game_config');
        }

        setHasChanges(false);
    }, []); 

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && moveModeState) {
                handleCancelMove();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [moveModeState]);

    const markChanges = () => {
        if (!hasChanges) {
            setHasChanges(true);
            setSelectedPresetName('custom'); // Mark as custom change if a preset was loaded
        }
    };

    const handleToggle = (id: string) => {
        setDraftStructure(prev => prev.map(block => block.id === id ? { ...block, enabled: !block.enabled } : block));
        markChanges();
    };
    
    const handleInitiateMove = (index: number) => {
        setMoveModeState({ sourceIndex: index });
    };

    const handleCancelMove = () => {
        setMoveModeState(null);
    };

    const handleCompleteMove = (targetIndex: number) => {
        if (moveModeState === null) return;
        const { sourceIndex } = moveModeState;

        if (sourceIndex === targetIndex) {
            setMoveModeState(null);
            return;
        }
        
        setDraftStructure(prev => {
            const items = [...prev];
            const [reorderedItem] = items.splice(sourceIndex, 1);
            items.splice(targetIndex, 0, reorderedItem);
            return items;
        });

        setMoveModeState(null);
        markChanges();
    };
    
    const handleDeleteBlock = (id: string, label: string) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn khối "${label}" không?`)) {
            setDraftStructure(prev => prev.filter(b => b.id !== id));
            markChanges();
            if (editingRule?.block.id === id) setEditingRule(null);
            if (editingCustomBlock?.id === id) setEditingCustomBlock(null);
        }
    };

    const handleEdit = (block: PromptBlock) => {
        if (block.type === 'custom') {
            setEditingCustomBlock(block);
        } else if (block.rulebookKey) {
            setEditingRule({ block });
        }
    };
    
    const handleSaveRule = (updatedBlock: PromptBlock, newContent?: string) => {
        if (updatedBlock.rulebookKey && newContent !== undefined) {
            setDraftRulebook(prev => ({ ...prev, [updatedBlock.rulebookKey!]: newContent }));
        }
        setDraftStructure(prev => prev.map(b => b.id === updatedBlock.id ? updatedBlock : b));
        
        markChanges();
        setEditingRule(null);
    };

    const handleAddCustomBlock = () => {
        const newBlock: PromptBlock = {
            id: `custom-${Date.now()}`,
            label: "", description: "",
            type: 'custom', enabled: true, isEditable: true, isMovable: true,
            content: '',
        };
        setEditingCustomBlock(newBlock);
    };

    const handleSaveCustomBlock = (blockToSave: PromptBlock) => {
        setDraftStructure(prev => {
            const existingIndex = prev.findIndex(b => b.id === blockToSave.id);
            if (existingIndex > -1) {
                return prev.map(b => b.id === blockToSave.id ? blockToSave : b);
            }
            return [...prev, blockToSave];
        });
        markChanges();
        setEditingCustomBlock(null);
    };
    
    const handleDeleteCustomBlock = (id: string) => {
        setDraftStructure(prev => prev.filter(b => b.id !== id));
        setEditingCustomBlock(null);
        markChanges();
    };
    
    const handlePresetChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const presetName = e.target.value;
        if (presetName === selectedPresetName) return;

        if (hasChanges && !window.confirm("Bạn có thay đổi chưa được lưu. Bạn có chắc muốn tải cấu hình khác và hủy các thay đổi hiện tại không?")) {
            e.target.value = selectedPresetName; // Revert dropdown
            return;
        }

        if (presetName === 'load_current_game_config') {
            setDraftStructure(JSON.parse(JSON.stringify(knowledgeBase.promptStructure || DEFAULT_PROMPT_STRUCTURE)));
            setDraftRulebook(JSON.parse(JSON.stringify(knowledgeBase.aiRulebook || DEFAULT_AI_RULEBOOK)));
            showNotification('Đã nạp cấu hình hiện tại của game.', 'info');
        } else {
            const preset = aiPresets[presetName];
            if (preset) {
                setDraftStructure(JSON.parse(JSON.stringify(preset.configuration.promptStructure || DEFAULT_PROMPT_STRUCTURE)));
                setDraftRulebook(JSON.parse(JSON.stringify(preset.configuration.rulebookContent || DEFAULT_AI_RULEBOOK)));
                showNotification(`Đã nạp preset "${presetName}".`, 'info');
            }
        }
        setSelectedPresetName(presetName);
        setHasChanges(false); 
    };

    const handleSaveChangesAsPreset = (name: string, description: string) => {
        const apiSettings = getApiSettings();
        const newPreset: AIPreset = {
            metadata: { name, description, version: "1.0", appVersion: APP_VERSION, exportedAt: new Date().toISOString() },
            configuration: {
                contextToggles: knowledgeBase.aiContextConfig, 
                rulebookContent: draftRulebook,
                parameters: {
                    temperature: apiSettings.temperature, topK: apiSettings.topK, topP: apiSettings.topP,
                    thinkingBudget: apiSettings.thinkingBudget, maxOutputTokens: apiSettings.maxOutputTokens, seed: apiSettings.seed,
                },
                promptStructure: draftStructure
            }
        };
        saveNewAIPreset(name, newPreset);
        setSelectedPresetName(name);
        setHasChanges(false);
    };
    
    const handleResetToDefault = () => {
        if (window.confirm("Thao tác này sẽ khôi phục tất cả các quy tắc HỆ THỐNG về mặc định của game. Các khối tùy chỉnh của bạn sẽ được giữ lại. Tiếp tục?")) {
            const customBlocks = draftStructure.filter(block => block.type === 'custom');
            const defaultSystemStructure = DEFAULT_PROMPT_STRUCTURE.filter(block => block.type !== 'custom');
            const newStructure = [...defaultSystemStructure, ...customBlocks];
            setDraftStructure(newStructure);
            setDraftRulebook(JSON.parse(JSON.stringify(DEFAULT_AI_RULEBOOK)));
            markChanges();
            showNotification('Đã khôi phục các quy tắc hệ thống về mặc định.', 'info');
        }
    };
    
    const handleApplyChanges = () => {
        setKnowledgeBase(prevKb => ({
            ...prevKb,
            promptStructure: draftStructure,
            aiRulebook: draftRulebook,
        }));
        showNotification('Các thay đổi đã được áp dụng tạm thời!', 'success');
        setHasChanges(false); 
    };

    const handleSaveAndClose = () => {
        const presetNameToPersist = selectedPresetName === 'custom' || selectedPresetName === 'load_current_game_config' 
            ? null 
            : selectedPresetName;
    
        setKnowledgeBase(prevKb => ({
            ...prevKb,
            promptStructure: draftStructure,
            aiRulebook: draftRulebook,
            activeAiPresetName: presetNameToPersist
        }));
        showNotification('Cài đặt Cấu Hình AI đã được lưu & áp dụng!', 'success');
        onClose();
    };

    const handleCloseWithConfirmation = () => {
        if (hasChanges) {
            if (window.confirm("Bạn có các thay đổi chưa được áp dụng hoặc lưu. Bạn có chắc muốn đóng và hủy bỏ chúng không?")) {
                onClose();
            }
        } else {
            onClose();
        }
    };

    const buildPreviewPrompt = (structure: PromptBlock[], rules: AIRulebook, worldConfig: WorldSettings | null): string => {
        if (!worldConfig) return "Lỗi: Không có cấu hình thế giới để tạo bản xem trước.";
        return interpolate(
            structure
                .filter(b => b.enabled)
                .map(b => (b.type === 'custom' ? b.content : (b.rulebookKey ? rules[b.rulebookKey] : '')))
                .join(rules.blockSeparator || '\n\n'),
            knowledgeBase
        );
    };

    const handlePreviewClick = () => {
        const content = buildPreviewPrompt(draftStructure, draftRulebook, knowledgeBase.worldConfig);
        setPreviewPromptContent(content);
        setIsPreviewModalOpen(true);
    };

    const presetOptions = useMemo(() => {
        const options = [
            { value: 'custom', label: '-- Tùy Chỉnh (Chưa lưu) --' },
            { value: 'load_current_game_config', label: VIETNAMESE.loadCurrentConfigPresetName }
        ];
        const savedPresets = Object.keys(aiPresets).sort().map(name => ({ value: name, label: name }));
        return [...options, ...savedPresets];
    }, [aiPresets]);

    const filteredPromptStructure = useMemo(() => {
        const structure = moveModeState ? draftStructure : draftStructure; // Use draft always
        switch (viewFilter) {
            case 'enabled': return structure.filter(block => block.enabled);
            case 'disabled': return structure.filter(block => !block.enabled);
            case 'all': default: return structure;
        }
    }, [draftStructure, viewFilter, moveModeState]);

    return (
        <>
            <Modal isOpen={true} onClose={handleCloseWithConfirmation} title="Cấu Hình Prompt AI">
                <div className="flex flex-col h-[70vh]">
                    <div className="flex-shrink-0 bg-gray-800 p-3 rounded-lg border border-gray-700 space-y-3 mb-4">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                            <InputField
                                label="Cấu hình đã nạp:"
                                id="preset-selector"
                                type="select"
                                value={selectedPresetName}
                                onChange={handlePresetChange}
                                options={presetOptions.map(opt => ({ value: opt.value, label: opt.label }))}
                                className="!mb-0"
                            />
                            <InputField label="Bộ lọc Hiển thị" id="view-filter" type="select"
                                value={viewFilter} onChange={(e) => setViewFilter(e.target.value as any)}
                                options={['Tất cả mục', 'Chỉ mục đã bật', 'Chỉ mục đã tắt'].map(v => ({ value: v.includes('bật') ? 'enabled' : v.includes('tắt') ? 'disabled' : 'all', label: v }))}
                                className="!mb-0"
                            />
                        </div>
                       <div className="flex gap-2 pt-2 border-t border-gray-700">
                           <Button variant="secondary" size="sm" onClick={() => setIsSaveModalOpen(true)}>{VIETNAMESE.savePresetButton}</Button>
                           <Button variant="secondary" size="sm" onClick={() => setIsManageModalOpen(false)}>Quản lý Presets</Button>
                           <Button variant="danger" size="sm" onClick={handleResetToDefault}>Khôi phục Mặc định</Button>
                       </div>
                    </div>

                    <div className="flex-grow overflow-y-auto custom-scrollbar -mx-6 px-6 pb-4 space-y-2">
                         {filteredPromptStructure.map((block) => {
                            const originalIndex = draftStructure.findIndex(b => b.id === block.id);
                            if (originalIndex === -1) return null;
                            if (block.type === 'header') return null;

                            const hasConditions = block.conditions && block.conditions.length > 0;
                            const content = block.type === 'custom'
                                ? block.content || ''
                                : (block.rulebookKey ? draftRulebook[block.rulebookKey] || '' : '');

                            if (moveModeState) {
                                const isSource = moveModeState.sourceIndex === originalIndex;
                                return (
                                    <div key={block.id} className={`p-2 rounded-lg transition-colors ${ isSource ? 'bg-indigo-700 ring-2 ring-indigo-400' : 'bg-gray-800' }`}>
                                        {isSource ? (
                                            <div className="flex items-center text-white p-2">
                                                <span className="font-bold">Đang di chuyển:</span>
                                                <span className="ml-2 italic truncate">{block.label}</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between p-1">
                                                <span className="text-gray-400 truncate">{block.label}</span>
                                                <Button size="sm" variant="secondary" onClick={() => handleCompleteMove(originalIndex)} disabled={!block.isMovable}>Di chuyển đến đây</Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            return (
                                <div key={block.id} className="p-3 bg-gray-800/50 rounded-lg transition-colors hover:bg-gray-800/80 group border border-transparent hover:border-gray-700">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-grow mr-4">
                                            <h2 className="text-base font-semibold text-gray-200" title={block.label}>
                                                <label htmlFor={`toggle-${block.id}`} className="cursor-pointer flex items-center gap-2">
                                                    <span>{block.label}</span>
                                                    {hasConditions && ( <div title={formatConditionsForTooltip(block.conditions!)} className="flex-shrink-0"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 12.414V17a1 1 0 01-1 1h-2a1 1 0 01-1-1v-4.586L3.293 6.707A1 1 0 013 6V3zm3.146 5.854l4-4 .708.708-4 4-.708-.708zm4.708-3.146l-4 4-.708-.708 4-4 .708.708z" clipRule="evenodd" /></svg></div>)}
                                                </label>
                                            </h2>
                                            {content && (<pre className="mt-1 p-2 bg-gray-900/40 border border-gray-700/50 rounded text-xs text-gray-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar">{content}</pre>)}
                                        </div>
                                        <div className="flex items-center flex-shrink-0 ml-auto gap-2">
                                            <button onClick={() => block.isMovable && handleInitiateMove(originalIndex)} disabled={!block.isMovable} className="p-1 text-gray-500 hover:text-white cursor-grab disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded opacity-50 group-hover:opacity-100 focus:opacity-100" aria-label={`Di chuyển ${block.label}`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" /></svg>
                                            </button>
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(block)} className="!py-1 !px-2 text-xs border border-gray-600 opacity-50 group-hover:opacity-100 focus:opacity-100" title={`Chỉnh sửa ${block.label}`}>Sửa</Button>
                                            <div className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" id={`toggle-${block.id}`} checked={block.enabled} onChange={() => handleToggle(block.id)} className="sr-only peer"/>
                                                <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                     <div className="flex-shrink-0 pt-4 border-t border-gray-700">
                        <Button variant="ghost" className="w-full border-dashed" onClick={handleAddCustomBlock}>+ Thêm Khối Văn Bản Tùy Chỉnh</Button>
                    </div>
                </div>

                {moveModeState !== null && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-full max-w-md px-4">
                        <Button variant="danger" onClick={handleCancelMove} className="w-full shadow-lg">Hủy Di Chuyển</Button>
                    </div>
                )}
                <div className="mt-6 pt-4 border-t border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-2">
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={handlePreviewClick}>Xem Trước Prompt...</Button>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={handleCloseWithConfirmation}>{VIETNAMESE.cancelEditButton}</Button>
                        <Button variant="primary" className="bg-cyan-600 hover:bg-cyan-700 focus:ring-cyan-500" onClick={handleApplyChanges} disabled={!hasChanges}>Áp dụng thay đổi</Button>
                        <Button variant="primary" onClick={handleSaveAndClose}>Lưu & Đóng</Button>
                    </div>
                </div>
            </Modal>
            
            {editingRule && ( <RuleEditModal isOpen={!!editingRule} onClose={() => setEditingRule(null)} block={editingRule.block} knowledgeBase={knowledgeBase} currentContent={draftRulebook[editingRule.block.rulebookKey!] || ''} defaultContent={DEFAULT_AI_RULEBOOK[editingRule.block.rulebookKey!] || ''} onSave={handleSaveRule} onDelete={handleDeleteBlock} onOpenExplorer={() => setIsExplorerOpen(true)} onOpenLibrary={() => setIsLibraryOpen(true)}/> )}
            {editingCustomBlock && ( <CustomBlockEditModal isOpen={!!editingCustomBlock} onClose={() => setEditingCustomBlock(null)} block={editingCustomBlock} onSave={handleSaveCustomBlock} onDelete={handleDeleteCustomBlock} onOpenExplorer={() => setIsExplorerOpen(true)} knowledgeBase={knowledgeBase} onOpenLibrary={() => setIsLibraryOpen(true)}/> )}
            <ManagePresetsModal isOpen={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} />
            <SavePresetModal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} onSave={handleSaveChangesAsPreset} existingNames={Object.keys(aiPresets)}/>
            {isPreviewModalOpen && (
                <Modal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} title="Xem Trước Prompt Đầy Đủ">
                    <div className="flex flex-col h-[70vh]">
                        <p className="text-sm text-gray-400 mb-3 flex-shrink-0">Đây là bản xem trước cấu trúc prompt sẽ được gửi đến AI. Các biến sẽ được thay thế bằng dữ liệu game thực tế khi chạy.</p>
                        <textarea readOnly value={previewPromptContent} className="flex-grow w-full p-3 bg-gray-900 border border-gray-600 rounded-md shadow-sm text-gray-200 font-mono text-xs custom-scrollbar" aria-label="Nội dung prompt xem trước"/>
                         <div className="mt-4 flex-shrink-0"><Button variant="secondary" onClick={() => { navigator.clipboard.writeText(previewPromptContent); showNotification("Đã sao chép prompt vào clipboard!", 'success'); }}>Sao chép vào Clipboard</Button></div>
                    </div>
                </Modal>
            )}
            <VariableExplorer isOpen={isExplorerOpen} onClose={() => setIsExplorerOpen(false)} knowledgeBase={knowledgeBase} showNotification={showNotification}/>
            <FunctionFilterLibrary isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)}/>
        </>
    );
};

export default AIContextScreen;
