

import React, { useState } from 'react';
import { GameEntity, GameEntityType } from '../../../hooks/types';
import { KnowledgeBase, PlayerStats, Item, Skill, Quest, NPC, GameLocation, WorldLoreEntry, Companion, Faction, YeuThu, Wife, Slave, Prisoner, ActivityLogEntry } from '../../../types';
import * as GameTemplates from '../../../templates';
import Modal from '../../ui/Modal';
import { VIETNAMESE, PROFICIENCY_DMG_HEAL_MULTIPLIERS, PROFICIENCY_COST_COOLDOWN_MULTIPLIERS } from '../../../constants';
import { getDeterministicAvatarSrc } from '../../../utils/avatarUtils';

interface EntityDetailModalProps {
    selectedEntity: { type: GameEntityType; entity: GameEntity } | null;
    isOpen: boolean;
    onClose: () => void;
    knowledgeBase: KnowledgeBase;
    onUpdateNpcAvatar: (npcId: string, newAvatarUrl: string) => void; 
    isUploadingAvatar: boolean;
}

// --- START: RENDER HELPER COMPONENTS ---

const renderStatBonuses = (bonuses: Partial<PlayerStats>) => {
    const relevantBonuses = Object.entries(bonuses).filter(
        (entry): entry is [string, number] => {
            const [key, value] = entry;
            return !key.startsWith('base') && typeof value === 'number' && value !== 0;
        }
    );
    if (relevantBonuses.length === 0) return <p className="text-xs text-gray-400">Không có chỉ số cộng thêm.</p>;
    const statLabels: Record<string, string> = {
        sinhLuc: "Sinh Lực Hiện Tại", maxSinhLuc: "Sinh Lực Tối Đa",
        linhLuc: "Linh Lực Hiện Tại", maxLinhLuc: "Linh Lực Tối Đa",
        sucTanCong: "Sức Tấn Công",
        kinhNghiem: "Kinh Nghiệm", maxKinhNghiem: "Kinh Nghiệm Tối Đa",
    };
    return (
        <ul className="list-disc list-inside pl-4 text-xs">
            {relevantBonuses.map(([key, value]) => ( 
                <li key={key}>
                    <span className="text-gray-300">{statLabels[key] || key}: </span>
                    <span className={value > 0 ? "text-green-400" : "text-red-400"}>
                        {value > 0 ? `+${value}` : value}
                    </span>
                </li>
            ))}
        </ul>
    );
};

const StatField = ({ label, value, valueClassName = "text-gray-200" }: { label: string; value: React.ReactNode; valueClassName?: string }) => (
    <div>
        <p className="text-sm text-indigo-300">{label}</p>
        <p className={`font-semibold ${valueClassName}`}>{value || 'Không rõ'}</p>
    </div>
);

const DetailSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-gray-900/40 p-3 rounded-lg">
        <h4 className="font-semibold text-lg text-indigo-300 border-b border-gray-600 pb-2 mb-3">{title}</h4>
        {children}
    </div>
);

const needsValueToText = (value: number): string => {
    if (value > 85) return "Rất cao";
    if (value > 65) return "Cao";
    if (value > 35) return "Trung bình";
    if (value > 15) return "Thấp";
    return "Rất thấp";
}

const renderNeeds = (needs: Record<string, number>) => {
    const needsEntries = Object.entries(needs || {});
    if (needsEntries.length === 0) {
        return <p>Không có nhu cầu cụ thể.</p>;
    }

    const [highestNeed, highestValue] = needsEntries.reduce((max, entry) => entry[1] > max[1] ? entry : max, ['', -1]);

    const otherNeeds = needsEntries
        .filter(([key]) => key !== highestNeed)
        .sort((a, b) => b[1] - a[1]);

    return (
        <div className="text-sm">
            <p>
                <strong className="text-gray-300">Nhu cầu cấp bách nhất:</strong>
                <span className="ml-2 font-semibold text-amber-400">{highestNeed} ({needsValueToText(highestValue)})</span>
            </p>
            {otherNeeds.length > 0 && (
                 <p className="text-xs mt-1">
                    <strong className="text-gray-400">Các nhu cầu khác:</strong>
                    <span className="ml-1 text-gray-300">
                        {otherNeeds.map(([key, value]) => `${key} (${needsValueToText(value)})`).join(', ')}
                    </span>
                </p>
            )}
        </div>
    );
};


// --- END: RENDER HELPER COMPONENTS ---


const EntityDetailModal: React.FC<EntityDetailModalProps> = ({ selectedEntity, isOpen, onClose, knowledgeBase }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'mind' | 'log'>('overview');
    
    if (!isOpen || !selectedEntity) return null;

    const { type, entity } = selectedEntity;
    const isCharacter = ['npc', 'prisoner', 'wife', 'slave'].includes(type);

    let title = "Chi Tiết";
    let content: React.ReactNode = null;

    if (isCharacter) {
        const person = entity as NPC | Prisoner | Wife | Slave;
        const personTypeLabel = ('entityType' in person && person.entityType)
            ? (person.entityType === 'wife' ? 'Đạo Lữ' : person.entityType === 'slave' ? 'Nô Lệ' : 'Tù Nhân')
            : 'NPC';
        title = `Chi Tiết ${personTypeLabel}: ${person.name}`;
        
        const activeTabStyle = "whitespace-nowrap py-2 px-4 border-b-2 font-medium text-sm border-indigo-500 text-indigo-400 focus:outline-none";
        const inactiveTabStyle = "whitespace-nowrap py-2 px-4 border-b-2 font-medium text-sm border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500 focus:outline-none";

        const relationships = Object.entries(person.relationships || {}).filter(([_, rel]: [string, any]) => rel.type !== 'Người lạ');

        content = (
            <div className="flex flex-col h-full">
                <div className="border-b border-gray-700 flex-shrink-0">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <button onClick={() => setActiveTab('overview')} className={activeTab === 'overview' ? activeTabStyle : inactiveTabStyle}>Tổng Quan</button>
                        <button onClick={() => setActiveTab('mind')} className={activeTab === 'mind' ? activeTabStyle : inactiveTabStyle}>Nội Tâm</button>
                        <button onClick={() => setActiveTab('log')} className={activeTab === 'log' ? activeTabStyle : inactiveTabStyle}>Nhật Ký</button>
                    </nav>
                </div>
                <div className="mt-4 flex-grow overflow-y-auto custom-scrollbar pr-2 -mr-2">
                    {activeTab === 'overview' && (
                        // Tab 1: Tổng Quan (Original content)
                        <div className="space-y-4">
                            <div className="text-center">
                                <img src={getDeterministicAvatarSrc(person)} alt={person.name} className="w-32 h-32 rounded-lg object-cover mx-auto mb-3 border-2 border-pink-500 shadow-md" />
                                <h3 className="text-2xl font-bold">{person.name}</h3>
                                <p className="text-md text-gray-400">{person.race || 'Không rõ'}</p>
                                {person.title && <p className="text-sm text-gray-500">{person.title}</p>}
                            </div>
                    
                            <DetailSection title="Tu Luyện">
                                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                    <StatField label="Giới tính" value={person.gender} />
                                    <StatField label="Cảnh giới" value={person.realm} valueClassName="text-amber-400 font-bold"/>
                                    <StatField label="Tư chất" value={person.tuChat} />
                                    <StatField label="Linh Căn" value={person.spiritualRoot} />
                                    <div className="col-span-2"><StatField label="Thể Chất" value={person.specialPhysique} /></div>
                                </div>
                            </DetailSection>
                            
                            {('affinity' in person) && (
                                <DetailSection title="Trạng thái quan hệ">
                                     <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                        <StatField label="Thiện cảm" value={person.affinity} valueClassName={person.affinity >= 0 ? "text-green-400" : "text-red-400"}/>
                                        {('willpower' in person) && <StatField label="Ý chí" value={(person as any).willpower} />}
                                        {('obedience' in person) && <StatField label="Phục tùng" value={(person as any).obedience} />}
                                        {('resistance' in person) && <StatField label="Phản kháng" value={(person as Prisoner).resistance} />}
                                     </div>
                                </DetailSection>
                            )}
                            
                            {person.stats && (person.stats.maxSinhLuc != null || person.stats.sucTanCong != null) && (
                                <DetailSection title="Chỉ số chiến đấu">
                                    <ul className="text-sm space-y-1.5">
                                        {person.stats.maxSinhLuc != null && <li><strong className="text-gray-400">Sinh Lực:</strong> {person.stats.sinhLuc ?? '??'} / {person.stats.maxSinhLuc}</li>}
                                        {person.stats.maxLinhLuc != null && person.stats.maxLinhLuc > 0 && <li><strong className="text-gray-400">Linh Lực:</strong> {person.stats.linhLuc ?? '??'} / {person.stats.maxLinhLuc}</li>}
                                        {person.stats.sucTanCong != null && <li><strong className="text-gray-400">Sức Tấn Công:</strong> {person.stats.sucTanCong}</li>}
                                        {person.stats.maxKinhNghiem != null && person.stats.maxKinhNghiem > 0 && <li><strong className="text-gray-400">Kinh Nghiệm:</strong> {person.stats.kinhNghiem ?? '??'} / {person.stats.maxKinhNghiem}</li>}
                                        {person.stats.thoNguyen !== undefined && <li className="col-span-2"><strong className="text-gray-400">Thọ Nguyên:</strong> {Math.floor(person.stats.thoNguyen)} / {person.stats.maxThoNguyen ?? '??'}</li>}
                                    </ul>
                                </DetailSection>
                            )}
                            <p className="text-sm italic text-gray-400 pt-3 border-t border-gray-700/50">{person.description}</p>
                        </div>
                    )}
                    {activeTab === 'mind' && (
                        // Tab 2: Nội Tâm
                        <div className="space-y-4">
                             <DetailSection title="Trạng Thái Hiện Tại">
                                <StatField 
                                    label="Vị Trí & Hoạt Động" 
                                    value={`${(person.currentPlan && person.currentPlan.length > 0 ? person.currentPlan.join(' -> ') : 'Đang nghỉ ngơi')} tại ${knowledgeBase.discoveredLocations.find(l => l.id === person.locationId)?.name || 'Vị trí không xác định'}`} 
                                />
                             </DetailSection>
                             <DetailSection title="Mục Tiêu">
                                <div className="space-y-2 text-sm">
                                    <p><strong className="text-gray-400">Dài hạn:</strong> <span className="italic">{person.longTermGoal || 'Chưa có'}</span></p>
                                    <p><strong className="text-gray-400">Ngắn hạn:</strong> <span className="italic">{person.shortTermGoal || 'Chưa có'}</span></p>
                                </div>
                             </DetailSection>
                             <DetailSection title="Trạng Thái Tinh Thần">
                                 <div className="space-y-3">
                                    <StatField label="Tâm trạng" value={person.mood || 'Bình Thường'} />
                                    {renderNeeds(person.needs || {})}
                                 </div>
                             </DetailSection>
                             <DetailSection title="Mối Quan Hệ">
                                {relationships.length > 0 ? (
                                    <ul className="space-y-1.5 text-sm">
                                        {relationships.map(([npcId, rel]) => {
                                            const relationshipData = rel as { type: string; affinity: number };
                                            const otherNpc = knowledgeBase.discoveredNPCs.find(n => n.id === npcId);
                                            return (
                                                <li key={npcId}>
                                                    <span className="font-semibold text-gray-200">{otherNpc ? otherNpc.name : 'Người lạ'}</span> - 
                                                    <span className="italic text-gray-400"> {relationshipData.type} </span>
                                                    <span className={relationshipData.affinity >= 0 ? "text-green-400" : "text-red-400"}>(Thiện cảm: {relationshipData.affinity})</span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <p className="italic text-sm text-gray-500">Chưa có mối quan hệ nào đặc biệt.</p>
                                )}
                             </DetailSection>
                        </div>
                    )}
                    {activeTab === 'log' && (
                        // Tab 3: Nhật Ký
                        <div className="space-y-3">
                            {person.activityLog && person.activityLog.length > 0 ? (
                                person.activityLog.slice().reverse().map((log: ActivityLogEntry, index: number) => (
                                    <div key={index} className="text-sm p-2 bg-gray-800/60 rounded-md">
                                        <p className="text-gray-400">[Lượt {log.turnNumber}] - Tại [{knowledgeBase.discoveredLocations.find(l => l.id === log.locationId)?.name || 'Không rõ'}]:</p>
                                        <p className="text-gray-200 italic mt-1 pl-2 border-l-2 border-gray-700">{log.description}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="italic text-sm text-gray-500 text-center py-4">Chưa có hoạt động nào được ghi nhận.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );

    } else {
        // --- Fallback for non-character entities ---
        switch (type) {
            case 'item': {
                const item = entity as Item;
                title = VIETNAMESE.itemDetails;
                const categoryLabel = VIETNAMESE[`itemCategory_${item.category}` as keyof typeof VIETNAMESE] || item.category;
                content = (
                    <div className="space-y-2">
                        <p><strong className="text-indigo-300">Tên:</strong> {item.name}</p>
                        <p><strong className="text-indigo-300">Phân loại:</strong> {typeof categoryLabel === 'string' ? categoryLabel : item.category}</p>
                        {item.itemRealm && <p><strong className="text-indigo-300">Cảnh Giới Vật Phẩm:</strong> {item.itemRealm}</p>}
                        {item.category === GameTemplates.ItemCategory.EQUIPMENT && (item as GameTemplates.EquipmentTemplate).equipmentType && <p><strong className="text-indigo-300">Loại Trang Bị:</strong> {(item as GameTemplates.EquipmentTemplate).equipmentType}</p>}
                        {item.category === GameTemplates.ItemCategory.POTION && (item as GameTemplates.PotionTemplate).potionType && <p><strong className="text-indigo-300">Loại Đan Dược:</strong> {(item as GameTemplates.PotionTemplate).potionType}</p>}
                        {item.category === GameTemplates.ItemCategory.MATERIAL && (item as GameTemplates.MaterialTemplate).materialType && <p><strong className="text-indigo-300">Loại Nguyên Liệu:</strong> {(item as GameTemplates.MaterialTemplate).materialType}</p>}
                        {item.category === GameTemplates.ItemCategory.CONG_PHAP && (item as GameTemplates.CongPhapTemplate).congPhapType && <p><strong className="text-indigo-300">Loại Công Pháp:</strong> {(item as GameTemplates.CongPhapTemplate).congPhapType}</p>}
                        {item.category === GameTemplates.ItemCategory.PROFESSION_SKILL_BOOK && (item as GameTemplates.ProfessionSkillBookTemplate).professionToLearn && <p><strong className="text-indigo-300">Học Nghề:</strong> {(item as GameTemplates.ProfessionSkillBookTemplate).professionToLearn}</p>}
                        {item.category === GameTemplates.ItemCategory.PROFESSION_TOOL && (item as GameTemplates.ProfessionToolTemplate).professionRequired && <p><strong className="text-indigo-300">Yêu Cầu Nghề:</strong> {(item as GameTemplates.ProfessionToolTemplate).professionRequired}</p>}
                        <p><strong className="text-indigo-300">Độ hiếm:</strong> {item.rarity}</p>
                        <p><strong className="text-indigo-300">Số lượng:</strong> {item.quantity}</p>
                        {item.description && <p><strong className="text-indigo-300">Mô tả:</strong> {item.description}</p>}
                        {item.value !== undefined && <p><strong className="text-indigo-300">Giá trị:</strong> {item.value}</p>}

                        {item.category === GameTemplates.ItemCategory.EQUIPMENT && (
                            <>
                                {(item as GameTemplates.EquipmentTemplate).slot && <p><strong className="text-indigo-300">Vị trí:</strong> {(item as GameTemplates.EquipmentTemplate).slot}</p>}
                                {(item as GameTemplates.EquipmentTemplate).statBonuses && Object.keys((item as GameTemplates.EquipmentTemplate).statBonuses).length > 0 && (
                                    <div><strong className="text-indigo-300">Chỉ số cộng thêm:</strong> {renderStatBonuses((item as GameTemplates.EquipmentTemplate).statBonuses)}</div>
                                )}
                                {(item as GameTemplates.EquipmentTemplate).uniqueEffects && (item as GameTemplates.EquipmentTemplate).uniqueEffects.length > 0 && <p><strong className="text-indigo-300">Hiệu ứng đặc biệt:</strong> {(item as GameTemplates.EquipmentTemplate).uniqueEffects.join(', ')}</p>}
                            </>
                        )}
                        {item.category === GameTemplates.ItemCategory.POTION && (
                            <>
                                {(item as GameTemplates.PotionTemplate).effects && (item as GameTemplates.PotionTemplate).effects.length > 0 && <p><strong className="text-indigo-300">Hiệu ứng:</strong> {(item as GameTemplates.PotionTemplate).effects.join(', ')}</p>}
                                {(item as GameTemplates.PotionTemplate).durationTurns !== undefined && <p><strong className="text-indigo-300">Thời gian hiệu lực:</strong> {(item as GameTemplates.PotionTemplate).durationTurns} lượt</p>}
                            </>
                        )}
                        {item.category === GameTemplates.ItemCategory.CONG_PHAP && (item as GameTemplates.CongPhapTemplate).expBonusPercentage && <p><strong className="text-indigo-300">Tăng Kinh Nghiệm Tu Luyện:</strong> +{(item as GameTemplates.CongPhapTemplate).expBonusPercentage}%</p>}
                        {item.category === GameTemplates.ItemCategory.LINH_KI && (item as GameTemplates.LinhKiTemplate).skillToLearnJSON && <p className="text-xs italic text-gray-400">Vật phẩm này có thể dạy một Linh Kĩ mới.</p>}
                    </div>
                );
                break;
            }
             case 'skill': {
                const skill = entity as Skill;
                title = `${VIETNAMESE.skillDetails}: ${skill.name}`;
                
                const tier = skill.proficiencyTier || "Sơ Nhập";
                const dmgHealMultiplier = PROFICIENCY_DMG_HEAL_MULTIPLIERS[tier] || 1.0;
                const costCdMultiplier = PROFICIENCY_COST_COOLDOWN_MULTIPLIERS[tier] || 1.0;
            
                const renderCombatStats = (s: Skill) => (
                    <div className="space-y-1">
                        {s.manaCost > 0 && <p><strong className="text-indigo-300">Tiêu hao Linh lực:</strong> {Math.ceil(s.manaCost * costCdMultiplier)} <span className="text-xs text-gray-400">(gốc: {s.manaCost})</span></p>}
                        {s.cooldown !== undefined && s.cooldown > 0 && <p><strong className="text-indigo-300">Thời gian hồi:</strong> {Math.ceil(s.cooldown * costCdMultiplier)} lượt <span className="text-xs text-gray-400">(gốc: {s.cooldown})</span></p>}
                        {s.baseDamage > 0 && <p><strong className="text-indigo-300">Sát thương cơ bản:</strong> {Math.round(s.baseDamage * dmgHealMultiplier)} <span className="text-xs text-gray-400">(gốc: {s.baseDamage})</span></p>}
                        {s.damageMultiplier > 0 && <p><strong className="text-indigo-300">Hệ số Sức Tấn Công:</strong> x{(s.damageMultiplier * dmgHealMultiplier).toFixed(2)} <span className="text-xs text-gray-400">(gốc: x{s.damageMultiplier})</span></p>}
                        {s.healingAmount > 0 && <p><strong className="text-indigo-300">Hồi phục cơ bản:</strong> {Math.round(s.healingAmount * dmgHealMultiplier)} <span className="text-xs text-gray-400">(gốc: {s.healingAmount})</span></p>}
                        {s.healingMultiplier > 0 && <p><strong className="text-indigo-300">Hệ số Hồi phục:</strong> x{(s.healingMultiplier * dmgHealMultiplier).toFixed(2)} <span className="text-xs text-gray-400">(gốc: x{s.healingMultiplier})</span></p>}
                        {s.otherEffects && s.otherEffects.length > 0 && <p><strong className="text-indigo-300">Hiệu ứng đặc biệt:</strong> {s.otherEffects.join('; ')}</p>}
                    </div>
                );
            
                content = (
                     <div className="space-y-2">
                        <p><strong className="text-indigo-300">Tên:</strong> {skill.name}</p>
                        <p><strong className="text-indigo-300">Loại:</strong> {skill.skillType}</p>
                        {skill.proficiencyTier && <p><strong className="text-indigo-300">{VIETNAMESE.skillProficiencyLabel || "Độ Thuần Thục"}:</strong> {skill.proficiencyTier} ({skill.proficiency || 0} / {skill.maxProficiency || 100})</p>}
                        {skill.description && <p className="italic text-gray-400 mt-1 mb-2">{skill.description}</p>}
                        
                        <div className="mt-2 pt-2 border-t border-gray-700/50 space-y-1">
                            {skill.skillType === GameTemplates.SkillType.CONG_PHAP_TU_LUYEN && skill.congPhapDetails && (
                                <>
                                    {skill.congPhapDetails.type && <p><strong className="text-indigo-300">Loại Công Pháp:</strong> {skill.congPhapDetails.type}</p>}
                                    {skill.congPhapDetails.grade && <p><strong className="text-indigo-300">Phẩm Chất:</strong> {skill.congPhapDetails.grade}</p>}
                                    {skill.congPhapDetails.weaponFocus && <p><strong className="text-indigo-300">Chuyên Tu Vũ Khí:</strong> {skill.congPhapDetails.weaponFocus}</p>}
                                </>
                            )}
                            
                            {skill.skillType === GameTemplates.SkillType.LINH_KI && skill.linhKiDetails && (
                                <>
                                    {skill.linhKiDetails.category && <p><strong className="text-indigo-300">Phân Loại:</strong> {skill.linhKiDetails.category}</p>}
                                    {skill.linhKiDetails.activation && <p><strong className="text-indigo-300">Kích Hoạt:</strong> {skill.linhKiDetails.activation}</p>}
                                    {skill.linhKiDetails.activation === 'Chủ động' && renderCombatStats(skill)}
                                </>
                            )}
            
                            {skill.skillType === GameTemplates.SkillType.THAN_THONG && renderCombatStats(skill)}
            
                            {skill.skillType === GameTemplates.SkillType.CAM_THUAT && (
                                <>
                                    {skill.camThuatDetails?.sideEffects && <p><strong className="text-red-400">Tác Dụng Phụ:</strong> {skill.camThuatDetails.sideEffects}</p>}
                                    {renderCombatStats(skill)}
                                </>
                            )}
            
                            {skill.skillType === GameTemplates.SkillType.NGHE_NGHIEP && skill.professionDetails && (
                                <>
                                    {skill.professionDetails.type && <p><strong className="text-indigo-300">Nghề Nghiệp:</strong> {skill.professionDetails.type}</p>}
                                    {skill.professionDetails.grade && <p><strong className="text-indigo-300">Cấp Bậc Nghề:</strong> {skill.professionDetails.grade}</p>}
                                    {skill.professionDetails.skillDescription && <p><strong className="text-indigo-300">Mô Tả Kỹ Năng:</strong> {skill.professionDetails.skillDescription}</p>}
                                </>
                            )}
                            
                            {skill.detailedEffect && <p className="mt-2 pt-2 border-t border-gray-700/50"><strong className="text-indigo-300">Mô tả hiệu ứng:</strong> {skill.detailedEffect}</p>}
                        </div>
                    </div>
                );
                break;
            }
            // Other cases remain the same
            default:
                 content = <p>Không có thông tin chi tiết cho loại thực thể này.</p>;
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-2 text-sm">
                {content}
            </div>
        </Modal>
    );
};

export default EntityDetailModal;
