import React, { useMemo, useState } from 'react';
import { KnowledgeBase, Item, Skill } from '@/types/index'; 
import { PlayerStatsWithEquipment } from './equipment/PlayerStatsWithEquipment'; 
import InventoryPanel from './InventoryPanel';
import * as GameTemplates from '@/types/index';
import MasterPanel from './MasterPanel';
import { useGame } from '@/hooks/useGame';
import Button from '../ui/Button';

interface CharacterSidePanelProps {
  knowledgeBase: KnowledgeBase;
  onItemClick: (item: Item) => void;
  onSkillClick: (skill: Skill) => void;
  onPlayerAvatarUploadRequest: (base64Data: string) => void;
  isUploadingPlayerAvatar: boolean;
}

const SkillList: React.FC<{ title: string; skills: Skill[]; onSkillClick: (skill: Skill) => void; onSkillEditClick: (skill: Skill) => void; }> = React.memo(({ title, skills, onSkillClick, onSkillEditClick }) => {
    if (skills.length === 0) return null;
    return (
        <div className="bg-gray-800 p-3 sm:p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-indigo-400 mb-3 border-b border-gray-700 pb-2">{title}</h3>
            <ul className="space-y-1 max-h-48 sm:max-h-60 overflow-y-auto custom-scrollbar">
                {skills.map(skill => (
                    <li
                        key={skill.id}
                        className="text-sm text-gray-300 hover:bg-gray-700 p-2 rounded transition-colors flex justify-between items-center group"
                    >
                        <div
                            className="flex-grow cursor-pointer"
                            onClick={() => onSkillClick(skill)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && onSkillClick(skill)}
                            aria-label={`Details for ${skill.name}`}
                            title={skill.name}
                        >
                            <span className="truncate block">
                                <strong className="text-indigo-300">{skill.name}</strong>
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="!p-1.5 ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSkillEditClick(skill);
                            }}
                            title={`Chỉnh sửa ${skill.name}`}
                            aria-label={`Chỉnh sửa ${skill.name}`}
                        >
                            ✏️
                        </Button>
                    </li>
                ))}
            </ul>
        </div>
    );
});

type CharacterTab = 'info' | 'inventory' | 'skills';

const CharacterSidePanel: React.FC<CharacterSidePanelProps> = React.memo(({
  knowledgeBase,
  onItemClick,
  onSkillClick,
  onPlayerAvatarUploadRequest,
  isUploadingPlayerAvatar,
}) => {
  const { openEntityModal } = useGame();
  const [activeTab, setActiveTab] = useState<CharacterTab>('info');
  const currentLocation = knowledgeBase.discoveredLocations.find(l => l.id === knowledgeBase.currentLocationId);
  const isPlayerRestricted = !!knowledgeBase.playerStats.playerSpecialStatus;
  const master = knowledgeBase.master;
  
  const allEquippedItemIds = useMemo(() => {
    const ids = new Set<string>();
    // Player's equipment
// FIX: Argument of type 'unknown' is not assignable to parameter of type 'string'.
// This is likely a TypeScript inference issue. Explicitly typing the 'id' parameter resolves it.
    Object.values(knowledgeBase.equippedItems).forEach((id: string | null) => { if (id) ids.add(id); });
    // All companions' equipment
// FIX: Argument of type 'unknown' is not assignable to parameter of type 'string'.
// This is likely a TypeScript inference issue. Explicitly typing the 'id' parameter resolves it.
    knowledgeBase.wives.forEach(c => Object.values(c.equippedItems).forEach((id: string | null) => { if (id) ids.add(id); }));
// FIX: Argument of type 'unknown' is not assignable to parameter of type 'string'.
// This is likely a TypeScript inference issue. Explicitly typing the 'id' parameter resolves it.
    knowledgeBase.slaves.forEach(c => Object.values(c.equippedItems).forEach((id: string | null) => { if (id) ids.add(id); }));
    return ids;
  }, [knowledgeBase.equippedItems, knowledgeBase.wives, knowledgeBase.slaves]);

  const displayableInventory = useMemo(() => {
      // Show only items that are not equipped by anyone
      return knowledgeBase.inventory.filter(item => !allEquippedItemIds.has(item.id));
  }, [knowledgeBase.inventory, allEquippedItemIds]);

  // FIX: Filtered skills by their specific type using enum values for type safety.
  const congPhapSkills = knowledgeBase.playerSkills.filter(s => s.skillType === GameTemplates.SkillType.CONG_PHAP_TU_LUYEN);
  const linhKiSkills = knowledgeBase.playerSkills.filter(s => s.skillType === GameTemplates.SkillType.LINH_KI);
  const ngheNghiepSkills = knowledgeBase.playerSkills.filter(s => s.skillType === GameTemplates.SkillType.NGHE_NGHIEP);
  const thanThongSkills = knowledgeBase.playerSkills.filter(s => s.skillType === GameTemplates.SkillType.THAN_THONG);
  const camThuatSkills = knowledgeBase.playerSkills.filter(s => s.skillType === GameTemplates.SkillType.CAM_THUAT);
  // FIX: Rewrote the filter for `otherSkills` to be more robust. Using an array with `includes`
  // avoids a potential type inference issue with Set.has() in some TypeScript configurations.
  const specificSkillTypes: readonly GameTemplates.SkillTypeValues[] = [
    GameTemplates.SkillType.CONG_PHAP_TU_LUYEN,
    GameTemplates.SkillType.LINH_KI,
    GameTemplates.SkillType.NGHE_NGHIEP,
    GameTemplates.SkillType.THAN_THONG,
    GameTemplates.SkillType.CAM_THUAT,
  ];
  const otherSkills = knowledgeBase.playerSkills.filter(s => 
    !specificSkillTypes.includes(s.skillType)
  );

  const activeTabStyle = "whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm border-indigo-500 text-indigo-400";
  const inactiveTabStyle = "whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500";

  return (
    <div className="flex flex-col h-full"> 
      {isPlayerRestricted && master && <MasterPanel master={master} />}
      
      <div className="border-b border-gray-700 flex-shrink-0">
        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
          <button onClick={() => setActiveTab('info')} className={activeTab === 'info' ? activeTabStyle : inactiveTabStyle}>
            Thông Tin
          </button>
          <button onClick={() => setActiveTab('inventory')} className={activeTab === 'inventory' ? activeTabStyle : inactiveTabStyle}>
            Túi Đồ
          </button>
          <button onClick={() => setActiveTab('skills')} className={activeTab === 'skills' ? activeTabStyle : inactiveTabStyle}>
            Kỹ Năng
          </button>
        </nav>
      </div>
      
      <div className="flex-grow overflow-y-auto custom-scrollbar pt-4 space-y-4">
        {activeTab === 'info' && (
          <div>
            {knowledgeBase.playerStats && (
              <PlayerStatsWithEquipment 
                personId={'player'}
                playerStats={knowledgeBase.playerStats}
                equippedItems={knowledgeBase.equippedItems}
                inventory={knowledgeBase.inventory}
                currencyName={knowledgeBase.worldConfig?.currencyName}
                playerName={knowledgeBase.worldConfig?.playerName}
                playerGender={knowledgeBase.worldConfig?.playerGender}
                playerRace={knowledgeBase.worldConfig?.playerRace}
                playerAvatarUrl={knowledgeBase.worldConfig?.playerAvatarUrl} 
                playerAvatarData={knowledgeBase.playerAvatarData} 
                worldConfig={knowledgeBase.worldConfig} 
                worldDate={knowledgeBase.worldDate}
                isPlayerContext={true}
                onPlayerAvatarUploadRequest={onPlayerAvatarUploadRequest}
                isUploadingPlayerAvatar={isUploadingPlayerAvatar}
                currentLocationName={currentLocation?.name}
              />
            )}
          </div>
        )}

        {activeTab === 'inventory' && (
          <div>
            <InventoryPanel items={displayableInventory} onItemClick={onItemClick} onItemEditClick={(item) => openEntityModal('item', item, true)} />
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="space-y-4">
            <SkillList title="Công Pháp Tu Luyện" skills={congPhapSkills} onSkillClick={onSkillClick} onSkillEditClick={(skill) => openEntityModal('skill', skill, true)} />
            <SkillList title="Linh Kĩ" skills={linhKiSkills} onSkillClick={onSkillClick} onSkillEditClick={(skill) => openEntityModal('skill', skill, true)} />
            <SkillList title="Thần Thông" skills={thanThongSkills} onSkillClick={onSkillClick} onSkillEditClick={(skill) => openEntityModal('skill', skill, true)} />
            <SkillList title="Cấm Thuật" skills={camThuatSkills} onSkillClick={onSkillClick} onSkillEditClick={(skill) => openEntityModal('skill', skill, true)} />
            <SkillList title="Kỹ Năng Nghề Nghiệp" skills={ngheNghiepSkills} onSkillClick={onSkillClick} onSkillEditClick={(skill) => openEntityModal('skill', skill, true)} />
            <SkillList title="Kỹ Năng Khác" skills={otherSkills} onSkillClick={onSkillClick} onSkillEditClick={(skill) => openEntityModal('skill', skill, true)} />
          </div>
        )}
      </div>
    </div>
  );
});

export default CharacterSidePanel;