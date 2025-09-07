
import React, { useState, ChangeEvent, useRef } from 'react'; 
import { PlayerStats, Item, EquipmentSlotId, KnowledgeBase, StatusEffect, WorldDate, TuChatTier } from '@/types/index';
import { VIETNAMESE, FEMALE_AVATAR_BASE_URL, MAX_FEMALE_AVATAR_INDEX, MALE_AVATAR_PLACEHOLDER_URL } from '@/constants';
import * as GameTemplates from '@/types/index';
import Modal from '@/components/ui/Modal'; 
import Button from '@/components/ui/Button'; 
import InputField from '@/components/ui/InputField'; // Added InputField
import Spinner from '@/components/ui/Spinner'; // Added Spinner
import { isValidImageUrl } from '@/utils/imageValidationUtils'; // Added image validation
import { getDeterministicAvatarSrc } from '@/utils/avatarUtils';

interface PlayerStatsWithEquipmentProps {
  playerStats: PlayerStats; 
  equippedItems: Record<EquipmentSlotId, Item['id'] | null>;
  inventory: Item[]; 
  currencyName?: string;
  playerName?: string;
  playerGender?: string;
  playerRace?: string;
  playerAvatarUrl?: string; 
  playerAvatarData?: string; 
  worldConfig?: KnowledgeBase['worldConfig'];
  worldDate?: WorldDate;
  isPlayerContext?: boolean; 
  onPlayerAvatarUploadRequest?: (base64DataOrUrl: string) => void; 
  isUploadingPlayerAvatar?: boolean; 
  currentLocationName?: string;
  tuChat?: TuChatTier;
  personId: string;
}

export const PlayerStatsWithEquipment: React.FC<PlayerStatsWithEquipmentProps> = React.memo(({
  playerStats,
  equippedItems,
  inventory,
  currencyName,
  playerName,
  playerGender,
  playerRace,
  playerAvatarUrl, 
  playerAvatarData, 
  worldConfig,
  worldDate,
  isPlayerContext,
  onPlayerAvatarUploadRequest,
  isUploadingPlayerAvatar,
  currentLocationName,
  tuChat,
  personId,
}) => {
  const [selectedStatusEffect, setSelectedStatusEffect] = useState<StatusEffect | null>(null);
  const isCultivationEnabled = worldConfig?.isCultivationEnabled !== undefined ? worldConfig.isCultivationEnabled : true;
  const playerAvatarFileInputRef = useRef<HTMLInputElement>(null);

  // New state for player avatar URL input in gameplay
  const [showPlayerAvatarUrlInput, setShowPlayerAvatarUrlInput] = useState(false);
  const [playerAvatarUrlInputValue, setPlayerAvatarUrlInputValue] = useState('');
  const [isPlayerAvatarUrlValidating, setIsPlayerAvatarUrlValidating] = useState(false);
  const [playerAvatarUrlError, setPlayerAvatarUrlError] = useState<string | null>(null);
  
  const tuChatToDisplay = tuChat || playerStats.tuChat;

  const getBonusFromEquipment = (statKey: keyof PlayerStats): number => {
    let totalBonus = 0;
    for (const slotId in equippedItems) {
      const itemId = equippedItems[slotId as EquipmentSlotId];
      if (itemId) {
        const item = inventory.find(i => i.id === itemId);
        if (item && item.category === GameTemplates.ItemCategory.EQUIPMENT) {
          const equipment = item as GameTemplates.EquipmentTemplate;
          const bonusValue = equipment.statBonuses?.[statKey as keyof typeof equipment.statBonuses];
          if (typeof bonusValue === 'number') {
            totalBonus += bonusValue;
          }
        }
      }
    }
    return totalBonus;
  };
  
  const getBonusFromStatusEffects = (statKey: keyof PlayerStats, baseValue: number, equipBonus: number): number => {
      const basePlusEquip = baseValue + equipBonus;
      let finalValue = basePlusEquip;
      
      (playerStats.activeStatusEffects || []).forEach(effect => {
          const modValue = effect.statModifiers[statKey as keyof typeof effect.statModifiers];
          if (typeof modValue === 'string') {
              if (modValue.endsWith('%')) {
                  const percentage = parseFloat(modValue.slice(0, -1)) / 100;
                  if (!isNaN(percentage)) finalValue *= (1 + percentage);
              } else {
                  const flat = parseInt(modValue, 10);
                  if (!isNaN(flat)) finalValue += flat;
              }
          } else if (typeof modValue === 'number') {
              finalValue += modValue;
          }
      });
      
      return finalValue - basePlusEquip;
  };


  const renderStatLineWithBreakdown = (
    label: string, 
    statKey: keyof PlayerStats,
    baseStatKey: keyof PlayerStats,
    currentValueForDisplay?: number,
    isPercentage: boolean = false,
    isMultiplier: boolean = false
    ) => {
    
    const baseVal = (playerStats[baseStatKey] as number) ?? 0;
    const effectiveVal = (playerStats[statKey] as number) ?? 0;
    const equipBonus = getBonusFromEquipment(statKey);
    const effectsBonus = getBonusFromStatusEffects(statKey, baseVal, equipBonus);

    const total = baseVal + equipBonus + effectsBonus;
    
    const displayValue = currentValueForDisplay !== undefined 
        ? `${currentValueForDisplay}/${total.toFixed(isMultiplier ? 2 : 0)}` 
        : `${total.toFixed(isMultiplier ? 2 : 0)}`;

    const formatBonus = (val: number) => {
        if (Math.abs(val) < 0.01 && isMultiplier) return ''; // Don't show tiny multiplier changes
        if (val === 0) return '';
        const rounded = Number(val.toFixed(isMultiplier ? 2 : 0));
        return rounded > 0 ? ` + ${rounded}` : ` - ${Math.abs(rounded)}`;
    };

    const equipColor = equipBonus > 0 ? 'text-green-400' : 'text-red-400';
    const effectColor = effectsBonus > 0 ? 'text-green-400' : (effectsBonus < 0 ? 'text-red-400' : '');

    return (
      <div className="text-sm py-0.5">
        <span className="font-semibold text-indigo-300">{label}: </span>
        <span className="text-gray-100">
          {displayValue}{isPercentage ? '%' : ''}
          <span className="ml-1 text-xs text-gray-400">
            ({baseVal.toFixed(isMultiplier ? 2 : 0)}
            {equipBonus !== 0 && <span className={equipColor}>{formatBonus(equipBonus)}</span>}
            {effectsBonus !== 0 && <span className={effectColor}>{formatBonus(effectsBonus)}</span>})
          </span>
        </span>
      </div>
    );
  };

  const realmLabel = isCultivationEnabled ? VIETNAMESE.realmLabel : "Trạng Thái/Cấp Độ";
  const energyLabel = isCultivationEnabled ? VIETNAMESE.linhLucLabel : "Năng Lượng/Thể Lực";
  const experienceLabel = isCultivationEnabled ? VIETNAMESE.kinhNghiemLabel : "Kinh Nghiệm (Chung)";

  const getStatusEffectTypeColor = (type: StatusEffect['type']) => {
    switch (type) {
      case 'buff': return 'text-green-400';
      case 'debuff': return 'text-red-400';
      case 'neutral': return 'text-gray-400';
      default: return 'text-gray-200';
    }
  };
  
  const formatStatModifiers = (modifiers: StatusEffect['statModifiers']) => {
    if (!modifiers || Object.keys(modifiers).length === 0) return "Không có.";
    return Object.entries(modifiers).map(([key, value]) => {
        let statName = key;
        if (key === 'maxSinhLuc') statName = "Sinh Lực Tối Đa";
        else if (key === 'maxLinhLuc') statName = "Linh Lực Tối Đa";
        else if (key === 'sucTanCong') statName = "Sức Tấn Công";
        return `${statName}: ${value}`;
    }).join('; ');
  };

  const handlePlayerAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onPlayerAvatarUploadRequest) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onPlayerAvatarUploadRequest(base64String);
        setShowPlayerAvatarUrlInput(false); 
        setPlayerAvatarUrlInputValue('');
        setPlayerAvatarUrlError(null);
      };
      reader.readAsDataURL(file);
      if (playerAvatarFileInputRef.current) { 
          playerAvatarFileInputRef.current.value = "";
      }
    }
  };

  const handlePlayerAvatarUrlSubmit = async () => {
    if (!playerAvatarUrlInputValue.trim() || !onPlayerAvatarUploadRequest) return;
    setIsPlayerAvatarUrlValidating(true);
    setPlayerAvatarUrlError(null);
    const isValid = await isValidImageUrl(playerAvatarUrlInputValue);
    setIsPlayerAvatarUrlValidating(false);
    if (isValid) {
      onPlayerAvatarUploadRequest(playerAvatarUrlInputValue);
      setShowPlayerAvatarUrlInput(false);
    } else {
      setPlayerAvatarUrlError(VIETNAMESE.avatarUrlInvalid);
    }
  };

  return (
    <>
    <div className="bg-gray-800 p-3 sm:p-4 rounded-lg shadow-md border border-gray-700">
      <div className="flex items-start mb-3 border-b border-gray-700 pb-2">
        <img 
            src={getDeterministicAvatarSrc({ id: personId, avatarUrl: playerAvatarData || playerAvatarUrl, gender: playerGender })}
            alt={VIETNAMESE.playerAvatarLabel} 
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-indigo-500 shadow-md mr-3 sm:mr-4"
        />
        <div className="flex-grow">
            <h3 className="text-lg font-semibold text-indigo-400">
            <span>{isPlayerContext ? VIETNAMESE.playerStatsSection : playerName}</span>
            {isCultivationEnabled && playerStats.hieuUngBinhCanh && (
                <span className="block text-xs font-bold text-red-400 bg-red-900/50 px-2 py-0.5 rounded-full border border-red-600 animate-pulse mt-1">
                {VIETNAMESE.bottleneckEffectLabel}
                </span>
            )}
            </h3>
            {isPlayerContext && (
              <div className="mt-1 space-y-1">
                <div className="flex flex-wrap gap-1">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => playerAvatarFileInputRef.current?.click()}
                        className="text-xs !py-1 !px-2 border-indigo-500 hover:bg-indigo-700/50 flex-grow sm:flex-grow-0"
                        isLoading={isUploadingPlayerAvatar && !showPlayerAvatarUrlInput}
                        loadingText={VIETNAMESE.uploadingAvatarMessage}
                        disabled={isUploadingPlayerAvatar}
                        title={VIETNAMESE.uploadAvatarButtonLabel}
                    >
                     {VIETNAMESE.uploadAvatarButtonLabel}
                    </Button>
                    <input
                        type="file"
                        ref={playerAvatarFileInputRef}
                        onChange={handlePlayerAvatarFileChange}
                        accept="image/png, image/jpeg, image/webp, image/gif"
                        className="hidden"
                        id="player-avatar-upload-input"
                        disabled={isUploadingPlayerAvatar}
                    />
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                            setShowPlayerAvatarUrlInput(!showPlayerAvatarUrlInput);
                            if (!showPlayerAvatarUrlInput) {
                                if (playerAvatarData && playerAvatarData.startsWith('http')) {
                                    setPlayerAvatarUrlInputValue(playerAvatarData);
                                } else if (playerAvatarUrl && playerAvatarUrl.startsWith('http')) {
                                     setPlayerAvatarUrlInputValue(playerAvatarUrl);
                                } else {
                                    setPlayerAvatarUrlInputValue('');
                                }
                            }
                            setPlayerAvatarUrlError(null);
                        }}
                        className="text-xs !py-1 !px-2 border-cyan-500 hover:bg-cyan-700/50 flex-grow sm:flex-grow-0"
                        disabled={isUploadingPlayerAvatar}
                        aria-expanded={showPlayerAvatarUrlInput}
                        title={VIETNAMESE.avatarUrlInputLabel}
                    >
                        {showPlayerAvatarUrlInput ? "Đóng URL" : VIETNAMESE.avatarUrlInputLabel.replace(":", "")}
                    </Button>
                </div>
                 {showPlayerAvatarUrlInput && (
                    <div className="mt-1.5 p-2 border border-gray-600 rounded-md bg-gray-800/30">
                        <InputField
                            label="" 
                            id="playerGameplayAvatarUrlInput"
                            value={playerAvatarUrlInputValue}
                            onChange={(e) => setPlayerAvatarUrlInputValue(e.target.value)}
                            placeholder={VIETNAMESE.avatarUrlInputPlaceholder}
                            disabled={isPlayerAvatarUrlValidating || isUploadingPlayerAvatar}
                            className="!mb-1.5"
                        />
                        <Button
                            type="button"
                            variant="primary"
                            onClick={handlePlayerAvatarUrlSubmit}
                            className="w-full text-xs !py-1"
                            isLoading={isPlayerAvatarUrlValidating}
                            disabled={isPlayerAvatarUrlValidating || isUploadingPlayerAvatar || !playerAvatarUrlInputValue.trim()}
                            loadingText={VIETNAMESE.avatarUrlValidating}
                        >
                            {VIETNAMESE.confirmUrlButton}
                        </Button>
                        {playerAvatarUrlError && <p className="text-xs text-red-400 mt-1">{playerAvatarUrlError}</p>}
                    </div>
                )}
              </div>
            )}
        </div>
      </div>
      
      <section aria-labelledby="thong-tin-co-ban">
        <h4 id="thong-tin-co-ban" className="text-md font-semibold text-indigo-200 mt-3 mb-2 border-b border-gray-700 pb-1">Thông Tin Cơ Bản</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-0.5">
            {playerName && !isPlayerContext && <div className="text-sm py-0.5"><span className="font-semibold text-indigo-300">{VIETNAMESE.characterName}: </span>{playerName}</div>}
            {isPlayerContext && <div className="text-sm py-0.5"><span className="font-semibold text-indigo-300">{VIETNAMESE.characterName}: </span>{playerName}</div>}
            {playerGender && <div className="text-sm py-0.5"><span className="font-semibold text-indigo-300">{VIETNAMESE.gender}: </span>{playerGender}</div>}
            {playerRace && <div className="text-sm py-0.5"><span className="font-semibold text-indigo-300">{VIETNAMESE.playerRaceLabel || "Chủng Tộc"}: </span>{playerRace}</div>}
            {isPlayerContext && currentLocationName && <div className="text-sm py-0.5 col-span-1 md:col-span-2"><span className="font-semibold text-indigo-300">{VIETNAMESE.legendCurrentLocation}: </span>{currentLocationName}</div>}
            {isPlayerContext && worldDate && (
                <div className="text-sm py-0.5 col-span-1 md:col-span-2">
                    <span className="font-semibold text-indigo-300">Thời Gian: </span>
                    <span className="text-gray-300">
                        {`Ngày ${worldDate.day}, Tháng ${worldDate.month}, Năm ${worldDate.year} - ${String(worldDate.hour).padStart(2, '0')}:${String(worldDate.minute).padStart(2, '0')}`}
                    </span>
                </div>
            )}
        </div>
      </section>
      
      <section aria-labelledby="thong-tin-tu-luyen">
        <h4 id="thong-tin-tu-luyen" className="text-md font-semibold text-indigo-200 mt-3 mb-2 border-b border-gray-700 pb-1">Thông Tin Tu Luyện</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-0.5">
            <div className="text-sm py-0.5 col-span-1 md:col-span-2"><span className="font-semibold text-indigo-300">{VIETNAMESE.spiritualRootLabel || 'Linh Căn'}: </span>{playerStats.spiritualRoot ?? 'Không rõ'}</div>
            <div className="text-sm py-0.5 col-span-1 md:col-span-2"><span className="font-semibold text-indigo-300">{VIETNAMESE.specialPhysiqueLabel || 'Thể Chất'}: </span>{playerStats.specialPhysique ?? 'Không rõ'}</div>
            {tuChatToDisplay && <div className="text-sm py-0.5 col-span-1 md:col-span-2"><span className="font-semibold text-indigo-300">Tư Chất: </span>{tuChatToDisplay}</div>}
            {isCultivationEnabled && 
            <div className="text-sm py-0.5 col-span-1 md:col-span-2">
                <span className="font-semibold text-indigo-300">Thọ Nguyên: </span>
                <span className="text-lime-300 font-semibold">{Math.floor(playerStats.thoNguyen ?? 0)} / {playerStats.maxThoNguyen ?? 0} (năm)</span>
            </div>
            }
            <div className="text-sm py-0.5 col-span-1 md:col-span-2">
                <span className="font-semibold text-indigo-300">{realmLabel}: </span>
                <span className="text-amber-400 font-semibold">{playerStats.realm ?? 'Không rõ'}</span>
            </div>
        </div>
      </section>

      <section aria-labelledby="chi-so-chien-dau">
        <h4 id="chi-so-chien-dau" className="text-md font-semibold text-indigo-200 mt-3 mb-2 border-b border-gray-700 pb-1">Chỉ Số Chiến Đấu</h4>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-0.5">
            {renderStatLineWithBreakdown(VIETNAMESE.sinhLucLabel, 'maxSinhLuc', 'baseMaxSinhLuc', playerStats.sinhLuc)}
            {(isCultivationEnabled || (playerStats.maxLinhLuc ?? 0) > 0 || (playerStats.baseMaxLinhLuc ?? 0) > 0) && renderStatLineWithBreakdown(energyLabel, 'maxLinhLuc', 'baseMaxLinhLuc', playerStats.linhLuc)}
            {renderStatLineWithBreakdown(VIETNAMESE.sucTanCongLabel, 'sucTanCong', 'baseSucTanCong')}
            {renderStatLineWithBreakdown("Phòng Thủ", 'phongThu', 'basePhongThu')}
            {renderStatLineWithBreakdown("Tốc Độ", 'tocDo', 'baseTocDo')}
            {renderStatLineWithBreakdown("Chính Xác", 'chinhXac', 'baseChinhXac')}
            {renderStatLineWithBreakdown("Né Tránh", 'neTranh', 'baseNeTranh')}
            {renderStatLineWithBreakdown("Tỉ Lệ Chí Mạng", 'tiLeChiMang', 'baseTiLeChiMang', undefined, true)}
            {renderStatLineWithBreakdown("Sát Thương Chí Mạng", 'satThuongChiMang', 'baseSatThuongChiMang', undefined, false, true)}
            {isCultivationEnabled && renderStatLineWithBreakdown(experienceLabel, 'maxKinhNghiem', 'baseMaxKinhNghiem', playerStats.kinhNghiem)}
            {isPlayerContext && <div className="text-sm py-0.5"><span className="font-semibold text-indigo-300">{currencyName || "Tiền Tệ"}: </span>{playerStats.currency ?? 0}</div>}
            {isPlayerContext && <div className="text-sm py-0.5"><span className="font-semibold text-indigo-300">Lượt: </span>{playerStats.turn ?? 0}</div>}
        </div>
      </section>
      
      {playerStats.playerSpecialStatus && isPlayerContext && (
        <section aria-labelledby="than-phan-dac-biet" className="mt-3 pt-3 border-t-2 border-red-700/60">
            <h4 id="than-phan-dac-biet" className="text-md font-semibold text-red-300 mb-1.5">{VIETNAMESE.specialStatusSection}</h4>
            <div className="space-y-1 text-sm bg-red-900/20 p-2 rounded-md">
                <p>
                    <strong className="text-red-400">Trạng Thái: </strong> 
                    <span className="font-bold capitalize">{playerStats.playerSpecialStatus.type === 'prisoner' ? 'Tù Nhân' : 'Nô Lệ'}</span>
                </p>
                <p>
                    <strong className="text-red-400">Chủ Nhân: </strong> 
                    {playerStats.playerSpecialStatus.ownerName}
                </p>
                <div className="grid grid-cols-2 gap-x-2 pt-1">
                    <p><strong className="text-indigo-300">{VIETNAMESE.statWillpower}:</strong> {playerStats.playerSpecialStatus.willpower}</p>
                    <p><strong className="text-indigo-300">{VIETNAMESE.statObedience}:</strong> {playerStats.playerSpecialStatus.obedience}</p>
                    <p><strong className="text-indigo-300">{VIETNAMESE.statResistance}:</strong> {playerStats.playerSpecialStatus.resistance}</p>
                    <p><strong className="text-indigo-300">{VIETNAMESE.statFear}:</strong> {playerStats.playerSpecialStatus.fear ?? 0}</p>
                    <p><strong className="text-indigo-300">{VIETNAMESE.statTrust}:</strong> {playerStats.playerSpecialStatus.trust ?? 0}</p>
                </div>
            </div>
        </section>
      )}

      {(playerStats.activeStatusEffects ?? []).length > 0 && (
        <section aria-labelledby="hieu-ung-hien-tai" className="mt-3 pt-3 border-t border-gray-700">
            <h4 id="hieu-ung-hien-tai" className="text-md font-semibold text-indigo-200 mb-1.5">{VIETNAMESE.statusEffectsSection}</h4>
            <ul className="space-y-1 text-xs">
                {(playerStats.activeStatusEffects ?? []).map(effect => (
                    <li 
                        key={effect.id} 
                        className="p-1.5 bg-gray-700/50 rounded-md border border-gray-600/70 hover:bg-gray-600/70 cursor-pointer transition-colors" 
                        title={`Nhấn để xem chi tiết hiệu ứng ${effect.name}`}
                        onClick={() => setSelectedStatusEffect(effect)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedStatusEffect(effect)}
                    >
                        <div className="flex justify-between items-center">
                            <span className={`font-medium ${getStatusEffectTypeColor(effect.type)}`}>{effect.name}</span>
                            <span className="text-gray-400">
                                {effect.durationTurns > 0 ? VIETNAMESE.statusEffectDuration(effect.durationTurns) : (effect.durationTurns === 0 || effect.durationTurns === -1) ? VIETNAMESE.statusEffectPermanent : ''}
                            </span>
                        </div>
                        {effect.specialEffects && effect.specialEffects.length > 0 && (
                             <p className="text-gray-300 text-[11px] italic mt-0.5 pl-1 truncate">Ảnh hưởng: {effect.specialEffects.join('; ')}</p>
                        )}
                    </li>
                ))}
            </ul>
        </section>
      )}
    </div>

    {selectedStatusEffect && (
        <Modal
            isOpen={!!selectedStatusEffect}
            onClose={() => setSelectedStatusEffect(null)}
            title={`Chi Tiết Hiệu Ứng: ${selectedStatusEffect.name}`}
        >
            <div className="space-y-2 text-sm">
                <p><strong className="text-indigo-300">Tên:</strong> {selectedStatusEffect.name}</p>
                <p>
                    <strong className="text-indigo-300">Loại:</strong> 
                    <span className={`ml-1 font-semibold ${getStatusEffectTypeColor(selectedStatusEffect.type)}`}>
                        {selectedStatusEffect.type === 'buff' ? VIETNAMESE.statusEffectTypeBuff :
                         selectedStatusEffect.type === 'debuff' ? VIETNAMESE.statusEffectTypeDebuff :
                         VIETNAMESE.statusEffectTypeNeutral}
                    </span>
                </p>
                <p><strong className="text-indigo-300">Mô tả:</strong> {selectedStatusEffect.description}</p>
                <p>
                    <strong className="text-indigo-300">Thời gian:</strong> 
                    {selectedStatusEffect.durationTurns > 0 
                        ? VIETNAMESE.statusEffectDuration(selectedStatusEffect.durationTurns) 
                        : (selectedStatusEffect.durationTurns === 0 || selectedStatusEffect.durationTurns === -1) 
                            ? VIETNAMESE.statusEffectPermanent 
                            : 'Không rõ thời gian'}
                </p>
                {selectedStatusEffect.statModifiers && Object.keys(selectedStatusEffect.statModifiers).length > 0 && (
                    <p><strong className="text-indigo-300">Ảnh hưởng chỉ số:</strong> {formatStatModifiers(selectedStatusEffect.statModifiers)}</p>
                )}
                {selectedStatusEffect.specialEffects && selectedStatusEffect.specialEffects.length > 0 && (
                    <div>
                        <strong className="text-indigo-300">Hiệu ứng đặc biệt khác:</strong>
                        <ul className="list-disc list-inside pl-4 text-gray-300">
                            {selectedStatusEffect.specialEffects.map((eff, idx) => <li key={idx}>{eff}</li>)}
                        </ul>
                    </div>
                )}
                {selectedStatusEffect.source && <p className="text-xs text-gray-400 mt-3">Nguồn gốc: {selectedStatusEffect.source}</p>}
            </div>
        </Modal>
    )}
    </>
  );
});
