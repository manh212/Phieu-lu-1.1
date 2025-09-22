import React, { useState, useEffect, useMemo } from 'react';
import { GameEntity, GameEntityType } from '../../../hooks/types';
import { KnowledgeBase, PlayerStats, Item, Skill, Quest, NPC, GameLocation, WorldLoreEntry, Companion, Faction, YeuThu, Wife, Slave, Prisoner, ActivityLogEntry, QuestObjective, StartingNPC, RelationshipEntry } from '../../../types/index';
import * as GameTemplates from '../../../types/index';
import Modal from '../../ui/Modal';
import { VIETNAMESE, PROFICIENCY_DMG_HEAL_MULTIPLIERS, PROFICIENCY_COST_COOLDOWN_MULTIPLIERS, PROFICIENCY_EXP_THRESHOLDS, ALL_FACTION_ALIGNMENTS } from '../../../constants/index';
import { PROFICIENCY_TIERS, TU_CHAT_TIERS } from '../../../types/index';
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
    const { openEntityModal } = useGame();

    useEffect(() => {
        setFormData(selectedEntity?.entity ? JSON.parse(JSON.stringify(selectedEntity.entity)) : null);
    }, [selectedEntity]);
    
    const handleFormChange = (field: string, value: any, type: string = 'string') => {
        setFormData(prev => {
            if (!prev) return null;
            let finalValue = value;
            if (type === 'number') {
                finalValue = parseInt(value, 10);
                if (isNaN(finalValue)) finalValue = 0;
            } else if (type === 'checkbox') {
                finalValue = value; // Already boolean
            }
            
            const newFormData = JSON.parse(JSON.stringify(prev));
            const fieldParts = field.split('.');
            let currentLevel: any = newFormData;
            for (let i = 0; i < fieldParts.length - 1; i++) {
                const part = fieldParts[i];
                if (currentLevel[part] === undefined || currentLevel[part] === null) {
                    currentLevel[part] = {};
                }
                currentLevel = currentLevel[part];
            }
            currentLevel[fieldParts[fieldParts.length - 1]] = finalValue;
            return newFormData;
        });
    };

    const handleObjectiveChange = (index: number, field: keyof QuestObjective, value: string | boolean) => {
        setFormData(prev => {
            if (!prev || !('objectives' in prev)) return prev;
            const newFormData = JSON.parse(JSON.stringify(prev)) as Quest;
            const newObjectives = [...newFormData.objectives];
            (newObjectives[index] as any)[field] = value;
            newFormData.objectives = newObjectives;
            return newFormData;
        });
    };

    const FactionDetails: React.FC<{ faction: Faction; knowledgeBase: KnowledgeBase; }> = ({ faction, knowledgeBase, }) => {
        const [activeTab, setActiveTab] = useState<'info' | 'relations'>('info');
        
        const findNpcName = (id: string) => knowledgeBase.discoveredNPCs.find(npc => npc.id === id)?.name || id;
        const findLocationName = (id: string) => knowledgeBase.discoveredLocations.find(loc => loc.id === id)?.name || id;
        const findFactionName = (id: string) => knowledgeBase.discoveredFactions.find(f => f.id === id)?.name || id;

        const activeTabStyle = "border-indigo-400 text-indigo-300";
        const inactiveTabStyle = "border-transparent text-gray-400 hover:border-gray-500 hover:text-gray-200";

        return (
            <div className="space-y-4">
                <p className="italic text-gray-400">{faction.description}</p>
    
                <div className="border-b border-gray-700">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <button onClick={() => setActiveTab('info')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'info' ? activeTabStyle : inactiveTabStyle}`}>
                            Thông Tin Phe Phái
                        </button>
                        <button onClick={() => setActiveTab('relations')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'relations' ? activeTabStyle : inactiveTabStyle}`}>
                            Thành Viên & Quan Hệ
                        </button>
                    </nav>
                </div>
                
                <div className="mt-4">
                    {activeTab === 'info' && (
                        <div className="space-y-2">
                            <h4 className="font-semibold text-lg text-indigo-300 mb-2">Thông Tin Cơ Bản</h4>
                            <StatGrid>
                                <InfoPair label="Chính/Tà">{faction.alignment}</InfoPair>
                                <InfoPair label="Uy tín của bạn">{faction.playerReputation}</InfoPair>
                                <InfoPair label="Trụ sở" fullWidth>{findLocationName(faction.baseLocationId || '')}</InfoPair>
                            </StatGrid>
                        </div>
                    )}
                    {activeTab === 'relations' && (
                        <div className="space-y-4">
                             <h4 className="font-semibold text-lg text-indigo-300 mb-2">Thành Viên & Quan Hệ</h4>
                             <StatGrid>
                                <InfoPair label="Lãnh đạo">{findNpcName(faction.leaderNPCId || 'Chưa rõ')}</InfoPair>
                             </StatGrid>
                             {(faction.keyNPCIds && faction.keyNPCIds.length > 0) && (
                                <InfoPair label="Thành viên chủ chốt" fullWidth>
                                    <ul className="list-disc list-inside space-y-1">
                                        {faction.keyNPCIds.map(id => <li key={id}>{findNpcName(id)}</li>)}
                                    </ul>
                                </InfoPair>
                             )}
                             {(faction.alliedFactionIds && faction.alliedFactionIds.length > 0) && (
                                <InfoPair label="Đồng minh" fullWidth>
                                    <ul className="list-disc list-inside space-y-1">
                                        {faction.alliedFactionIds.map(id => <li key={id}>{findFactionName(id)}</li>)}
                                    </ul>
                                </InfoPair>
                             )}
                             {(faction.enemyFactionIds && faction.enemyFactionIds.length > 0) && (
                                <InfoPair label="Kẻ địch" fullWidth>
                                    <ul className="list-disc list-inside space-y-1">
                                        {faction.enemyFactionIds.map(id => <li key={id}>{findFactionName(id)}</li>)}
                                    </ul>
                                </InfoPair>
                             )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

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
            title = `Chi Tiết NPC: ${isEditing ? '' : npc.name}`;
            content = isEditing ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                    <InputField label="Tên" id="npc-name" value={npc.name} onChange={e => handleFormChange('name', e.target.value)} />
                    <InputField label="Chức danh" id="npc-title" value={npc.title} onChange={e => handleFormChange('title', e.target.value)} />
                    <InputField label="Giới tính" id="npc-gender" type="select" options={['Nam', 'Nữ', 'Khác', 'Không rõ']} value={npc.gender} onChange={e => handleFormChange('gender', e.target.value)} />
                    <InputField label="Chủng tộc" id="npc-race" value={npc.race} onChange={e => handleFormChange('race', e.target.value)} />
                    <InputField label="Cảnh giới" id="npc-realm" value={npc.realm} onChange={e => handleFormChange('realm', e.target.value)} />
                    <InputField label="Thiện cảm" id="npc-affinity" type="number" value={npc.affinity} onChange={e => handleFormChange('affinity', e.target.value, 'number')} />
                    <InputField label="Tư chất" id="npc-tuChat" type="select" options={[...TU_CHAT_TIERS]} value={npc.tuChat} onChange={e => handleFormChange('tuChat', e.target.value)} />
                    <InputField label="Linh căn" id="npc-spiritualRoot" value={npc.spiritualRoot} onChange={e => handleFormChange('spiritualRoot', e.target.value)} />
                    <InputField label="Thể chất" id="npc-specialPhysique" value={npc.specialPhysique} onChange={e => handleFormChange('specialPhysique', e.target.value)} />
                    <InputField label="Mô tả" id="npc-description" value={npc.description} onChange={e => handleFormChange('description', e.target.value)} textarea rows={3} className="md:col-span-2"/>
                    <InputField label="Mục tiêu dài hạn" id="npc-longTermGoal" value={npc.longTermGoal} onChange={e => handleFormChange('longTermGoal', e.target.value)} textarea rows={2} className="md:col-span-2"/>
                    <InputField label="Mục tiêu ngắn hạn" id="npc-shortTermGoal" value={npc.shortTermGoal} onChange={e => handleFormChange('shortTermGoal', e.target.value)} textarea rows={2} className="md:col-span-2"/>
                </div>
            ) : <PersonDetails person={npc} knowledgeBase={knowledgeBase} onClose={onClose} />;
            break;
        }
        case 'wife':
        case 'slave':
        case 'prisoner': {
            const person = formData as Wife | Slave | Prisoner;
            const personTypeMap = { wife: 'Đạo Lữ', slave: 'Nô Lệ', prisoner: 'Tù Nhân' };
            const personTypeLabel = personTypeMap[person.entityType];
            title = `Chi Tiết ${personTypeLabel}: ${isEditing ? '' : person.name}`;
            content = isEditing ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                    <InputField label="Tên" id="person-name" value={person.name} onChange={e => handleFormChange('name', e.target.value)} />
                    <InputField label="Thiện cảm" id="person-affinity" type="number" value={person.affinity} onChange={e => handleFormChange('affinity', e.target.value, 'number')} />
                    <InputField label="Ý chí" id="person-willpower" type="number" value={person.willpower} onChange={e => handleFormChange('willpower', e.target.value, 'number')} />
                    <InputField label="Phục tùng" id="person-obedience" type="number" value={person.obedience} onChange={e => handleFormChange('obedience', e.target.value, 'number')} />
                    {'resistance' in person && <InputField label="Phản kháng" id="person-resistance" type="number" value={(person as Prisoner).resistance} onChange={e => handleFormChange('resistance', e.target.value, 'number')} />}
                    {'fear' in person && <InputField label="Sợ hãi" id="person-fear" type="number" value={(person as Slave).fear} onChange={e => handleFormChange('fear', e.target.value, 'number')} />}
                    {'trust' in person && <InputField label="Tin tưởng" id="person-trust" type="number" value={(person as Slave).trust} onChange={e => handleFormChange('trust', e.target.value, 'number')} />}
                 </div>
            ) : (
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
         case 'quest': {
            const quest = formData as Quest;
            title = `Chi Tiết Nhiệm Vụ: ${isEditing ? '' : quest.title}`;
            content = isEditing ? (
                <div className="space-y-4">
                    <InputField label="Tiêu đề" id="quest-title" value={quest.title} onChange={e => handleFormChange('title', e.target.value)} />
                    <InputField label="Mô tả" id="quest-description" value={quest.description} onChange={e => handleFormChange('description', e.target.value)} textarea />
                    <InputField label="Trạng thái" id="quest-status" type="select" options={['active', 'completed', 'failed']} value={quest.status} onChange={e => handleFormChange('status', e.target.value)} />
                    <fieldset className="border border-gray-700 p-3 rounded-md">
                        <legend className="text-md font-semibold text-gray-300 px-1">Mục tiêu</legend>
                        <div className="space-y-2 mt-2">
                        {quest.objectives.map((obj, index) => (
                            <div key={obj.id} className="flex items-center gap-2">
                                <input type="checkbox" checked={obj.completed} onChange={e => handleObjectiveChange(index, 'completed', e.target.checked)} className="h-5 w-5 rounded text-indigo-500 bg-gray-600 border-gray-500 focus:ring-indigo-400 mt-5" />
                                <InputField label="" id={`obj-text-${index}`} value={obj.text} onChange={e => handleObjectiveChange(index, 'text', e.target.value)} className="flex-grow !mb-0" />
                            </div>
                        ))}
                        </div>
                    </fieldset>
                </div>
            ) : (
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
         case 'faction': {
            const faction = formData as Faction;
            title = `Chi Tiết Phe Phái: ${isEditing ? '' : faction.name}`;
            content = isEditing ? (
                <div className="space-y-4">
                    <InputField label="Tên" id="faction-name" value={faction.name} onChange={e => handleFormChange('name', e.target.value)} />
                    <InputField label="Mô tả" id="faction-desc" value={faction.description} onChange={e => handleFormChange('description', e.target.value)} textarea />
                    <InputField label="Chính/Tà" id="faction-align" type="select" options={[...ALL_FACTION_ALIGNMENTS]} value={faction.alignment} onChange={e => handleFormChange('alignment', e.target.value)} />
                    <InputField label="Uy tín người chơi" id="faction-rep" type="number" value={faction.playerReputation} onChange={e => handleFormChange('playerReputation', e.target.value, 'number')} />
                </div>
            ) : <FactionDetails faction={faction} knowledgeBase={knowledgeBase} />;
            break;
        }
        // Fallback for other types
        default: {
            title = `Chi Tiết: ${(entity as any).name || (entity as any).title}`;
            content = <p className="italic text-gray-400">Chức năng xem/sửa chi tiết cho loại thực thể này chưa được hỗ trợ đầy đủ.</p>;
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
