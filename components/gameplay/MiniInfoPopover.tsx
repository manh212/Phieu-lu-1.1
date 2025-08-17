
import React, { useEffect, useRef, useState } from 'react';
import { Item, Skill, Quest, NPC, GameLocation, WorldLoreEntry, Faction, KnowledgeBase, Companion, YeuThu, Wife, Slave, Prisoner } from '../../types';
import type { GameEntity, GameEntityType } from '../../hooks/types';
import * as GameTemplates from '../../templates'; 
import { VIETNAMESE } from '../../constants';

interface MiniInfoPopoverProps {
  isOpen: boolean;
  targetRect: DOMRect | null;
  entity: GameEntity | null;
  entityType: GameEntityType | null;
  onClose: () => void;
  knowledgeBase: KnowledgeBase; // Pass full KB for context like faction names
}

const MiniInfoPopover: React.FC<MiniInfoPopoverProps> = ({ isOpen, targetRect, entity, entityType, onClose, knowledgeBase }) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && targetRect && popoverRef.current) {
      const popoverElement = popoverRef.current;
      let top = targetRect.bottom + 5; 
      let left = targetRect.left;

      if (left + popoverElement.offsetWidth > window.innerWidth - 10) {
        left = window.innerWidth - popoverElement.offsetWidth - 10;
      }
      if (left < 10) {
        left = 10;
      }
      if (top + popoverElement.offsetHeight > window.innerHeight - 10) {
        top = targetRect.top - popoverElement.offsetHeight - 5; 
      }
       if (top < 10) {
        top = 10;
      }
      setPosition({ top, left });
    }
  }, [isOpen, targetRect]);

  if (!isOpen || !entity || !entityType) return null;

  const renderContent = () => {
    switch (entityType) {
      case 'item':
        const item = entity as Item;
        let itemDetails = "";
        if (item.category === GameTemplates.ItemCategory.EQUIPMENT) {
            const equip = item as GameTemplates.EquipmentTemplate;
            itemDetails = `${equip.equipmentType}, ${equip.rarity}. Slot: ${equip.slot || 'N/A'}`;
            const bonuses = Object.entries(equip.statBonuses).filter(([_, val]) => val !== 0 && val !== undefined);
            if (bonuses.length > 0) {
                itemDetails += `. Bonus: ${bonuses.map(([key, val]) => `${key.replace(/([A-Z])/g, ' $1').trim()}: ${val}`).join(', ').substring(0,50)}...`;
            }
        } else if (item.category === GameTemplates.ItemCategory.POTION) {
            const potion = item as GameTemplates.PotionTemplate;
            itemDetails = `${potion.potionType}, ${potion.rarity}. Effects: ${potion.effects.join(', ').substring(0,50)}...`;
        } else {
            itemDetails = `${item.category}, ${item.rarity}. Số lượng: ${item.quantity}`;
        }
        return (
          <>
            <p><strong className="text-indigo-300">Thông tin:</strong> {itemDetails}</p>
            {item.description && <p className="text-xs mt-1 italic text-gray-400">{item.description.substring(0, 100)}{item.description.length > 100 ? '...' : ''}</p>}
          </>
        );
      case 'skill':
        const skill = entity as Skill;
        return (
          <>
            <p><strong className="text-indigo-300">Loại:</strong> {skill.skillType}</p>
            <p><strong className="text-indigo-300">Mana:</strong> {skill.manaCost || 0}. <strong className="text-indigo-300">Hồi chiêu:</strong> {skill.cooldown || 0} lượt.</p>
            {skill.detailedEffect && <p className="text-xs mt-1 italic text-gray-400">{skill.detailedEffect.substring(0,100)}{skill.detailedEffect.length > 100 ? '...' : ''}</p>}
          </>
        );
      case 'quest':
        const quest = entity as Quest;
        const activeObjective = quest.objectives.find(obj => !obj.completed);
        return (
          <>
            <p><strong className="text-indigo-300">Trạng thái:</strong>
              {quest.status === 'active' ? 'Đang làm' :
               quest.status === 'completed' ? <span className="text-green-400 font-semibold">Hoàn thành</span> :
               <span className="text-red-400 font-semibold">Thất bại</span>
              }
            </p>
            {activeObjective && <p className="text-xs mt-1"><strong className="text-yellow-300">Mục tiêu kế tiếp:</strong> {activeObjective.text.substring(0,70)}...</p>}
            {!activeObjective && quest.status === 'active' && <p className="text-xs mt-1 text-gray-400">Tất cả mục tiêu hiện tại đã hoàn thành!</p>}
          </>
        );
      case 'npc':
        const npc = entity as NPC;
        const factionName = npc.factionId ? (knowledgeBase.discoveredFactions.find(f => f.id === npc.factionId)?.name || npc.factionId) : 'Không rõ';
        const isRealmUnknown = npc.realm === "Không rõ";
        return (
          <>
            {npc.title && <p><strong className="text-indigo-300">Chức danh:</strong> {npc.title}</p>}
            {npc.gender && npc.gender !== "Không rõ" && <p><strong className="text-indigo-300">Giới tính:</strong> {npc.gender}</p>}
            {npc.race && <p><strong className="text-indigo-300">Chủng tộc:</strong> {npc.race}</p>}
            <p><strong className="text-indigo-300">Cảnh giới:</strong> {npc.realm || "Không rõ"}</p>
            <p><strong className="text-indigo-300">Mối quan hệ:</strong> {npc.relationshipToPlayer || "Chưa rõ"}</p>
            <p><strong className="text-indigo-300">Thiện cảm:</strong> {npc.affinity}. <strong className="text-indigo-300">Phe:</strong> {factionName}</p>
            {isRealmUnknown ? (
              <p><strong className="text-indigo-300">Sinh Lực:</strong> Không rõ</p>
            ) : (
              npc.stats?.sinhLuc !== undefined && npc.stats?.maxSinhLuc !== undefined && 
                <p><strong className="text-indigo-300">Sinh Lực:</strong> {npc.stats.sinhLuc} / {npc.stats.maxSinhLuc}</p>
            )}
            {npc.description && <p className="text-xs mt-1 italic text-gray-400">{npc.description.substring(0,100)}{npc.description.length > 100 ? '...' : ''}</p>}
          </>
        );
      case 'wife':
      case 'slave':
      case 'prisoner':
        const person = entity as Wife | Slave | Prisoner;
        const personType = person.entityType === 'wife' ? 'Đạo Lữ' : person.entityType === 'slave' ? 'Nô Lệ' : 'Tù Nhân';
        return (
          <>
            <p><strong className="text-indigo-300">Thân phận:</strong> {personType}</p>
            {person.title && <p><strong className="text-indigo-300">Chức danh:</strong> {person.title}</p>}
            <p><strong className="text-indigo-300">Cảnh giới:</strong> {person.realm || "Không rõ"}</p>
            <p><strong className="text-indigo-300">Thiện cảm:</strong> {person.affinity}</p>
            {'willpower' in person && <p><strong className="text-indigo-300">Ý chí:</strong> {person.willpower}</p>}
            {'obedience' in person && <p><strong className="text-indigo-300">Phục tùng:</strong> {person.obedience}</p>}
            {'resistance' in person && <p><strong className="text-indigo-300">Phản kháng:</strong> {person.resistance}</p>}
            {person.description && <p className="text-xs mt-1 italic text-gray-400">{person.description.substring(0,100)}{person.description.length > 100 ? '...' : ''}</p>}
          </>
        );
      case 'companion':
        const companion = entity as Companion;
        return (
            <>
                <p><strong className="text-indigo-300">HP:</strong> {companion.hp} / {companion.maxHp}</p>
                <p><strong className="text-indigo-300">ATK:</strong> {companion.atk}</p>
                {companion.description && <p className="text-xs mt-1 italic text-gray-400">{companion.description.substring(0,100)}{companion.description.length > 100 ? '...' : ''}</p>}
            </>
        );
      case 'yeuThu':
        const yeuThu = entity as YeuThu;
        return (
          <>
            <p><strong className="text-indigo-300">Loài:</strong> {yeuThu.species}</p>
            {yeuThu.realm && <p><strong className="text-indigo-300">Cảnh giới:</strong> {yeuThu.realm}</p>}
            <p><strong className="text-indigo-300">Thái độ:</strong> {yeuThu.isHostile ? <span className="text-red-400">Thù địch</span> : <span className="text-green-400">Trung lập</span>}</p>
            {yeuThu.description && <p className="text-xs mt-1 italic text-gray-400">{yeuThu.description.substring(0,100)}{yeuThu.description.length > 100 ? '...' : ''}</p>}
          </>
        );
      case 'location':
        const location = entity as GameLocation;
        const regionName = location.regionId ? (knowledgeBase.discoveredRegions.find(r => r.id === location.regionId)?.name || location.regionId) : undefined;
        return (
          <>
            {location.locationType && <p><strong className="text-indigo-300">Loại:</strong> {location.locationType}</p>}
            {(location.mapX !== undefined && location.mapY !== undefined) && <p><strong className="text-indigo-300">Tọa độ:</strong> ({location.mapX}-{location.mapY})</p>}
            {regionName && <p><strong className="text-indigo-300">Vùng:</strong> {regionName}</p>}
            <p><strong className="text-indigo-300">An toàn:</strong> {location.isSafeZone ? "Có" : "Không"}</p>
            <p><strong className="text-indigo-300">{VIETNAMESE.locationStatusLabel}:</strong> <span className={location.visited ? 'text-green-400' : 'text-gray-400'}>{location.visited ? VIETNAMESE.locationStatusVisited : VIETNAMESE.locationStatusUnvisited}</span></p>
            {location.description && <p className="text-xs mt-1 italic text-gray-400">{location.description.substring(0,150)}{location.description.length > 150 ? '...' : ''}</p>}
          </>
        );
      case 'lore':
        const lore = entity as WorldLoreEntry;
        return (
          <>
            {lore.content && <p className="text-xs mt-1 italic text-gray-400">{lore.content.substring(0,150)}{lore.content.length > 150 ? '...' : ''}</p>}
          </>
        );
      case 'faction':
        const faction = entity as Faction;
        return (
          <>
            <p><strong className="text-indigo-300">Chính tà:</strong> {faction.alignment}</p>
            <p><strong className="text-indigo-300">Uy tín người chơi:</strong> {faction.playerReputation}</p>
            {faction.description && <p className="text-xs mt-1 italic text-gray-400">{faction.description.substring(0,100)}{faction.description.length > 100 ? '...' : ''}</p>}
          </>
        );
      default:
        return <p>Không có thông tin chi tiết.</p>;
    }
  };

  const getEntityTitle = (e: GameEntity): string => {
    if ('name' in e && e.name) return e.name;
    if ('title' in e && e.title) return e.title;
    return "Chi Tiết";
  };
  
  const title = getEntityTitle(entity);

  return (
    <div
      ref={popoverRef}
      className="fixed z-70 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-3 text-sm text-gray-100 max-w-xs transition-opacity duration-150"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      role="tooltip"
      aria-live="polite"
    >
      <h4 className="font-semibold text-indigo-400 mb-1 pb-1 border-b border-gray-700">{title}</h4>
      <div className="space-y-0.5 text-xs">
        {renderContent()}
      </div>
    </div>
  );
};

export default MiniInfoPopover;
