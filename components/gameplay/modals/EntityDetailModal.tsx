import React, { useState, useEffect, useMemo } from 'react';
import { GameEntity, GameEntityType } from '../../../hooks/types';
import { KnowledgeBase, PlayerStats, Item, Skill, Quest, NPC, GameLocation, WorldLoreEntry, Companion, Faction, YeuThu, Wife, Slave, Prisoner, ActivityLogEntry, QuestObjective, StartingNPC, RelationshipEntry } from '../../../types/index';
import * as GameTemplates from '../../../types/index';
import Modal from '../../ui/Modal';
import { VIETNAMESE, PROFICIENCY_DMG_HEAL_MULTIPLIERS, PROFICIENCY_COST_COOLDOWN_MULTIPLIERS, PROFICIENCY_EXP_THRESHOLDS } from '../../../constants/index';
import { PROFICIENCY_TIERS } from '../../../types/index';
import { getDeterministicAvatarSrc } from '../../../utils/avatarUtils';
import InputField from '../../ui/InputField';
import Button from '../../ui/Button';
import { useGame } from '../../../hooks/useGame';

interface EntityDetailModalProps {
    selectedEntity: { type: GameEntityType; entity: GameEntity, isEditing?: boolean } | null;
    isOpen: boolean;
    onClose: () => void;
    knowledgeBase: KnowledgeBase;
    onUpdateEntity: (entityType: GameEntityType, entityData: GameEntity) => void;
}

const DetailSection: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-gray-900/40 p-3 rounded-lg mt-4 border border-gray-700/50">
            <h4
                className="font-semibold text-lg text-indigo-300 border-b border-gray-600 pb-2 mb-3 flex justify-between items-center cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <span>{title}</span>
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
            </h4>
            {isOpen && children}
        </div>
    );
};

const StatGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2">{children}</div>
);

const InfoPair: React.FC<{ label: string; children: React.ReactNode; fullWidth?: boolean }> = ({ label, children, fullWidth = false }) => (
    <div className={fullWidth ? 'col-span-2' : ''}>
        <p className="text-sm text-indigo-300">{label}</p>
        <div className="text-gray-100">{children}</div>
    </div>
);

const ProgressBar: React.FC<{ value: number; max: number; colorClass?: string; }> = ({ value, max, colorClass = 'bg-cyan-500' }) => (
    <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div className={`${colorClass} h-2.5 rounded-full`} style={{ width: `${(value / max) * 100}%` }}></div>
    </div>
);

type PersonDetailTab = 'info' | 'personality' | 'log';

// --- Reusable Person Details Component with Tabs ---
const PersonDetails: React.FC<{ person: NPC | Wife | Slave | Prisoner; knowledgeBase: KnowledgeBase; children?: React.ReactNode; onClose: () => void; }> = ({ person, knowledgeBase, children, onClose }) => {
    const { openEntityModal } = useGame();
    const [activeTab, setActiveTab] = useState<PersonDetailTab>('info');
    
    const findPersonName = (id: string) => knowledgeBase.discoveredNPCs.find(p => p.id === id)?.name || id;

    const currentLocation = useMemo(() => {
        if (!person.locationId) return null;
        return knowledgeBase.discoveredLocations.find(loc => loc.id === person.locationId);
    }, [person.locationId, knowledgeBase.discoveredLocations]);

    const handleLocationClick = () => {
        if (currentLocation) {
            onClose(); 
            setTimeout(() => {
                openEntityModal('location', currentLocation);
            }, 100); 
        }
    };

    const activeTabStyle = "border-indigo-400 text-indigo-300";
    const inactiveTabStyle = "border-transparent text-gray-400 hover:border-gray-500 hover:text-gray-200";

    return (
        <>
            <div className="border-b border-gray-700 mb-4">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('info')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'info' ? activeTabStyle : inactiveTabStyle}`}>
                        Thông Tin
                    </button>
                    <button onClick={() => setActiveTab('personality')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'personality' ? activeTabStyle : inactiveTabStyle}`}>
                        Tính Cách & Mục Tiêu
                    </button>
                    <button onClick={() => setActiveTab('log')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'log' ? activeTabStyle : inactiveTabStyle}`}>
                        Nhật Ký
                    </button>
                </nav>
            </div>

            <div className="mt-2">
                {activeTab === 'info' && (
                    <div>
                        <div className="flex items-start gap-4 mb-4">
                            <img src={getDeterministicAvatarSrc(person)} alt={person.name} className="w-24 h-24 rounded-full object-cover border-2 border-indigo-500"/>
                            <div className="flex-grow space-y-2">
                                {person.title && <p className="text-lg font-semibold text-gray-300">{person.title}</p>}
                                <p><strong className="text-gray-400">Giới tính:</strong> {person.gender}</p>
                                <p><strong className="text-gray-400">Chủng tộc:</strong> {person.race}</p>
                                <p><strong className="text-gray-400">Phe phái:</strong> {knowledgeBase.discoveredFactions.find(f => f.id === (person as NPC).factionId)?.name || 'Không có'}</p>
                            </div>
                        </div>
                        <p className="text-sm italic text-gray-400">{person.description}</p>
                        
                        <DetailSection title="Thông Tin Tu Luyện & Chỉ Số">
                            <StatGrid>
                                <InfoPair label="Cảnh giới">{person.realm || 'Không rõ'}</InfoPair>
                                <InfoPair label="Thiện cảm">{person.affinity}</InfoPair>
                                <InfoPair label="Tư chất">{person.tuChat || 'Không rõ'}</InfoPair>
                                <InfoPair label="Linh căn">{person.spiritualRoot || 'Không rõ'}</InfoPair>
                                <InfoPair label="Thọ nguyên" fullWidth>{Math.floor(person.stats?.thoNguyen || 0)} / {person.stats?.maxThoNguyen || 0} năm</InfoPair>
                                <InfoPair label="Thể chất đặc biệt" fullWidth>{person.specialPhysique || 'Không rõ'}</InfoPair>
                            </StatGrid>
                            <h5 className="font-semibold text-indigo-200 mt-4 mb-2">Chỉ số chiến đấu</h5>
                            <StatGrid>
                                <InfoPair label="Sinh lực">{person.stats?.sinhLuc ?? '??'} / {person.stats?.maxSinhLuc ?? '??'}</InfoPair>
                                <InfoPair label="Linh lực">{person.stats?.linhLuc ?? '??'} / {person.stats?.maxLinhLuc ?? '??'}</InfoPair>
                                <InfoPair label="Sức tấn công">{person.stats?.sucTanCong ?? '??'}</InfoPair>
                            </StatGrid>
                        </DetailSection>

                        {children}

                        {(person as NPC).vendorType && (
                            <DetailSection title="Thông Tin Thương Nhân">
                                <p><strong className="text-gray-400">Loại hình:</strong> {(person as NPC).vendorType}</p>
                                <p><strong className="text-gray-400">Khẩu hiệu:</strong> "{(person as NPC).vendorSlogan}"</p>
                                <p><strong className="text-gray-400">Chuyên mua:</strong> {(person as NPC).vendorBuysCategories?.join(', ')}</p>
                            </DetailSection>
                        )}
                        {(person as Wife | Slave).skills?.length > 0 && (
                            <DetailSection title="Kỹ Năng">
                                <ul className="list-disc list-inside space-y-1">
                                    {(person as Wife | Slave).skills.map(skill => <li key={skill.id}>{skill.name}</li>)}
                                </ul>
                            </DetailSection>
                        )}
                    </div>
                )}

                {activeTab === 'personality' && (
                     <div>
                        <DetailSection title="Vị Trí & Kế Hoạch">
                            <InfoPair label="Vị trí hiện tại">
                                {currentLocation ? (
                                    <button onClick={handleLocationClick} className="text-cyan-400 underline hover:text-cyan-300 transition-colors">
                                        {currentLocation.name}
                                    </button>
                                ) : ( 'Không rõ' )}
                            </InfoPair>
                            <div className="mt-3 space-y-2">
                                <InfoPair label="Mục tiêu dài hạn">{(person as NPC).longTermGoal || 'Chưa có'}</InfoPair>
                                <InfoPair label="Mục tiêu ngắn hạn">{(person as NPC).shortTermGoal || 'Chưa có'}</InfoPair>
                            </div>
                        </DetailSection>

                        <DetailSection title="Tính Cách & Mối Quan Hệ">
                            <InfoPair label="Tính cách">
                                <div className="flex flex-wrap gap-2">
                                    {(person as NPC).personalityTraits?.map(trait => <span key={trait} className="bg-gray-700 text-xs px-2 py-1 rounded-full">{trait}</span>)}
                                </div>
                            </InfoPair>

                            {(person as NPC).relationships && Object.keys((person as NPC).relationships).length > 0 && (
                                <div className="mt-4">
                                     <h5 className="font-semibold text-indigo-200 mt-4 mb-2">Mối quan hệ</h5>
                                     <ul className="list-disc list-inside space-y-1">
                                        {Object.entries((person as NPC).relationships as Record<string, RelationshipEntry>).map(([targetId, rel]) => (
                                            <li key={targetId}>{rel.type} với <strong>{findPersonName(targetId)}</strong> (Thiện cảm: {rel.affinity})</li>
                                        ))}
                                    </ul>
                                </div>
                             )}
                        </DetailSection>
                     </div>
                )}

                {activeTab === 'log' && (
                     <div>
                        {(person as NPC).activityLog && (person as NPC).activityLog.length > 0 ? (
                            <DetailSection title="Nhật Ký Hoạt Động (5 gần nhất)">
                                <ul className="space-y-2 text-xs">
                                    {[...(person as NPC).activityLog].reverse().slice(0, 5).map((log, index) => (
                                        <li key={index} className="border-b border-gray-800 pb-1">
                                            <p className="text-gray-300">{log.description}</p>
                                            <p className="text-gray-500">Lượt {log.turnNumber} tại {knowledgeBase.discoveredLocations.find(l => l.id === log.locationId)?.name || 'Không rõ'}</p>
                                        </li>
                                    ))}
                                </ul>
                            </DetailSection>
                         ) : (
                            <p className="text-gray-500 italic text-center py-4">Không có hoạt động nào được ghi lại.</p>
                         )}
                    </div>
                )}
            </div>
        </>
    );
};


const EntityDetailModal: React.FC<EntityDetailModalProps> = ({ selectedEntity, isOpen, onClose, knowledgeBase, onUpdateEntity }) => {
    const [formData, setFormData] = useState<GameEntity | null>(null);
    const isEditing = selectedEntity?.isEditing || false;

    useEffect(() => {
        setFormData(selectedEntity?.entity ? JSON.parse(JSON.stringify(selectedEntity.entity)) : null);
    }, [selectedEntity]);

    const handleSaveChanges = () => {
        if (formData && selectedEntity) {
            onUpdateEntity(selectedEntity.type, formData);
        }
    };
    
    if (!isOpen || !selectedEntity || !formData) return null;

    const { type, entity } = selectedEntity;
    let title = "Chi Tiết";
    let content: React.ReactNode = null;

    const findNpcName = (id: string) => knowledgeBase.discoveredNPCs.find(npc => npc.id === id)?.name || id;
    const findLocationName = (id: string) => knowledgeBase.discoveredLocations.find(loc => loc.id === id)?.name || id;

    switch (type) {
        case 'npc': {
            const npc = formData as NPC;
            title = `Chi Tiết NPC: ${npc.name}`;
            content = <PersonDetails person={npc} knowledgeBase={knowledgeBase} onClose={onClose} />;
            break;
        }
        case 'wife':
        case 'slave':
        case 'prisoner': {
            const person = formData as Wife | Slave | Prisoner;
            const personTypeMap = { wife: 'Đạo Lữ', slave: 'Nô Lệ', prisoner: 'Tù Nhân' };
            const personTypeLabel = personTypeMap[person.entityType];
            title = `Chi Tiết ${personTypeLabel}: ${person.name}`;
            content = (
                <PersonDetails person={person} knowledgeBase={knowledgeBase} onClose={onClose}>
                    <DetailSection title="Chỉ Số Thân Phận">
                        <StatGrid>
                            <InfoPair label={VIETNAMESE.statWillpower}>{person.willpower}</InfoPair>
                            <InfoPair label={VIETNAMESE.statObedience}>{person.obedience}</InfoPair>
                            {'resistance' in person && <InfoPair label={VIETNAMESE.statResistance}>{(person as Prisoner).resistance}</InfoPair>}
                            {'fear' in person && <InfoPair label={VIETNAMESE.statFear}>{(person as Slave).fear || 0}</InfoPair>}
                            {'trust' in person && <InfoPair label={VIETNAMESE.statTrust}>{(person as Slave).trust || 0}</InfoPair>}
                        </StatGrid>
                    </DetailSection>
                </PersonDetails>
            );
            break;
        }
        case 'lore': {
            const lore = formData as WorldLoreEntry;
            title = `Chi Tiết Tri Thức: ${lore.title}`;
            content = (
                <div className="space-y-4">
                    <p className="whitespace-pre-wrap">{lore.content}</p>
                </div>
            );
            break;
        }
        case 'skill': {
            const skill = formData as Skill;
            const proficiencyTierIndex = PROFICIENCY_TIERS.indexOf(skill.proficiencyTier || "Sơ Nhập");
            title = `Chi Tiết Kỹ Năng: ${skill.name}`;
            content = (
                <div className="space-y-4">
                    <p className="italic text-gray-400">{skill.description}</p>
                    <DetailSection title="Thông Tin Cơ Bản">
                        <StatGrid>
                            <InfoPair label="Loại kỹ năng">{skill.skillType}</InfoPair>
                            <InfoPair label="Mục tiêu">{skill.targetType || 'Không rõ'}</InfoPair>
                            <InfoPair label="Linh lực tiêu hao">{skill.manaCost}</InfoPair>
                            <InfoPair label="Thời gian hồi">{skill.cooldown} lượt</InfoPair>
                        </StatGrid>
                    </DetailSection>
                    <DetailSection title="Hiệu Quả & Độ Thuần Thục">
                        <InfoPair label="Độ thuần thục">
                            <div className="space-y-1">
                                <p>{skill.proficiencyTier} ({skill.proficiency} / {skill.maxProficiency || 'MAX'})</p>
                                <ProgressBar value={skill.proficiency || 0} max={skill.maxProficiency || 100} />
                            </div>
                        </InfoPair>
                        <div className="mt-4">
                            <p className="font-semibold text-indigo-200 mb-2">Hiệu quả chi tiết</p>
                            <p className="text-sm whitespace-pre-wrap">{skill.detailedEffect}</p>
                             <StatGrid>
                                <InfoPair label="Sát thương cơ bản">{Math.round(skill.baseDamage * PROFICIENCY_DMG_HEAL_MULTIPLIERS[skill.proficiencyTier || "Sơ Nhập"])}</InfoPair>
                                <InfoPair label="Hồi phục cơ bản">{Math.round(skill.healingAmount * PROFICIENCY_DMG_HEAL_MULTIPLIERS[skill.proficiencyTier || "Sơ Nhập"])}</InfoPair>
                                <InfoPair label="Sát thương theo % ATK">{(skill.damageMultiplier * 100).toFixed(0)}%</InfoPair>
                                <InfoPair label="Hồi phục theo % ATK">{(skill.healingMultiplier * 100).toFixed(0)}%</InfoPair>
                             </StatGrid>
                        </div>
                    </DetailSection>

                    {skill.skillType === GameTemplates.SkillType.CONG_PHAP_TU_LUYEN && skill.congPhapDetails && (
                        <DetailSection title="Chi Tiết Công Pháp">
                            <StatGrid>
                                <InfoPair label="Loại công pháp">{skill.congPhapDetails.type}</InfoPair>
                                <InfoPair label="Phẩm chất">{skill.congPhapDetails.grade}</InfoPair>
                                {skill.congPhapDetails.weaponFocus && <InfoPair label="Chuyên tu vũ khí">{skill.congPhapDetails.weaponFocus}</InfoPair>}
                            </StatGrid>
                        </DetailSection>
                    )}
                     {skill.skillType === GameTemplates.SkillType.LINH_KI && skill.linhKiDetails && (
                        <DetailSection title="Chi Tiết Linh Kĩ">
                            <StatGrid>
                                <InfoPair label="Phân loại">{skill.linhKiDetails.category}</InfoPair>
                                <InfoPair label="Loại kích hoạt">{skill.linhKiDetails.activation}</InfoPair>
                            </StatGrid>
                        </DetailSection>
                    )}
                </div>
            );
            break;
        }
        case 'quest': {
            const quest = formData as Quest;
            title = `Chi Tiết Nhiệm Vụ: ${quest.title}`;
            content = (
                <div className="space-y-4">
                    <p className="italic text-gray-400">{quest.description}</p>
                    <DetailSection title="Mục tiêu">
                        <ul className="space-y-2">
                        {quest.objectives.map((obj) => (
                            <li key={obj.id} className="flex items-center gap-3">
                               <span className={obj.completed ? 'text-green-400' : 'text-gray-500'}>{obj.completed ? '✓' : '✗'}</span>
                               <p className={obj.completed ? 'line-through text-gray-500' : ''}>{obj.text}</p>
                            </li>
                        ))}
                        </ul>
                    </DetailSection>
                </div>
            );
            break;
        }
        case 'item': {
            const item = formData as Item;
            title = `Chi Tiết Vật Phẩm: ${item.name}`;
            content = (
                <div className="space-y-4">
                    <p className="italic text-gray-400">{item.description}</p>
                    <DetailSection title="Thông Tin Cơ Bản">
                        <StatGrid>
                            <InfoPair label="Số lượng">{item.quantity}</InfoPair>
                            <InfoPair label="Loại">{item.category}</InfoPair>
                            <InfoPair label="Độ hiếm">{item.rarity}</InfoPair>
                            <InfoPair label="Giá trị">{item.value?.toLocaleString()} {knowledgeBase.worldConfig?.currencyName}</InfoPair>
                            <InfoPair label="Cảnh giới vật phẩm" fullWidth>{item.itemRealm}</InfoPair>
                        </StatGrid>
                    </DetailSection>

                    {item.category === GameTemplates.ItemCategory.EQUIPMENT && (
                        <DetailSection title="Thuộc tính Trang bị">
                            <StatGrid>
                                <InfoPair label="Loại trang bị">{(item as GameTemplates.EquipmentTemplate).equipmentType}</InfoPair>
                                <InfoPair label="Vị trí">{(item as GameTemplates.EquipmentTemplate).slot || 'N/A'}</InfoPair>
                                <InfoPair label="Chỉ số cộng thêm" fullWidth>
                                    <pre className="text-xs bg-gray-900 p-2 rounded"><code>{JSON.stringify((item as GameTemplates.EquipmentTemplate).statBonuses, null, 2)}</code></pre>
                                </InfoPair>
                                <InfoPair label="Hiệu ứng đặc biệt" fullWidth>
                                    <ul className="list-disc list-inside">
                                        {(item as GameTemplates.EquipmentTemplate).uniqueEffects.map((effect, i) => <li key={i}>{effect}</li>)}
                                    </ul>
                                </InfoPair>
                            </StatGrid>
                        </DetailSection>
                    )}
                    {item.category === GameTemplates.ItemCategory.POTION && (
                         <DetailSection title="Thuộc tính Đan Dược">
                            <StatGrid>
                                <InfoPair label="Loại đan dược">{(item as GameTemplates.PotionTemplate).potionType}</InfoPair>
                            </StatGrid>
                            <InfoPair label="Công dụng">
                                <ul className="list-disc list-inside">
                                    {(item as GameTemplates.PotionTemplate).effects.map((effect, i) => <li key={i}>{effect}</li>)}
                                </ul>
                            </InfoPair>
                         </DetailSection>
                    )}
                     {item.category === GameTemplates.ItemCategory.CONG_PHAP && (
                        <DetailSection title="Chi Tiết Công Pháp">
                            <StatGrid>
                                <InfoPair label="Loại công pháp">{(item as GameTemplates.CongPhapTemplate).congPhapType}</InfoPair>
                                <InfoPair label="% Kinh nghiệm thưởng">{ (item as GameTemplates.CongPhapTemplate).expBonusPercentage}%</InfoPair>
                            </StatGrid>
                        </DetailSection>
                    )}
                     {item.category === GameTemplates.ItemCategory.LINH_KI && (
                        <DetailSection title="Chi Tiết Linh Kĩ">
                           <InfoPair label="Học được kỹ năng">
                                <pre className="text-xs bg-gray-900 p-2 rounded"><code>{(item as GameTemplates.LinhKiTemplate).skillToLearnJSON}</code></pre>
                            </InfoPair>
                        </DetailSection>
                    )}
                     {item.category === GameTemplates.ItemCategory.PROFESSION_SKILL_BOOK && (
                        <DetailSection title="Chi Tiết Sách Nghề">
                            <InfoPair label="Học được nghề">{(item as GameTemplates.ProfessionSkillBookTemplate).professionToLearn}</InfoPair>
                        </DetailSection>
                    )}
                     {item.category === GameTemplates.ItemCategory.PROFESSION_TOOL && (
                        <DetailSection title="Chi Tiết Dụng Cụ Nghề">
                            <InfoPair label="Yêu cầu nghề">{(item as GameTemplates.ProfessionToolTemplate).professionRequired}</InfoPair>
                        </DetailSection>
                    )}
                </div>
            );
            break;
        }
        case 'yeuThu': {
            const yeuThu = formData as YeuThu;
            title = `Chi Tiết Yêu Thú: ${yeuThu.name}`;
            content = (
                <div className="space-y-4">
                    <p className="italic text-gray-400">{yeuThu.description}</p>
                    <DetailSection title="Thông Tin Cơ Bản">
                         <StatGrid>
                            <InfoPair label="Loài">{yeuThu.species}</InfoPair>
                            <InfoPair label="Cảnh giới">{yeuThu.realm}</InfoPair>
                            <InfoPair label="Thái độ">{yeuThu.isHostile ? 'Thù địch' : 'Trung lập / Thân thiện'}</InfoPair>
                         </StatGrid>
                    </DetailSection>
                     <DetailSection title="Chỉ số chiến đấu">
                        <StatGrid>
                            <InfoPair label="Sinh lực">{yeuThu.stats?.sinhLuc ?? '??'} / {yeuThu.stats?.maxSinhLuc ?? '??'}</InfoPair>
                            <InfoPair label="Linh lực">{yeuThu.stats?.linhLuc ?? '??'} / {yeuThu.stats?.maxLinhLuc ?? '??'}</InfoPair>
                            <InfoPair label="Sức tấn công">{yeuThu.stats?.sucTanCong ?? '??'}</InfoPair>
                        </StatGrid>
                     </DetailSection>
                     {(yeuThu.skills && yeuThu.skills.length > 0) && (
                        <DetailSection title="Kỹ năng" defaultOpen={false}>
                            <ul className="list-disc list-inside">
                                {yeuThu.skills.map(skill => <li key={skill}>{skill}</li>)}
                            </ul>
                        </DetailSection>
                     )}
                </div>
            );
            break;
        }
        case 'location': {
            const location = formData as GameLocation;
            title = `Chi Tiết Địa Điểm: ${location.name}`;
            content = (
                 <div className="space-y-4">
                    <p className="italic text-gray-400">{location.description}</p>
                    <DetailSection title="Thông Tin Cơ Bản">
                        <StatGrid>
                            <InfoPair label="Loại">{location.locationType}</InfoPair>
                            <InfoPair label="Vùng">{knowledgeBase.discoveredRegions.find(r => r.id === location.regionId)?.name || 'Chưa rõ'}</InfoPair>
                            <InfoPair label="An toàn">{location.isSafeZone ? 'Có' : 'Không'}</InfoPair>
                            <InfoPair label="Trạng thái">{location.visited ? 'Đã đến' : 'Chưa đến'}</InfoPair>
                            <InfoPair label="Tọa độ">({location.mapX ?? '?'}, {location.mapY ?? '?'})</InfoPair>
                            {location.parentLocationId && <InfoPair label="Thuộc khu vực">{findLocationName(location.parentLocationId)}</InfoPair>}
                        </StatGrid>
                    </DetailSection>
                    {location.connections && location.connections.filter(c => c.isDiscovered).length > 0 && (
                        <DetailSection title="Kết nối đã biết" defaultOpen={false}>
                            <ul className="list-disc list-inside">
                                {location.connections.filter(c=>c.isDiscovered).map(conn => <li key={conn.targetLocationId}>{findLocationName(conn.targetLocationId)}</li>)}
                            </ul>
                        </DetailSection>
                    )}
                     {location.environmentalEffects && location.environmentalEffects.length > 0 && (
                        <DetailSection title="Hiệu ứng Môi trường" defaultOpen={false}>
                            <ul className="list-disc list-inside">
                                {location.environmentalEffects.map(eff => <li key={eff}>{eff}</li>)}
                            </ul>
                        </DetailSection>
                    )}
                </div>
            );
            break;
        }
        case 'faction': {
            const faction = formData as Faction;
            title = `Chi Tiết Phe Phái: ${faction.name}`;
            content = (
                <div className="space-y-4">
                    <p className="italic text-gray-400">{faction.description}</p>
                    <DetailSection title="Thông Tin Cơ Bản">
                        <StatGrid>
                            <InfoPair label="Chính/Tà">{faction.alignment}</InfoPair>
                            <InfoPair label="Uy tín của bạn">{faction.playerReputation}</InfoPair>
                            <InfoPair label="Trụ sở" fullWidth>{findLocationName(faction.baseLocationId || '')}</InfoPair>
                        </StatGrid>
                    </DetailSection>
                    <DetailSection title="Thành Viên & Quan Hệ" defaultOpen={false}>
                        <InfoPair label="Lãnh đạo">{findNpcName(faction.leaderNPCId || '')}</InfoPair>
                         {faction.keyNPCIds && faction.keyNPCIds.length > 0 && (
                            <InfoPair label="Thành viên chủ chốt">
                                <ul className="list-disc list-inside">
                                    {faction.keyNPCIds.map(id => <li key={id}>{findNpcName(id)}</li>)}
                                </ul>
                            </InfoPair>
                         )}
                         {faction.alliedFactionIds && faction.alliedFactionIds.length > 0 && (
                            <InfoPair label="Đồng minh">
                                <ul className="list-disc list-inside">
                                    {faction.alliedFactionIds.map(id => <li key={id}>{knowledgeBase.discoveredFactions.find(f=>f.id === id)?.name || id}</li>)}
                                </ul>
                            </InfoPair>
                         )}
                         {faction.enemyFactionIds && faction.enemyFactionIds.length > 0 && (
                            <InfoPair label="Kẻ địch">
                                <ul className="list-disc list-inside">
                                    {faction.enemyFactionIds.map(id => <li key={id}>{knowledgeBase.discoveredFactions.find(f=>f.id === id)?.name || id}</li>)}
                                </ul>
                            </InfoPair>
                         )}
                    </DetailSection>
                </div>
            );
            break;
        }
        case 'companion': {
            const companion = formData as Companion;
            title = `Chi Tiết Đồng Hành: ${companion.name}`;
            content = (
                <div className="space-y-4">
                    <p className="italic text-gray-400">{companion.description}</p>
                    <DetailSection title="Chỉ số">
                        <StatGrid>
                            <InfoPair label="HP">{companion.hp} / {companion.maxHp}</InfoPair>
                            <InfoPair label="Mana">{companion.mana} / {companion.maxMana}</InfoPair>
                            <InfoPair label="Sức tấn công">{companion.atk}</InfoPair>
                        </StatGrid>
                    </DetailSection>
                </div>
            );
            break;
        }
        default: {
            title = `Chi Tiết: ${(entity as any).name || (entity as any).title}`;
            content = <p className="italic text-gray-400">Chức năng xem chi tiết cho loại thực thể này chưa được hỗ trợ.</p>;
        }
    }


    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-2 text-sm">
                {content}
            </div>
             {isEditing && (
                <div className="mt-6 pt-4 border-t border-gray-700 flex justify-end flex-shrink-0">
                    <Button onClick={onClose} variant="secondary" type="button" className="mr-3">
                        {VIETNAMESE.cancelEditButton || "Hủy"}
                    </Button>
                    <Button onClick={handleSaveChanges} variant="primary" type="button">
                        {VIETNAMESE.saveEditButton || "Lưu Thay Đổi"}
                    </Button>
                </div>
            )}
        </Modal>
    );
};

export default EntityDetailModal;