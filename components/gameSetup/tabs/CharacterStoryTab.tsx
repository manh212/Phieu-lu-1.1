import React, { ChangeEvent, useState, useEffect } from 'react';
import { useGameSetup } from '../../../contexts/GameSetupContext';
import { WorldSettings } from '../../../types/index';
import InputField from '../../ui/InputField';
import { VIETNAMESE } from '../../../constants';

interface CharacterStoryTabProps {
  playerUploadedAvatarData: string | null;
  setPlayerUploadedAvatarData: (data: string | null) => void;
}

const CharacterStoryTab: React.FC<CharacterStoryTabProps> = ({ playerUploadedAvatarData, setPlayerUploadedAvatarData }) => {
  const { state, dispatch } = useGameSetup();
  const { settings } = state;
  const [playerAvatarPreviewUrl, setPlayerAvatarPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (settings.playerAvatarUrl) {
      if (settings.playerAvatarUrl.startsWith('http') || settings.playerAvatarUrl.startsWith('data:')) {
        setPlayerAvatarPreviewUrl(settings.playerAvatarUrl);
      }
    } else {
      setPlayerAvatarPreviewUrl(null);
    }
  }, [settings.playerAvatarUrl]);
  
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const fieldParts = name.split('.');
    
    if (fieldParts.length > 1) {
        // Handle nested properties like startingDate.day
        const newSettings = JSON.parse(JSON.stringify(settings)); // Deep copy
        let currentLevel = newSettings;
        for (let i = 0; i < fieldParts.length - 1; i++) {
            currentLevel = currentLevel[fieldParts[i]];
        }
        currentLevel[fieldParts[fieldParts.length - 1]] = value;
        dispatch({ type: 'UPDATE_FIELD', payload: { field: fieldParts[0] as keyof WorldSettings, value: newSettings[fieldParts[0]] }});

    } else {
        dispatch({ type: 'UPDATE_FIELD', payload: { field: name as keyof WorldSettings, value }});
    }
  };

  const handleAvatarFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setPlayerUploadedAvatarData(base64String);
            setPlayerAvatarPreviewUrl(base64String);
        };
        reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <InputField label={VIETNAMESE.characterName} id="playerName" name="playerName" value={settings.playerName} onChange={handleChange} />
        <InputField label={VIETNAMESE.gender} id="playerGender" name="playerGender" type="select" options={['Nam', 'Nữ', 'Khác']} value={settings.playerGender} onChange={handleChange} />
        <InputField label={VIETNAMESE.playerRaceLabel} id="playerRace" name="playerRace" value={settings.playerRace} onChange={handleChange} placeholder="Nhân Tộc, Yêu Tộc..." />
        <InputField label={VIETNAMESE.personality} id="playerPersonality" name="playerPersonality" value={settings.playerPersonality} onChange={handleChange} textarea />
        <InputField label={VIETNAMESE.backstory} id="playerBackstory" name="playerBackstory" value={settings.playerBackstory} onChange={handleChange} textarea rows={3} />
        <InputField label={VIETNAMESE.goal} id="playerGoal" name="playerGoal" value={settings.playerGoal} onChange={handleChange} textarea rows={3} />
        <InputField label={VIETNAMESE.startingTraits} id="playerStartingTraits" name="playerStartingTraits" value={settings.playerStartingTraits} onChange={handleChange} textarea placeholder={VIETNAMESE.startingTraits} />
        <InputField label={VIETNAMESE.startingCurrencyLabel} id="startingCurrency" name="startingCurrency" type="number" value={settings.startingCurrency} onChange={handleChange} min={0} />
        
        {settings.isCultivationEnabled && (
          <>
            <InputField label={VIETNAMESE.spiritualRootLabel} id="playerSpiritualRoot" name="playerSpiritualRoot" value={settings.playerSpiritualRoot || ''} onChange={handleChange} placeholder="Vd: Ngũ Hành Tạp Linh Căn..." />
            <InputField label={VIETNAMESE.specialPhysiqueLabel} id="playerSpecialPhysique" name="playerSpecialPhysique" value={settings.playerSpecialPhysique || ''} onChange={handleChange} placeholder="Vd: Phàm Thể, Tiên Thiên Đạo Thể..." />
            <InputField label={VIETNAMESE.playerThoNguyenLabel} id="playerThoNguyen" name="playerThoNguyen" type="number" value={settings.playerThoNguyen || ''} onChange={handleChange} min={1} />
            <InputField label={VIETNAMESE.playerMaxThoNguyenLabel} id="playerMaxThoNguyen" name="playerMaxThoNguyen" type="number" value={settings.playerMaxThoNguyen || ''} onChange={handleChange} min={1} />
          </>
        )}
      </div>

       <fieldset className="border border-gray-700 p-4 rounded-md mt-4">
          <legend className="text-md font-semibold text-gray-300 px-1">{VIETNAMESE.playerAvatarSectionTitle}</legend>
          <div className="mt-2 space-y-3 flex flex-col items-center">
            {(playerAvatarPreviewUrl || playerUploadedAvatarData) && (
              <img src={playerAvatarPreviewUrl || playerUploadedAvatarData || ''} alt="Avatar Preview" className="w-24 h-24 rounded-full object-cover mx-auto mb-3" />
            )}
            <InputField
                label={VIETNAMESE.uploadAvatarButtonLabel}
                id="playerAvatarFile"
                name="playerAvatarFile"
                type="file"
                onChange={handleAvatarFileChange}
                accept="image/png, image/jpeg, image/webp, image/gif"
                className="max-w-xs"
            />
          </div>
       </fieldset>
    </div>
  );
};

export default CharacterStoryTab;