import React, { useState, useEffect } from 'react';
import { AIContextConfig, AIRulebook } from '../types/index';
import Button from './ui/Button';
import CollapsibleSection from './ui/CollapsibleSection';
import { useGame } from '../hooks/useGame';
import { VIETNAMESE, SPECIAL_EVENT_INTERVAL_TURNS } from '../constants';
import { DEFAULT_AI_CONTEXT_CONFIG } from '../utils/gameLogicUtils';
import { DEFAULT_AI_RULEBOOK } from '../constants/systemRulesNormal';
import Modal from './ui/Modal';
import RuleEditModal from './RuleEditModal'; // NEW: Import the new edit modal

const contextConfigToRulebookKeyMap: Partial<Record<keyof AIContextConfig, keyof AIRulebook>> = {
    sendShowDontTellRule: 'narrationAndVividness',
    sendProactiveNpcRule: 'proactiveNpc',
    sendRumorMillRule: 'rumorMill',
    sendFormattingRules: 'formattingRules',
    sendTimeRules: 'timeRules',
    sendStatRules: 'statRules',
    sendItemRules: 'itemRules',
    sendSkillRules: 'skillRules',
    sendQuestRules: 'questRules',
    sendCreationRules: 'creationRules',
    sendUpdateRules: 'updateRules',
    sendDeletionRules: 'deletionRules',
    sendSpecialStatusRules: 'specialStatusRules',
    sendChoiceRules: 'choiceRules',
    sendTurnRules: 'turnRules',
    sendStatusEffectRules: 'statusEffectRules',
    sendCombatStartRules: 'combatStartRules',
    sendSimpleCompanionRules: 'simpleCompanionRules',
    sendWorldProgressionRules: 'worldProgressionRules',
    sendSpecialEventRules: 'specialEventRules',
};


const ToggleRow = ({ label, description, isEnabled, onToggle, onEdit, id }: { label: string, description: string, isEnabled: boolean, onToggle: () => void, onEdit?: () => void, id: string }) => (
    <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg transition-colors hover:bg-gray-800/80">
        <div className="mr-4 flex-grow">
            <label htmlFor={id} className="font-semibold text-gray-200 cursor-pointer block">{label}</label>
            <p className="text-xs text-gray-400">{description}</p>
        </div>
        <div className="flex items-center flex-shrink-0">
            {onEdit && (
                 <Button
                    variant="ghost"
                    size="sm"
                    onClick={onEdit}
                    className="!p-1.5 mr-2"
                    title={`Chỉnh sửa nội dung quy tắc "${label}"`}
                    aria-label={`Chỉnh sửa nội dung quy tắc "${label}"`}
                >
                    ✏️
                </Button>
            )}
            <div className="relative inline-flex items-center cursor-pointer">
                <input 
                    type="checkbox" 
                    id={id}
                    checked={isEnabled} 
                    onChange={onToggle} 
                    className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </div>
        </div>
    </div>
);

interface AIContextScreenProps {
    onClose: () => void;
}

const AIContextScreen: React.FC<AIContextScreenProps> = ({ onClose }) => {
    const { knowledgeBase, setKnowledgeBase, showNotification } = useGame();
    
    const [settings, setSettings] = useState<AIContextConfig>(
        knowledgeBase.aiContextConfig || DEFAULT_AI_CONTEXT_CONFIG
    );
    const [rulebook, setRulebook] = useState<AIRulebook>(
        knowledgeBase.aiRulebook || DEFAULT_AI_RULEBOOK
    );
    const [hasChanges, setHasChanges] = useState(false);

    // NEW: State for the rule editing modal
    const [editingRule, setEditingRule] = useState<{ key: keyof AIRulebook; label: string } | null>(null);

    useEffect(() => {
        setSettings(knowledgeBase.aiContextConfig || DEFAULT_AI_CONTEXT_CONFIG);
        setRulebook(knowledgeBase.aiRulebook || DEFAULT_AI_RULEBOOK);
        setHasChanges(false);
    }, [knowledgeBase.aiContextConfig, knowledgeBase.aiRulebook, onClose]);

    const handleToggle = (settingKey: keyof AIContextConfig) => {
        setSettings(prev => ({
            ...prev,
            [settingKey]: !prev[settingKey]
        }));
        setHasChanges(true);
    };
    
    const handleSaveRule = (ruleKeyToSave: keyof AIRulebook, newContent: string) => {
        setRulebook(prev => ({
            ...prev,
            [ruleKeyToSave]: newContent
        }));
        setHasChanges(true);
        setEditingRule(null); // Close modal
        showNotification(`Quy tắc "${editingRule?.label}" đã được cập nhật tạm thời!`, 'info');
    };

    const handleSave = () => {
        setKnowledgeBase(prevKb => ({
            ...prevKb,
            aiContextConfig: settings,
            aiRulebook: rulebook, // Save the edited rulebook as well
        }));
        showNotification('Cài đặt Cấu Hình AI đã được lưu!', 'success');
        setHasChanges(false);
        onClose();
    };
    
    const handleReset = () => {
        setSettings(DEFAULT_AI_CONTEXT_CONFIG);
        setRulebook(DEFAULT_AI_RULEBOOK);
        setHasChanges(true);
    };

    // State for collapsible sections
    const [isContextOpen, setIsContextOpen] = useState(true);
    const [isGuidanceOpen, setIsGuidanceOpen] = useState(true);
    const [isStorytellingOpen, setIsStorytellingOpen] = useState(true);
    const [isRulesOpen, setIsRulesOpen] = useState(false);

    const ruleDefinitions: {
        id: keyof AIContextConfig;
        label: string;
        description: string;
    }[] = [
        { id: 'sendShowDontTellRule', label: "Quy Tắc 'Tả, đừng kể'", description: "Yêu cầu AI sử dụng ngũ quan, mô tả chi tiết thay vì kể chung chung." },
        { id: 'sendProactiveNpcRule', label: "Quy Tắc 'NPC chủ động'", description: "Yêu cầu AI để ít nhất một NPC thực hiện hành động chủ động trong mỗi cảnh." },
        { id: 'sendRumorMillRule', label: "Quy Tắc 'Cối xay tin đồn'", description: "Yêu cầu AI tạo ra các tin đồn đa dạng qua hội thoại của NPC." },
        { id: 'sendWorldProgressionRules', label: "Quy Tắc Thế Giới Tự Vận Hành", description: "Cho phép AI tự tạo sự kiện phe phái, môi trường và các diễn biến ở xa." },
        { id: 'sendSpecialEventRules', label: "Hướng Dẫn Sự Kiện Cốt Truyện Đặc Biệt", description: `Kích hoạt một sự kiện lớn, bất ngờ sau mỗi ${SPECIAL_EVENT_INTERVAL_TURNS} lượt chơi.` },
    ];

    return (
        <>
        <Modal isOpen={true} onClose={onClose} title="Cấu Hình Prompt AI">
             <div className="space-y-4 max-h-[65vh] overflow-y-auto custom-scrollbar -mx-6 px-6 pb-4">
                <p className="text-sm text-gray-400 mb-4">
                    Bật/tắt các phần của bối cảnh và quy tắc được gửi đến AI. Nhấn nút ✏️ để chỉnh sửa nội dung chi tiết của quy tắc.
                </p>

                <div className="space-y-3">
                    <CollapsibleSection title="Bối Cảnh (Context)" isOpen={isContextOpen} onToggle={() => setIsContextOpen(!isContextOpen)}>
                        <div className="space-y-3">
                            <ToggleRow id="toggle-rag" label="Bối cảnh Truy xuất (RAG Context)" description="Gửi các thông tin liên quan từ lịch sử game (trí nhớ dài hạn)." isEnabled={settings.sendRagContext} onToggle={() => handleToggle('sendRagContext')} />
                            <ToggleRow id="toggle-core" label="Bối cảnh Cốt lõi (Core Context)" description="Gửi thông tin hiện tại của người chơi (chỉ số, nhiệm vụ, trạng thái)." isEnabled={settings.sendCoreContext} onToggle={() => handleToggle('sendCoreContext')} />
                            <ToggleRow id="toggle-conversational" label="Bối cảnh Hội thoại (Conversational Context)" description="Gửi các tóm tắt trang trước và diễn biến gần đây." isEnabled={settings.sendConversationalContext} onToggle={() => handleToggle('sendConversationalContext')} />
                        </div>
                    </CollapsibleSection>

                    <CollapsibleSection title="Hướng Dẫn Chính (Primary Guidance)" isOpen={isGuidanceOpen} onToggle={() => setIsGuidanceOpen(!isGuidanceOpen)}>
                        <div className="space-y-3">
                            <ToggleRow id="toggle-writing-style" label="Hướng Dẫn Văn Phong" description="Gửi đoạn văn mẫu mà người dùng cung cấp để AI bắt chước." isEnabled={settings.sendWritingStyle} onToggle={() => handleToggle('sendWritingStyle')} />
                            <ToggleRow id="toggle-user-prompts" label="Lời Nhắc Người Dùng" description="Gửi các quy tắc tùy chỉnh mà người dùng đã thêm ở màn hình 'Lời Nhắc'." isEnabled={settings.sendUserPrompts} onToggle={() => handleToggle('sendUserPrompts')} />
                            <ToggleRow id="toggle-event-guidance" label="Hướng Dẫn Về Sự Kiện Thế Giới" description="Gửi thông tin về các sự kiện đang/sắp diễn ra tại địa điểm hiện tại." isEnabled={settings.sendEventGuidance} onToggle={() => handleToggle('sendEventGuidance')} />
                            <ToggleRow id="toggle-difficulty" label="Hướng Dẫn Về Độ Khó" description="Hướng dẫn AI về cách hành xử dựa trên độ khó đã chọn." isEnabled={settings.sendDifficultyGuidance} onToggle={() => handleToggle('sendDifficultyGuidance')} />
                            <ToggleRow id="toggle-nsfw-guidance" label="Hướng Dẫn Nội Dung Người Lớn" description="Gửi các quy tắc chi tiết về việc mô tả nội dung người lớn." isEnabled={settings.sendNsfwGuidance} onToggle={() => handleToggle('sendNsfwGuidance')} />
                        </div>
                    </CollapsibleSection>

                    <CollapsibleSection title="Quy Tắc Kể Chuyện & Thế Giới Động" isOpen={isStorytellingOpen} onToggle={() => setIsStorytellingOpen(!isStorytellingOpen)}>
                        <div className="space-y-3">
                             {ruleDefinitions.map(rule => {
                                const rulebookKey = contextConfigToRulebookKeyMap[rule.id];
                                return (
                                    <ToggleRow
                                        key={rule.id}
                                        id={`toggle-rule-${rule.id}`}
                                        label={rule.label}
                                        description={rule.description}
                                        isEnabled={settings[rule.id]}
                                        onToggle={() => handleToggle(rule.id)}
                                        onEdit={rulebookKey ? () => setEditingRule({ key: rulebookKey, label: rule.label }) : undefined}
                                    />
                                );
                            })}
                        </div>
                    </CollapsibleSection>

                    <CollapsibleSection title="Quy Tắc Tags Chi Tiết (System Tags)" isOpen={isRulesOpen} onToggle={() => setIsRulesOpen(!isRulesOpen)}>
                        <div className="space-y-3">
                             <ToggleRow id="toggle-rule-formatting" label="Quy Tắc Định Dạng & Hội Thoại" description="Bao gồm cấm tag trong lời kể và quy tắc đánh dấu hội thoại." isEnabled={settings.sendFormattingRules} onToggle={() => handleToggle('sendFormattingRules')} onEdit={() => setEditingRule({ key: 'formattingRules', label: 'Quy Tắc Định Dạng & Hội Thoại' })}/>
                             <ToggleRow id="toggle-rule-time" label="Quy Tắc Về Thời Gian ([CHANGE_TIME])" description="Gửi hướng dẫn về việc sử dụng tag thời gian." isEnabled={settings.sendTimeRules} onToggle={() => handleToggle('sendTimeRules')} onEdit={() => setEditingRule({ key: 'timeRules', label: 'Quy Tắc Về Thời Gian ([CHANGE_TIME])' })}/>
                             <ToggleRow id="toggle-rule-stats" label="Quy Tắc Về Chỉ Số ([STATS_UPDATE])" description="Gửi hướng dẫn về việc cập nhật chỉ số người chơi." isEnabled={settings.sendStatRules} onToggle={() => handleToggle('sendStatRules')} onEdit={() => setEditingRule({ key: 'statRules', label: 'Quy Tắc Về Chỉ Số ([STATS_UPDATE])' })}/>
                             <ToggleRow id="toggle-rule-items" label="Quy Tắc Về Vật Phẩm ([ITEM_*])" description="Gửi hướng dẫn về việc tạo, dùng, cập nhật vật phẩm." isEnabled={settings.sendItemRules} onToggle={() => handleToggle('sendItemRules')} onEdit={() => setEditingRule({ key: 'itemRules', label: 'Quy Tắc Về Vật Phẩm ([ITEM_*])' })}/>
                             <ToggleRow id="toggle-rule-skills" label="Quy Tắc Về Kỹ Năng ([SKILL_*])" description="Gửi hướng dẫn về việc học và cập nhật kỹ năng." isEnabled={settings.sendSkillRules} onToggle={() => handleToggle('sendSkillRules')} onEdit={() => setEditingRule({ key: 'skillRules', label: 'Quy Tắc Về Kỹ Năng ([SKILL_*])' })}/>
                             <ToggleRow id="toggle-rule-quests" label="Quy Tắc Về Nhiệm Vụ ([QUEST_*])" description="Gửi hướng dẫn về việc quản lý nhiệm vụ." isEnabled={settings.sendQuestRules} onToggle={() => handleToggle('sendQuestRules')} onEdit={() => setEditingRule({ key: 'questRules', label: 'Quy Tắc Về Nhiệm Vụ ([QUEST_*])' })}/>
                             <ToggleRow id="toggle-rule-creation" label="Quy Tắc Về Tạo Mới Thế Giới" description="Gửi hướng dẫn về việc tạo NPC, địa điểm, phe phái..." isEnabled={settings.sendCreationRules} onToggle={() => handleToggle('sendCreationRules')} onEdit={() => setEditingRule({ key: 'creationRules', label: 'Quy Tắc Về Tạo Mới Thế Giới' })}/>
                             <ToggleRow id="toggle-rule-update" label="Quy Tắc Về Cập Nhật Thế Giới" description="Gửi hướng dẫn về việc cập nhật NPC, địa điểm..." isEnabled={settings.sendUpdateRules} onToggle={() => handleToggle('sendUpdateRules')} onEdit={() => setEditingRule({ key: 'updateRules', label: 'Quy Tắc Về Cập Nhật Thế Giới' })}/>
                             <ToggleRow id="toggle-rule-deletion" label="Quy Tắc Về Xóa Thông Tin" description="Gửi hướng dẫn về việc xóa NPC, phe phái..." isEnabled={settings.sendDeletionRules} onToggle={() => handleToggle('sendDeletionRules')} onEdit={() => setEditingRule({ key: 'deletionRules', label: 'Quy Tắc Về Xóa Thông Tin' })}/>
                             <ToggleRow id="toggle-rule-special-status" label="Quy Tắc Về Thân Phận Đặc Biệt" description="Gửi hướng dẫn về các tag cho Tù nhân/Nô lệ." isEnabled={settings.sendSpecialStatusRules} onToggle={() => handleToggle('sendSpecialStatusRules')} onEdit={() => setEditingRule({ key: 'specialStatusRules', label: 'Quy Tắc Về Thân Phận Đặc Biệt' })}/>
                             <ToggleRow id="toggle-rule-choice" label="Quy Tắc Về Lựa Chọn Mới ([CHOICE])" description="Gửi hướng dẫn về việc tạo các lựa chọn hành động." isEnabled={settings.sendChoiceRules} onToggle={() => handleToggle('sendChoiceRules')} onEdit={() => setEditingRule({ key: 'choiceRules', label: 'Quy Tắc Về Lựa Chọn Mới ([CHOICE])' })}/>
                             <ToggleRow id="toggle-rule-turn" label="Quy Tắc Về Lượt Chơi (turn=+1)" description="Yêu cầu bắt buộc phải có tag tăng lượt chơi." isEnabled={settings.sendTurnRules} onToggle={() => handleToggle('sendTurnRules')} onEdit={() => setEditingRule({ key: 'turnRules', label: 'Quy Tắc Về Lượt Chơi (turn=+1)' })}/>
                             <ToggleRow id="toggle-rule-status-effect" label="Quy Tắc Về Hiệu Ứng Trạng Thái" description="Hướng dẫn sử dụng tag [STATUS_EFFECT_*]." isEnabled={settings.sendStatusEffectRules} onToggle={() => handleToggle('sendStatusEffectRules')} onEdit={() => setEditingRule({ key: 'statusEffectRules', label: 'Quy Tắc Về Hiệu Ứng Trạng Thái' })}/>
                             <ToggleRow id="toggle-rule-combat-start" label="Quy Tắc Bắt Đầu Chiến Đấu" description="Hướng dẫn sử dụng tag [BEGIN_COMBAT]." isEnabled={settings.sendCombatStartRules} onToggle={() => handleToggle('sendCombatStartRules')} onEdit={() => setEditingRule({ key: 'combatStartRules', label: 'Quy Tắc Bắt Đầu Chiến Đấu' })}/>
                             <ToggleRow id="toggle-rule-simple-companion" label="Quy Tắc Về Đồng Hành (Đơn giản)" description="Hướng dẫn sử dụng tag [COMPANION_*]." isEnabled={settings.sendSimpleCompanionRules} onToggle={() => handleToggle('sendSimpleCompanionRules')} onEdit={() => setEditingRule({ key: 'simpleCompanionRules', label: 'Quy Tắc Về Đồng Hành (Đơn giản)' })}/>
                        </div>
                    </CollapsibleSection>
                </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-700 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0 -mx-6 px-6 -mb-6 pb-6 bg-gray-800">
                <Button variant="danger" onClick={handleReset} className="w-full sm:w-auto">
                    Khôi Phục Mặc Định
                </Button>
                <div className="flex w-full sm:w-auto space-x-2">
                    <Button variant="secondary" onClick={onClose} className="flex-1 sm:flex-initial">
                        {VIETNAMESE.closeButton}
                    </Button>
                    <Button variant="primary" onClick={handleSave} className="flex-1 sm:flex-initial" disabled={!hasChanges}>
                        Lưu & Đóng
                    </Button>
                </div>
            </div>
        </Modal>
        {editingRule && (
            <RuleEditModal
                isOpen={!!editingRule}
                onClose={() => setEditingRule(null)}
                ruleKey={editingRule.key}
                ruleLabel={editingRule.label}
                currentContent={rulebook[editingRule.key] || ''}
                defaultContent={DEFAULT_AI_RULEBOOK[editingRule.key] || ''}
                onSave={handleSaveRule as (key: string, content: string) => void}
            />
        )}
        </>
    );
};

export default AIContextScreen;
