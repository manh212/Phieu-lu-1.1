// components/AIContextScreen.tsx
import React, { useState, useRef, useEffect, useMemo, ChangeEvent, useCallback } from 'react';
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
import ToggleSwitch from './ui/ToggleSwitch';


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
        // Backward compatibility for old format without 'type'
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
    
    const [promptStructure, setPromptStructure] = useState<PromptBlock[]>([]);
    const [rulebook, setRulebook] = useState<AIRulebook>(DEFAULT_AI_RULEBOOK);
    const [hasChanges, setHasChanges] = useState(false);
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
    const [focusOnElementId, setFocusOnElementId] = useState<string | null>(null);


    // NEW: State for "move mode"
    const [moveModeState, setMoveModeState] = useState<{ sourceIndex: number } | null>(null);

    useEffect(() => {
        if (focusOnElementId) {
            const elementToFocus = document.getElementById(focusOnElementId);
            if (elementToFocus) {
                elementToFocus.focus();
            }
            setFocusOnElementId(null); // Reset after focusing
        }
    }, [focusOnElementId]);

    const handleCancelMove = useCallback(() => {
        if (moveModeState) {
            const blockId = promptStructure[moveModeState.sourceIndex]?.id;
            setMoveModeState(null);
            if (blockId) {
                setFocusOnElementId(`move-button-${blockId}`);
            }
        }
    }, [moveModeState, promptStructure]);

    useEffect(() => {
        const initialStructure = knowledgeBase.promptStructure || DEFAULT_PROMPT_STRUCTURE;
        const initialRulebook = knowledgeBase.aiRulebook || DEFAULT_AI_RULEBOOK;
        setPromptStructure(JSON.parse(JSON.stringify(initialStructure)));
        setRulebook(JSON.parse(JSON.stringify(initialRulebook)));

        const activePresetNameInGame = knowledgeBase.activeAiPresetName;
        if (activePresetNameInGame && aiPresets[activePresetNameInGame]) {
            setSelectedPresetName(activePresetNameInGame);
        } else {
            setSelectedPresetName('load_current_game_config');
        }

        setHasChanges(false);
    }, []); // Empty dependency array is the key fix.

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && moveModeState) {
                handleCancelMove();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [moveModeState, handleCancelMove]);

    const markChanges = () => {
        if (!hasChanges) {
            setHasChanges(true);
        }
    };

    const handleToggle = (id: string) => {
        setPromptStructure(prev => prev.map(block => block.id === id ? { ...block, enabled: !block.enabled } : block));
        markChanges();
        setFocusOnElementId(`toggle-${id}`);
    };
    
    // NEW: "Move Mode" handlers
    const handleInitiateMove = (index: number) => {
        setMoveModeState({ sourceIndex: index });
        setTimeout(() => setFocusOnElementId('cancel-move-button'), 0);
    };

    const handleCompleteMove = (targetIndex: number) => {
        if (moveModeState === null) return;
        const { sourceIndex } = moveModeState;
        const movedItem = promptStructure[sourceIndex];

        if (sourceIndex === targetIndex) {
            setMoveModeState(null); // Clicked on itself, cancel.
            if(movedItem) setFocusOnElementId(`move-button-${movedItem.id}`);
            return;
        }
        
        let newStructure = [...promptStructure];
        const [reorderedItem] = newStructure.splice(sourceIndex, 1);
        newStructure.splice(targetIndex, 0, reorderedItem);
        setPromptStructure(newStructure);
        
        if (movedItem) {
            setFocusOnElementId(`move-button-${movedItem.id}`);
        }

        setMoveModeState(null);
        markChanges();
    };
    
    const handleDeleteBlock = (id: string, label: string) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn khối "${label}" không?`)) {
            setPromptStructure(prev => prev.filter(b => b.id !== id));
            markChanges();
            // Close any open modals for the deleted block
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
            setRulebook(prev => ({ ...prev, [updatedBlock.rulebookKey!]: newContent }));
        }
        setPromptStructure(prev => prev.map(b => b.id === updatedBlock.id ? updatedBlock : b));
        
        markChanges();
        setEditingRule(null);
        showNotification(`Quy tắc "${updatedBlock.label}" đã được cập nhật tạm thời!`, 'info');
    };

    const handleAddCustomBlock = () => {
        const newBlock: PromptBlock = {
            id: `custom-${Date.now()}`,
            label: "", // Start with empty label
            description: "", // Start with empty description
            type: 'custom',
            enabled: true,
            isEditable: true,
            isMovable: true,
            content: '',
        };
        setEditingCustomBlock(newBlock);
    };

    const handleSaveCustomBlock = (blockToSave: PromptBlock) => {
        setPromptStructure(prev => {
            const existingIndex = prev.findIndex(b => b.id === blockToSave.id);
            if (existingIndex > -1) {
                const newStructure = [...prev];
                newStructure[existingIndex] = blockToSave;
                return newStructure;
            }
            return [...prev, blockToSave];
        });
        markChanges();
        setEditingCustomBlock(null);
    };
    
    const handleDeleteCustomBlock = (id: string) => {
        setPromptStructure(prev => prev.filter(b => b.id !== id));
        setEditingCustomBlock(null);
        markChanges();
    };
    
    const handlePresetChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const presetName = e.target.value;
        if (presetName === selectedPresetName) return;

        if (hasChanges && !window.confirm("Bạn có thay đổi chưa lưu. Bạn có chắc muốn tải cấu hình khác và hủy các thay đổi hiện tại không?")) {
            e.target.value = selectedPresetName;
            return;
        }

        if (presetName === 'load_current_game_config') {
            setPromptStructure(JSON.parse(JSON.stringify(knowledgeBase.promptStructure || DEFAULT_PROMPT_STRUCTURE)));
            setRulebook(knowledgeBase.aiRulebook || DEFAULT_AI_RULEBOOK);
            showNotification('Đã nạp cấu hình hiện tại của game.', 'info');
            setHasChanges(false);
        } else {
            const preset = aiPresets[presetName];
            if (preset) {
                setPromptStructure(JSON.parse(JSON.stringify(preset.configuration.promptStructure || DEFAULT_PROMPT_STRUCTURE)));
                setRulebook(preset.configuration.rulebookContent || DEFAULT_AI_RULEBOOK);
                showNotification(`Đã nạp preset "${presetName}".`, 'info');
            }
            setHasChanges(true); 
        }
        setSelectedPresetName(presetName);
    };

    const handleSaveChangesAsPreset = (name: string, description: string) => {
        const apiSettings = getApiSettings();
        const newPreset: AIPreset = {
            metadata: { name, description, version: "1.0", appVersion: APP_VERSION, exportedAt: new Date().toISOString() },
            configuration: {
                contextToggles: knowledgeBase.aiContextConfig, 
                rulebookContent: rulebook,
                parameters: {
                    temperature: apiSettings.temperature, topK: apiSettings.topK, topP: apiSettings.topP,
                    thinkingBudget: apiSettings.thinkingBudget, maxOutputTokens: apiSettings.maxOutputTokens, seed: apiSettings.seed,
                },
                promptStructure: promptStructure
            }
        };
        saveNewAIPreset(name, newPreset);
        setSelectedPresetName(name);
    };
    
    const handleResetToDefault = () => {
        if (window.confirm("Thao tác này sẽ khôi phục tất cả các quy tắc HỆ THỐNG về mặc định của game. Các khối tùy chỉnh của bạn sẽ được giữ lại. Tiếp tục?")) {
            const customBlocks = promptStructure.filter(block => block.type === 'custom');
            const defaultSystemStructure = DEFAULT_PROMPT_STRUCTURE.filter(block => block.type !== 'custom');

            const newStructure = [...defaultSystemStructure, ...customBlocks];
            const defaultRulebook = JSON.parse(JSON.stringify(DEFAULT_AI_RULEBOOK));

            setPromptStructure(newStructure);
            setRulebook(defaultRulebook);
            
            markChanges();
            setSelectedPresetName('load_current_game_config');
            showNotification('Đã khôi phục các quy tắc hệ thống về mặc định. Nhấn "Lưu & Áp Dụng" để xác nhận.', 'info');
        }
    };

    const handleApplyAndClose = () => {
        const presetNameToPersist = selectedPresetName === 'load_current_game_config' ? null : selectedPresetName;
    
        setKnowledgeBase(prevKb => ({
            ...prevKb,
            promptStructure,
            aiRulebook: rulebook,
            activeAiPresetName: presetNameToPersist
        }));
        showNotification('Cài đặt Cấu Hình AI đã được áp dụng!', 'success');
        onClose();
    };

    const handleCloseWithConfirmation = () => {
        if (hasChanges) {
            if (window.confirm("Bạn có các thay đổi chưa được áp dụng. Bạn có chắc muốn đóng và hủy bỏ các thay đổi này không?")) {
                onClose();
            }
        } else {
            onClose();
        }
    };

    const buildPreviewPrompt = (structure: PromptBlock[], rules: AIRulebook, worldConfig: WorldSettings | null): string => {
        const finalPromptParts: string[] = [];
        if (!worldConfig) return "Lỗi: Không có cấu hình thế giới để tạo bản xem trước.";
        const interpolatePreview = (text: string): string => {
            const mockDate = { day: 15, month: 6, year: 1, hour: 14, minute: 30 };
            const playerRaceSystem = worldConfig.raceCultivationSystems.find(s => s.raceName === (worldConfig.playerRace || 'Nhân Tộc'));
            const mainRealms = (playerRaceSystem?.realmSystem || '').split(' - ').map(s => s.trim()).filter(Boolean);
            return text
                .replace(/{{PLAYER_NAME}}/g, worldConfig.playerName || '{{TÊN_NHÂN_VẬT}}')
                .replace(/{{CURRENCY_NAME}}/g, worldConfig.currencyName || '{{TIỀN_TỆ}}')
                .replace(/{{MAIN_REALMS}}/g, mainRealms.join(' | ') || '{{CÁC_ĐẠI_CẢNH_GIỚI}}')
                .replace(/{{SEASON_CONTEXT}}/g, getSeason(mockDate))
                .replace(/{{TIME_OF_DAY_CONTEXT}}/g, getTimeOfDayContext(mockDate))
                .replace(/{{WRITING_STYLE_GUIDE}}/g, '{{VĂN_BẢN_MẪU_CỦA_NGƯỜI_DÙNG}}');
        };
        for (const block of structure) {
            if (!block.enabled) continue;
            let blockContent = '';
            switch (block.type) {
                case 'header': blockContent = `\n---\n**${block.label}**`; break;
                case 'custom': if (block.content) { blockContent = `**${block.label}:**\n${interpolatePreview(block.content)}`; } break;
                case 'system':
                    switch (block.id) {
                        case 'ragContext': blockContent = `**${block.label}:**\n{{BỐI_CẢNH_TRUY_XUẤT_TỪ_TRÍ_NHỚ_DÀI_HẠN}}`; break;
                        case 'coreContext': blockContent = `**${block.label}:**\n{{BỐI_CẢNH_CỐT_LÕI_JSON}}`; break;
                        case 'conversationalContext': blockContent = `**${block.label}:**\n- **Tóm tắt trang trước:**\n{{TÓM_TẮT_TRANG_TRƯỚC}}\n- **Diễn biến gần nhất:**\n{{LỜI_KỂ_TRANG_TRƯỚC}}\n- **Diễn biến trang này:**\n{{DIỄN_BIẾN_TRANG_HIỆN_TẠI}}`; break;
                        case 'stagedActionsContext': blockContent = `**${block.label}:**\n{{HÀNH_ĐỘNG_CHỜ_JSON}}`; break;
                        case 'userPrompts': blockContent = `**${block.label} (QUY TẮC BẮT BUỘC):**\n{{CÁC_LỜI_NHẮC_CỦA_NGƯỜI_CHƠI}}`; break;
                        case 'narrativeDirective': blockContent = `**${block.label} (BẮT BUỘC CHO LƯỢT NÀY):**\n{{CHỈ_DẪN_TƯỜNG_THUẬT}}`; break;
                        case 'playerActionGuidance': blockContent = `**${block.label}:**\n- Loại: {{LOẠI_HÀNH_ĐỘNG}}\n- Nội dung: "{{NỘI_DUNG_HÀNH_ĐỘNG}}"`; break;
                        case 'worldEventGuidance': blockContent = `**${block.label} (CỰC KỲ QUAN TRỌNG):**\n{{HƯỚNG_DẪN_SỰ_KIỆN_THẾ_GIỚI}}`; break;
                        case 'responseLengthGuidance': blockContent = `**${block.label}:** {{ĐỘ_DÀI_PHẢN_HỒI}}`; break;
                        default:
                            if (block.rulebookKey && rules[block.rulebookKey]) {
                                blockContent = interpolatePreview(rules[block.rulebookKey]);
                            }
                            break;
                    }
                    break;
            }
            if (blockContent) { finalPromptParts.push(blockContent); }
        }
        return finalPromptParts.join('\n\n');
    };

    const handlePreviewClick = () => {
        const content = buildPreviewPrompt(promptStructure, rulebook, knowledgeBase.worldConfig);
        setPreviewPromptContent(content);
        setIsPreviewModalOpen(true);
    };

    const presetOptions = useMemo(() => {
        const options = [{ value: 'load_current_game_config', label: VIETNAMESE.loadCurrentConfigPresetName }];
        const savedPresets = Object.keys(aiPresets).sort().map(name => ({ value: name, label: name }));
        return [...options, ...savedPresets];
    }, [aiPresets]);

    const filteredPromptStructure = useMemo(() => {
        switch (viewFilter) {
            case 'enabled':
                return promptStructure.filter(block => block.enabled);
            case 'disabled':
                return promptStructure.filter(block => !block.enabled);
            case 'all':
            default:
                return promptStructure;
        }
    }, [promptStructure, viewFilter]);

    return (
        <>
            <Modal isOpen={true} onClose={handleCloseWithConfirmation} title="Cấu Hình Prompt AI">
                <div className="flex flex-col h-[70vh]">
                    <div className="flex-shrink-0 bg-gray-800 p-3 rounded-lg border border-gray-700 space-y-3 mb-4">
                       <p className="text-sm text-gray-300">Quản lý và chuyển đổi giữa các cấu hình prompt đã lưu.</p>
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
                            <div role="radiogroup" aria-labelledby="view-filter-label">
                                <label id="view-filter-label" className="block text-sm font-medium text-gray-300 mb-1">
                                    Bộ lọc Hiển thị
                                </label>
                                <div className="flex bg-gray-900 rounded-lg p-1">
                                    <Button id="filter-all-button" role="radio" aria-checked={viewFilter === 'all'} size="sm" variant={viewFilter === 'all' ? 'primary' : 'ghost'} onClick={() => { setViewFilter('all'); setFocusOnElementId('filter-all-button'); }} className="!py-1 !px-3 flex-1">Tất cả</Button>
                                    <Button id="filter-enabled-button" role="radio" aria-checked={viewFilter === 'enabled'} size="sm" variant={viewFilter === 'enabled' ? 'primary' : 'ghost'} onClick={() => { setViewFilter('enabled'); setFocusOnElementId('filter-enabled-button'); }} className="!py-1 !px-3 flex-1">Đã bật</Button>
                                    <Button id="filter-disabled-button" role="radio" aria-checked={viewFilter === 'disabled'} size="sm" variant={viewFilter === 'disabled' ? 'primary' : 'ghost'} onClick={() => { setViewFilter('disabled'); setFocusOnElementId('filter-disabled-button'); }} className="!py-1 !px-3 flex-1">Đã tắt</Button>
                                </div>
                            </div>
                        </div>
                       <div className="flex gap-2 pt-2 border-t border-gray-700">
                           <Button variant="secondary" size="sm" onClick={() => setIsSaveModalOpen(true)}>
                               {VIETNAMESE.savePresetButton}
                           </Button>
                           <Button variant="secondary" size="sm" onClick={() => setIsManageModalOpen(true)}>
                               {VIETNAMESE.managePresetsButton}
                           </Button>
                           <Button variant="danger" size="sm" onClick={handleResetToDefault}>
                               Khôi phục Mặc định
                           </Button>
                       </div>
                    </div>

                    {moveModeState !== null && (
                        <div className="sticky top-0 z-10 bg-indigo-900/80 backdrop-blur-sm p-3 rounded-lg border border-indigo-500 mb-2 flex items-center justify-between" aria-live="polite">
                            <p className="text-white font-semibold">
                                Đang di chuyển: <span className="italic">"{promptStructure[moveModeState.sourceIndex]?.label}"</span>. Chọn vị trí mới.
                            </p>
                            <Button id="cancel-move-button" variant="danger" size="sm" onClick={handleCancelMove}>
                                Hủy Di Chuyển
                            </Button>
                        </div>
                    )}
                    
                    <div className="flex-grow overflow-y-auto custom-scrollbar -mx-6 px-6 pb-4 space-y-2">
                        {filteredPromptStructure.map((block) => {
                            const originalIndex = promptStructure.findIndex(b => b.id === block.id);
                            if (originalIndex === -1) return null;
                            if (block.type === 'header') return null;

                            const hasConditions = block.conditions && block.conditions.length > 0;
                            const content = block.type === 'custom'
                                ? block.content || ''
                                : (block.rulebookKey ? rulebook[block.rulebookKey] || '' : '');

                            if (moveModeState) {
                                const isSource = moveModeState.sourceIndex === originalIndex;
                                return (
                                    <div key={block.id} className={`p-2 rounded-lg transition-colors ${ isSource ? 'bg-indigo-700 ring-2 ring-indigo-400 opacity-50' : 'bg-gray-800' }`}>
                                        <div className="flex items-center justify-between p-1">
                                            <span className="text-gray-400 truncate">{block.label}</span>
                                            {!isSource && block.isMovable && (
                                                <Button id={`move-here-button-${block.id}`} size="sm" variant="secondary" onClick={() => handleCompleteMove(originalIndex)} aria-label={`Di chuyển khối đã chọn đến vị trí này, trước khối ${block.label}`}>
                                                    Di chuyển đến đây
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={block.id} className="p-3 bg-gray-800/50 rounded-lg transition-colors hover:bg-gray-800/80 group border border-transparent hover:border-gray-700">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-grow mr-4">
                                            <h2 className="text-base font-semibold text-gray-200" title={block.label}>
                                                <div className="cursor-pointer flex items-center gap-2">
                                                    <span>{block.label}</span>
                                                    {hasConditions && (
                                                        <div title={formatConditionsForTooltip(block.conditions!)} className="flex-shrink-0">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 12.414V17a1 1 0 01-1 1h-2a1 1 0 01-1-1v-4.586L3.293 6.707A1 1 0 013 6V3zm3.146 5.854l4-4 .708.708-4 4-.708-.708zm4.708-3.146l-4 4-.708-.708 4-4 .708.708z" clipRule="evenodd" /></svg>
                                                        </div>
                                                    )}
                                                </div>
                                            </h2>
                                            {content && (
                                                <pre className="mt-1 p-2 bg-gray-900/40 border border-gray-700/50 rounded text-xs text-gray-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar">
                                                    {content}
                                                </pre>
                                            )}
                                        </div>
                                        <div className="flex items-center flex-shrink-0 ml-auto gap-2">
                                            <Button
                                                id={`move-button-${block.id}`}
                                                onClick={() => block.isMovable && handleInitiateMove(originalIndex)}
                                                disabled={!block.isMovable}
                                                className="p-1 text-gray-500 hover:text-white cursor-grab disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded opacity-50 group-hover:opacity-100 focus:opacity-100"
                                                aria-label={`Di chuyển khối ${block.label}`}
                                                title={`Di chuyển khối ${block.label}`}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" /></svg>
                                            </Button>
                                            <Button id={`edit-button-${block.id}`} variant="ghost" size="sm" onClick={() => handleEdit(block)} className="!py-1 !px-2 text-xs border border-gray-600 opacity-50 group-hover:opacity-100 focus:opacity-100" title={`Chỉnh sửa ${block.label}`}>Sửa</Button>
                                            <ToggleSwitch
                                                id={`toggle-${block.id}`}
                                                checked={block.enabled}
                                                onChange={() => handleToggle(block.id)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                     <div className="flex-shrink-0 pt-4 border-t border-gray-700">
                        <Button variant="ghost" className="w-full border-dashed" onClick={handleAddCustomBlock}>
                            + Thêm Khối Văn Bản Tùy Chỉnh
                        </Button>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-2">
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={handlePreviewClick}>
                            Xem Trước Prompt...
                        </Button>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={handleCloseWithConfirmation}>
                            {VIETNAMESE.cancelEditButton}
                        </Button>
                        <Button variant="primary" onClick={handleApplyAndClose} disabled={!hasChanges}>
                            Lưu & Áp Dụng
                        </Button>
                    </div>
                </div>
            </Modal>
            
            {editingRule && ( <RuleEditModal isOpen={!!editingRule} onClose={() => setEditingRule(null)} block={editingRule.block} knowledgeBase={knowledgeBase} currentContent={rulebook[editingRule.block.rulebookKey!] || ''} defaultContent={DEFAULT_AI_RULEBOOK[editingRule.block.rulebookKey!] || ''} onSave={handleSaveRule} onDelete={handleDeleteBlock} onOpenExplorer={() => setIsExplorerOpen(true)} onOpenLibrary={() => setIsLibraryOpen(true)}/> )}
            {editingCustomBlock && ( <CustomBlockEditModal isOpen={!!editingCustomBlock} onClose={() => setEditingCustomBlock(null)} block={editingCustomBlock} onSave={handleSaveCustomBlock} onDelete={handleDeleteCustomBlock} onOpenExplorer={() => setIsExplorerOpen(true)} knowledgeBase={knowledgeBase} onOpenLibrary={() => setIsLibraryOpen(true)}/> )}
            <ManagePresetsModal isOpen={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} />
            <SavePresetModal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} onSave={handleSaveChangesAsPreset} existingNames={Object.keys(aiPresets)}/>
            {isPreviewModalOpen && (
                <Modal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} title="Xem Trước Prompt Đầy Đủ">
                    <div className="flex flex-col h-[70vh]">
                        <p className="text-sm text-gray-400 mb-3 flex-shrink-0">Đây là bản xem trước cấu trúc prompt sẽ được gửi đến AI. Các biến trong dấu ngoặc kép <code>{"{{...}}"}</code> sẽ được thay thế bằng dữ liệu game thực tế khi chạy.</p>
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