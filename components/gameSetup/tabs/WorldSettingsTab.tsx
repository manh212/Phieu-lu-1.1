import React, { ChangeEvent, useState } from 'react';
import { useGameSetup } from '../../../contexts/GameSetupContext';
import { WorldSettings, RaceCultivationSystem } from '../../../types/index';
import InputField from '../../ui/InputField';
import Button from '../../ui/Button';
import CollapsibleSection from '../../ui/CollapsibleSection';
import { VIETNAMESE, AVAILABLE_GENRES, CUSTOM_GENRE_VALUE, NSFW_DESCRIPTION_STYLES, DEFAULT_NSFW_DESCRIPTION_STYLE, VIOLENCE_LEVELS, DEFAULT_VIOLENCE_LEVEL, STORY_TONES, DEFAULT_STORY_TONE } from '../../../constants';

const WorldSettingsTab: React.FC = () => {
  const { state, dispatch } = useGameSetup();
  const { settings } = state;
  const [isRaceSystemsOpen, setIsRaceSystemsOpen] = useState(true);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const payload = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    dispatch({ type: 'UPDATE_FIELD', payload: { field: name as keyof WorldSettings, value: payload }});
  };
  
  const handleRaceSystemChange = (index: number, field: keyof Omit<RaceCultivationSystem, 'id'>, value: string) => {
    const newSystems = [...settings.raceCultivationSystems];
    newSystems[index] = { ...newSystems[index], [field]: value };
    dispatch({ type: 'UPDATE_FIELD', payload: { field: 'raceCultivationSystems', value: newSystems }});
  };

  const addRaceSystem = () => {
    const newSystem: RaceCultivationSystem = { id: `sys-${Date.now()}`, raceName: '', realmSystem: '' };
    dispatch({ type: 'UPDATE_FIELD', payload: { field: 'raceCultivationSystems', value: [...settings.raceCultivationSystems, newSystem] }});
  };

  const removeRaceSystem = (idToRemove: string) => {
    const newSystems = settings.raceCultivationSystems.filter(sys => sys.id !== idToRemove);
    dispatch({ type: 'UPDATE_FIELD', payload: { field: 'raceCultivationSystems', value: newSystems }});
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
      <InputField label={VIETNAMESE.saveGameNameLabel} id="saveGameNameTabWorldSettings" name="saveGameName" value={settings.saveGameName} onChange={handleChange} placeholder={settings.playerName ? VIETNAMESE.saveGameNamePlaceholder.replace("[Tên Nhân Vật]", settings.playerName) : VIETNAMESE.saveGameNamePlaceholder.replace(" [Tên Nhân Vật]", "")} />
      <InputField label={VIETNAMESE.worldTheme} id="themeTabWorldSettings" name="theme" value={settings.theme} onChange={handleChange} />
      <InputField label={VIETNAMESE.genreLabel} id="genreTabWorldSettings" name="genre" type="select" options={AVAILABLE_GENRES as unknown as string[]} value={settings.genre} onChange={handleChange} />
      {settings.genre === CUSTOM_GENRE_VALUE && (
        <InputField label={VIETNAMESE.customGenreNameLabel} id="customGenreNameTabWorldSettings" name="customGenreName" value={settings.customGenreName || ''} onChange={handleChange} placeholder={VIETNAMESE.customGenreNamePlaceholder}/>
      )}
      <InputField label={VIETNAMESE.worldSetting} id="settingDescriptionTabWorldSettings" name="settingDescription" value={settings.settingDescription} onChange={handleChange} textarea rows={3} />
      <InputField label={VIETNAMESE.writingStyle} id="writingStyleTabWorldSettings" name="writingStyle" value={settings.writingStyle} onChange={handleChange} textarea />
      <InputField label={VIETNAMESE.difficultyLabel} id="difficultyTabWorldSettings" name="difficulty" type="select" options={['Dễ', 'Thường', 'Khó', 'Ác Mộng']} value={settings.difficulty} onChange={handleChange} />
      <InputField label={VIETNAMESE.currencyName} id="currencyNameTabWorldSettings" name="currencyName" value={settings.currencyName} onChange={handleChange} />
      
      <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-5 gap-x-4 border-t border-gray-700 pt-4 mt-2">
        <InputField label="Ngày" id="startingDay" name="startingDate.day" type="number" value={settings.startingDate.day} onChange={handleChange} min={1} max={30} />
        <InputField label="Tháng" id="startingMonth" name="startingDate.month" type="number" value={settings.startingDate.month} onChange={handleChange} min={1} max={12} />
        <InputField label="Năm" id="startingYear" name="startingDate.year" type="number" value={settings.startingDate.year} onChange={handleChange} min={1} />
        <InputField label="Giờ" id="startingHour" name="startingDate.hour" type="number" value={settings.startingDate.hour} onChange={handleChange} min={0} max={23} />
        <InputField label="Phút" id="startingMinute" name="startingDate.minute" type="number" value={settings.startingDate.minute} onChange={handleChange} min={0} max={59} />
      </div>

      <div className="md:col-span-2 border-t border-gray-700 pt-4 mt-2">
        <InputField label={VIETNAMESE.enableCultivationSystemLabel} id="isCultivationEnabledTabWorldSettings" name="isCultivationEnabled" type="checkbox" checked={settings.isCultivationEnabled} onChange={handleChange} />
        {settings.isCultivationEnabled && (
          <div className="space-y-4 pl-4 border-l-2 border-sky-700/50 mt-2">
            <CollapsibleSection title="Hệ Thống Cảnh Giới Theo Chủng Tộc" isOpen={isRaceSystemsOpen} onToggle={() => setIsRaceSystemsOpen(!isRaceSystemsOpen)} itemCount={settings.raceCultivationSystems.length}>
              <div className="space-y-4">
                {(settings.raceCultivationSystems || []).map((system, index) => (
                  <div key={system.id} className="p-3 border border-gray-600 rounded-md relative bg-gray-800/20">
                    <InputField label="Tên Chủng Tộc" id={`raceName-${index}`} value={system.raceName} onChange={(e) => handleRaceSystemChange(index, 'raceName', e.target.value)} />
                    <InputField label="Hệ Thống Cảnh Giới (phân cách bằng ' - ')" id={`realmSystem-${index}`} value={system.realmSystem} onChange={(e) => handleRaceSystemChange(index, 'realmSystem', e.target.value)} textarea rows={2} placeholder="Vd: Luyện Khí - Trúc Cơ..." />
                    {settings.raceCultivationSystems.length > 1 && ( <Button variant="danger" size="sm" onClick={() => removeRaceSystem(system.id)} className="absolute top-2 right-2 !p-1.5 leading-none">&times;</Button> )}
                  </div>
                ))}
                <Button onClick={addRaceSystem} variant="ghost" size="sm" className="w-full border-dashed mt-2">+ Thêm Hệ Thống</Button>
              </div>
            </CollapsibleSection>
            
            <InputField label="Hệ Thống Cảnh Giới Yêu Thú" id="yeuThuRealmSystem" name="yeuThuRealmSystem" value={settings.yeuThuRealmSystem} onChange={handleChange} placeholder="Vd: Khai Trí - Yêu Binh..." />
            <InputField label={VIETNAMESE.startingRealmLabel} id="canhGioiKhoiDauTabWorldSettings" name="canhGioiKhoiDau" value={settings.canhGioiKhoiDau} onChange={handleChange} placeholder={VIETNAMESE.startingRealmPlaceholder} />
          </div>
        )}
      </div>
    </div>
  );
};

export default WorldSettingsTab;