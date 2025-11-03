// components/AIContextScreen.tsx
// FIX: Import useState, useRef, and useEffect from React to resolve 'Cannot find name' errors.
import React, { useState, useRef, useEffect, useMemo, ChangeEvent } from 'react';
// FIX: Correct import path for types
import { AIContextConfig, AIRulebook, AIPreset, PromptBlock, WorldSettings, PromptCondition, ConditionElement, PromptConditionGroup } from '../types/index';
import Button from './ui/Button';
import { useGame } from '../hooks/useGame';
import { VIETNAMESE, APP_VERSION } from '../constants';
import { DEFAULT_PROMPT_STRUCTURE } from '../constants/promptStructure';
import { DEFAULT_AI_RULEBOOK } from '../constants/systemRulesNormal';
import Modal from './ui/Modal';
import RuleEditModal from './RuleEditModal';
import SavePresetModal from './SavePresetModal';
import ManagePresetsModal from './ManagePresetsModal';
import CustomBlockEditModal from './CustomBlockEditModal'; // NEW
import InputField from './ui/InputField';
// FIX: Import getApiSettings to correctly source AI parameters.
import { getApiSettings } from '../services';
import { getSeason, getTimeOfDayContext } from '../utils/gameLogicUtils';
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
            'npc_affinity': 'Thiện cảm NPC'
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

// Helper component for each row in the prompt structure list
const PromptBlockRow: React.FC<{
    block: PromptBlock;
    index: number;
    total: number;
    onToggle: (id: string) => void;
    onMove: (index: number, direction: 'up' | 'down') => void;
    onEdit: (block: PromptBlock) => void;
}> = ({ block, index, total, onToggle, onMove, onEdit }) => {
    if (block.type === 'header') {
        return null;
    }
    
    const hasConditions = block.conditions && block.conditions.length > 0;

    return (
        <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg transition-colors hover:bg-gray-800/80 group">
            <div className="flex items-center gap-2 flex-grow overflow-hidden">
                <div className="flex flex-col gap-2">
                    <Button variant="ghost" size="sm" className="!p-1 h-5" onClick={() => onMove(index, 'up')} disabled={!block.isMovable || index === 0} aria-label={`Di chuyển ${block.label} lên`}>↑</Button>
                    <Button variant="ghost" size="sm" className="!p-1 h-5" onClick={() => onMove(index, 'down')} disabled={!block.isMovable || index === total - 1} aria-label={`Di chuyển ${block.label} xuống`}>↓</Button>
                </div>
                <div className="overflow-hidden flex items-center gap-2">
                     {hasConditions && (
                        <div title={formatConditionsForTooltip(block.conditions!)}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 12.414V17a1 1 0 01-1 1h-2a1 1 0 01-1-1v-4.586L3.293 6.707A1 1 0 013 6V3zm3.146 5.854l4-4 .708.708-4 4-.708-.708zm4.708-3.146l-4 4-.708-.708 4-4 .708.708z" clipRule="evenodd" />
                            </svg>
                        </div>
                    )}
                    <div>
                        <label htmlFor={`toggle-${block.id}`} className="font-medium text-gray-200 cursor-pointer block truncate" title={block.label}>{block.label}</label>
                        <p className="text-xs text-gray-400 truncate" title={block.description}>{block.description}</p>
                    </div>
                </div>
            </div>
            <div className="flex items-center flex-shrink-0 ml-2">
                {block.isEditable && (
                    <Button variant="ghost" size="sm" onClick={() => onEdit(block)} className="!py-1 !px-2 text-xs border border-gray-600 mr-2 opacity-50 group-hover:opacity-100 focus:opacity-100" title={`Chỉnh sửa ${block.label}`}>Sửa</Button>
                )}
                <div className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id={`toggle-${block.id}`} checked={block.enabled} onChange={() => onToggle(block.id)} className="sr-only peer"/>
                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </div>
            </div>
        </div>
    );
};

interface AIContextScreenProps {
    onClose: () => void;
}

const AIContextScreen: React.FC<AIContextScreenProps> = ({ onClose }) => {
    const { knowledgeBase, setKnowledgeBase, showNotification, aiPresets, saveNewAIPreset, renameAIPreset, deleteAIPreset, importAIPresets } = useGame();
    
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
    const mainContentRef = useRef<HTMLDivElement>(null);

    const groupedStructure = useMemo(() => {
        const groups: { header: PromptBlock, children: PromptBlock[] }[] = [];
        let currentGroup: { header: PromptBlock, children: PromptBlock[] } | null = null;

        promptStructure.forEach(block => {
            if (block.type === 'header') {
                if (currentGroup) {
                    groups.push(currentGroup);
                }
                currentGroup = { header: block, children: [] };
            } else if (currentGroup) {
                currentGroup.children.push(block);
            }
        });

        if (currentGroup) {
            groups.push(currentGroup);
        }
        
        return groups;
    }, [promptStructure]);

    useEffect(() => {
        const initialStructure = knowledgeBase.promptStructure || DEFAULT_PROMPT_STRUCTURE;
        setPromptStructure(JSON.parse(JSON.stringify(initialStructure)));
        setRulebook(knowledgeBase.aiRulebook || DEFAULT_AI_RULEBOOK);
        setHasChanges(false);
        setSelectedPresetName('load_current_game_config');
    }, [knowledgeBase.promptStructure, knowledgeBase.aiRulebook]);

    const markChanges = () => {
        setHasChanges(true);
        setSelectedPresetName('custom');
    };

    const handleToggle = (id: string) => {
        setPromptStructure(prev => prev.map(block => block.id === id ? { ...block, enabled: !block.enabled } : block));
        markChanges();
    };

    const handleMove = (index: number, direction: 'up' | 'down') => {
        setPromptStructure(prev => {
            const newStructure = [...prev];
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= newStructure.length || !newStructure[index].isMovable || !newStructure[targetIndex].isMovable) return newStructure;
            if (newStructure[index].type !== 'header' && newStructure[targetIndex].type === 'header') return newStructure;
            if (newStructure[index].type === 'header' && newStructure[targetIndex].type !== 'header') return newStructure;
            [newStructure[index], newStructure[targetIndex]] = [newStructure[targetIndex], newStructure[index]];
            return newStructure;
        });
        markChanges();
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
            label: 'Khối Tùy Chỉnh Mới',
            description: 'Nội dung do người dùng tự định nghĩa.',
            type: 'custom',
            enabled: true,
            isEditable: true,
            isMovable: true,
            content: '{{PLAYER_NAME}} làm gì đó...',
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
        if (presetName === 'custom') {
            if (!hasChanges) {
                setSelectedPresetName('load_current_game_config');
            }
            return;
        };
        if (hasChanges && !window.confirm("Bạn có thay đổi chưa lưu. Bạn có chắc muốn tải cấu hình khác và hủy các thay đổi hiện tại không?")) {
            return;
        }
        setSelectedPresetName(presetName);
        if (presetName === 'load_current_game_config') {
            setPromptStructure(JSON.parse(JSON.stringify(knowledgeBase.promptStructure || DEFAULT_PROMPT_STRUCTURE)));
            setRulebook(knowledgeBase.aiRulebook || DEFAULT_AI_RULEBOOK);
            showNotification('Đã nạp cấu hình hiện tại của game.', 'info');
        } else {
            const preset = aiPresets[presetName];
            if (preset) {
                setPromptStructure(JSON.parse(JSON.stringify(preset.configuration.promptStructure || DEFAULT_PROMPT_STRUCTURE)));
                setRulebook(preset.configuration.rulebookContent || DEFAULT_AI_RULEBOOK);
                showNotification(`Đã nạp preset "${presetName}".`, 'info');
            }
        }
        setHasChanges(false);
    };

    const handleSaveChangesAsPreset = (name: string, description: string) => {
        const apiSettings = getApiSettings();
        const newPreset: AIPreset = {
            metadata: { name, description, version: "1.0", appVersion: APP_VERSION, exportedAt: new Date().toISOString() },
            configuration: {
                contextToggles: knowledgeBase.aiContextConfig, 
                rulebookContent: rulebook,
                parameters: {
                    temperature: apiSettings.temperature,
                    topK: apiSettings.topK,
                    topP: apiSettings.topP,
                    thinkingBudget: apiSettings.thinkingBudget,
                    maxOutputTokens: apiSettings.maxOutputTokens,
                    seed: apiSettings.seed,
                },
                promptStructure: promptStructure
            }
        };
        saveNewAIPreset(name, newPreset);
        setSelectedPresetName(name);
        setHasChanges(false);
    };

    const handleApplyAndClose = () => {
        setKnowledgeBase(prevKb => ({ ...prevKb, promptStructure, aiRulebook: rulebook }));
        showNotification('Cài đặt Cấu Hình AI đã được áp dụng!', 'success');
        onClose();
    };

    const buildPreviewPrompt = (structure: PromptBlock[], rules: AIRulebook, worldConfig: WorldSettings | null): string => {
        const finalPromptParts: string[] = [];
        if (!worldConfig) return "Lỗi: Không có cấu hình thế giới để tạo bản xem trước.";
        const interpolate = (text: string): string => {
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
                case 'header':
                    blockContent = `\n---\n**${block.label}**`;
                    break;
                case 'custom':
                    if (block.content) {
                        blockContent = `**${block.label}:**\n${interpolate(block.content)}`;
                    }
                    break;
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
                                blockContent = interpolate(rules[block.rulebookKey]);
                            }
                            break;
                    }
                    break;
            }
            if (blockContent) {
                finalPromptParts.push(blockContent);
            }
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
        if (hasChanges) {
            options.unshift({ value: 'custom', label: VIETNAMESE.customPresetName });
        }
        const savedPresets = Object.keys(aiPresets).sort().map(name => ({ value: name, label: name }));
        return [...options, ...savedPresets];
    }, [aiPresets, hasChanges]);
    
    const handleScrollLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
        e.preventDefault();
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <>
            <Modal isOpen={true} onClose={onClose} title="Cấu Hình Prompt AI">
                <div className="flex flex-col h-[70vh]">
                    <div className="flex-shrink-0 bg-gray-800 p-3 rounded-lg border border-gray-700 space-y-3 mb-4">
                       <p className="text-sm text-gray-300">Quản lý và chuyển đổi giữa các cấu hình prompt đã lưu.</p>
                       <InputField
                            label="Cấu hình đang dùng:"
                            id="preset-selector"
                            type="select"
                            value={selectedPresetName}
                            onChange={handlePresetChange}
                            options={presetOptions.map(opt => ({ value: opt.value, label: opt.label }))}
                       />
                       <div className="flex gap-2">
                           <Button variant="secondary" size="sm" onClick={() => setIsSaveModalOpen(true)} disabled={!hasChanges}>
                               {VIETNAMESE.savePresetButton}
                           </Button>
                           <Button variant="secondary" size="sm" onClick={() => setIsManageModalOpen(true)}>
                               {VIETNAMESE.managePresetsButton}
                           </Button>
                       </div>
                    </div>

                    <div className="flex-grow flex gap-4 overflow-hidden">
                        {/* Sidebar Navigation */}
                        <nav className="w-1/3 lg:w-1/4 flex-shrink-0 overflow-y-auto custom-scrollbar border-r border-gray-700 pr-4">
                            {groupedStructure.map(group => (
                                <div key={`nav-${group.header.id}`} className="mb-4">
                                    <h3 className="font-semibold text-gray-400 uppercase text-xs tracking-wider mb-2 px-1.5">{group.header.label}</h3>
                                    <ul className="space-y-1">
                                        {group.children.map(block => (
                                            <li key={`link-${block.id}`}>
                                                <a 
                                                    href={`#${block.id}`} 
                                                    onClick={(e) => handleScrollLinkClick(e, block.id)}
                                                    className="block text-sm text-gray-300 hover:text-white hover:bg-gray-700 p-1.5 rounded"
                                                    title={block.label}
                                                >
                                                    {block.label}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </nav>

                        {/* Main Content Area */}
                        <div ref={mainContentRef} id="ai-context-main-content" className="flex-grow overflow-y-auto custom-scrollbar pr-2">
                            {groupedStructure.map(group => (
                                <div key={`content-${group.header.id}`} className="mb-6">
                                    <h2 id={group.header.id} className="text-xl font-bold text-indigo-300 mb-3 sticky top-0 bg-gray-900 py-2 -mx-4 px-4 border-b border-gray-700 z-10 scroll-mt-2">
                                        {group.header.label}
                                    </h2>
                                    <div className="space-y-1">
                                        {group.children.map(block => (
                                            <div id={block.id} key={block.id} className="scroll-mt-16">
                                                <PromptBlockRow
                                                    block={block}
                                                    index={promptStructure.findIndex(b => b.id === block.id)}
                                                    total={promptStructure.length}
                                                    onToggle={handleToggle}
                                                    onMove={handleMove}
                                                    onEdit={handleEdit}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                     <div className="flex-shrink-0 pt-4 border-t border-gray-700">
                        <Button variant="ghost" className="w-full border-dashed" onClick={handleAddCustomBlock}>
                            + Thêm Khối Văn Bản Tùy Chỉnh
                        </Button>
                    </div>
                </div>
                 <div className="mt-6 pt-4 border-t border-gray-700 flex justify-between items-center">
                    <Button variant="ghost" onClick={handlePreviewClick}>
                        Xem Trước Prompt...
                    </Button>
                    <Button variant="primary" onClick={handleApplyAndClose} disabled={!hasChanges}>
                        Lưu & Áp Dụng
                    </Button>
                </div>
            </Modal>
            
            {editingRule && (
                <RuleEditModal
                    isOpen={!!editingRule}
                    onClose={() => setEditingRule(null)}
                    block={editingRule.block}
                    knowledgeBase={knowledgeBase}
                    currentContent={rulebook[editingRule.block.rulebookKey!] || ''}
                    defaultContent={DEFAULT_AI_RULEBOOK[editingRule.block.rulebookKey!] || ''}
                    onSave={handleSaveRule}
                    onOpenExplorer={() => setIsExplorerOpen(true)}
                    onOpenLibrary={() => setIsLibraryOpen(true)}
                />
            )}
            
             {editingCustomBlock && (
                <CustomBlockEditModal
                    isOpen={!!editingCustomBlock}
                    onClose={() => setEditingCustomBlock(null)}
                    block={editingCustomBlock}
                    onSave={handleSaveCustomBlock}
                    onDelete={handleDeleteCustomBlock}
                    onOpenExplorer={() => setIsExplorerOpen(true)}
                    knowledgeBase={knowledgeBase}
                    onOpenLibrary={() => setIsLibraryOpen(true)}
                />
            )}

            <ManagePresetsModal 
                isOpen={isManageModalOpen} 
                onClose={() => setIsManageModalOpen(false)} 
            />

            <SavePresetModal
                isOpen={isSaveModalOpen}
                onClose={() => setIsSaveModalOpen(false)}
                onSave={handleSaveChangesAsPreset}
                existingNames={Object.keys(aiPresets)}
            />

            {isPreviewModalOpen && (
                <Modal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} title="Xem Trước Prompt Đầy Đủ">
                    <div className="flex flex-col h-[70vh]">
                        <p className="text-sm text-gray-400 mb-3 flex-shrink-0">
                            Đây là bản xem trước cấu trúc prompt sẽ được gửi đến AI. Các biến trong dấu ngoặc kép <code>{"{{...}}"}</code> sẽ được thay thế bằng dữ liệu game thực tế khi chạy.
                        </p>
                        <textarea
                            readOnly
                            value={previewPromptContent}
                            className="flex-grow w-full p-3 bg-gray-900 border border-gray-600 rounded-md shadow-sm text-gray-200 font-mono text-xs custom-scrollbar"
                            aria-label="Nội dung prompt xem trước"
                        />
                         <div className="mt-4 flex-shrink-0">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    navigator.clipboard.writeText(previewPromptContent);
                                    showNotification("Đã sao chép prompt vào clipboard!", 'success');
                                }}
                            >
                                Sao chép vào Clipboard
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
            <VariableExplorer 
                isOpen={isExplorerOpen}
                onClose={() => setIsExplorerOpen(false)}
                knowledgeBase={knowledgeBase}
                showNotification={showNotification}
            />
            <FunctionFilterLibrary
                isOpen={isLibraryOpen}
                onClose={() => setIsLibraryOpen(false)}
            />
        </>
    );
};

export default AIContextScreen;