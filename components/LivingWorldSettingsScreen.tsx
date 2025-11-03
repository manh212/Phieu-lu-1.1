// components/LivingWorldSettingsScreen.tsx
import React, { useState } from 'react';
import { useGame } from '../hooks/useGame';
import { GameScreen, LivingWorldSettings } from '../types/index';
import Button from './ui/Button';
import InputField from './ui/InputField';
import ToggleSwitch from './ui/ToggleSwitch';
import { VIETNAMESE, DEFAULT_LIVING_WORLD_SETTINGS } from '../constants';

const LivingWorldSettingsScreen: React.FC = () => {
  const { knowledgeBase, setKnowledgeBase, setCurrentScreen, showNotification } = useGame();
  
  const [settings, setSettings] = useState<LivingWorldSettings>(
    knowledgeBase.worldConfig?.livingWorldSettings || { ...DEFAULT_LIVING_WORLD_SETTINGS }
  );
  
  const [hasChanges, setHasChanges] = useState(false);

  const handleToggle = (field: 'isEnabled' | 'enabled', value: boolean, group?: 'npcAutoDevelopment' | 'npcAutonomy' | 'dynamicEvents') => {
    if (group && field === 'enabled') {
        setSettings(prev => ({
            ...prev,
            [group]: { ...prev[group], enabled: value }
        }));
    } else if (!group && field === 'isEnabled') {
        setSettings(prev => ({ ...prev, isEnabled: value }));
    }
    setHasChanges(true);
  };
  
  const handleSelectChange = (group: 'npcAutoDevelopment' | 'npcAutonomy', field: 'speed' | 'frequency' | 'scope', value: string) => {
      setSettings(prev => ({
          ...prev,
          [group]: {
              ...prev[group],
              [field]: value
          }
      }));
      setHasChanges(true);
  };
  
  const handleSave = () => {
    setKnowledgeBase(prevKb => {
      if (!prevKb.worldConfig) return prevKb;
      return {
        ...prevKb,
        worldConfig: {
          ...prevKb.worldConfig,
          livingWorldSettings: settings,
        }
      };
    });
    showNotification(VIETNAMESE.livingWorldSettingsSaved, 'success');
    setHasChanges(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-800 p-4 sm:p-6">
      <div className="w-full max-w-lg bg-gray-900 shadow-2xl rounded-xl p-6 sm:p-8">
        <h2 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-lime-500 to-emerald-600 mb-8">
          {VIETNAMESE.livingWorldSettings}
        </h2>
        
        <div className="space-y-6">
            {/* Bảng Điều Khiển Chính */}
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                <div className="flex justify-between items-center">
                    <label htmlFor="lw-isEnabled" className="font-semibold text-lg text-gray-100">
                        {VIETNAMESE.livingWorldEnableLabel}
                    </label>
                    <ToggleSwitch
                        id="lw-isEnabled"
                        checked={settings.isEnabled}
                        onChange={(checked) => handleToggle('isEnabled', checked)}
                    />
                </div>
                <p className="text-xs text-gray-400 mt-2">{VIETNAMESE.livingWorldEnableDescription}</p>
            </div>

            {/* Tự Động Phát Triển Của NPC */}
            <fieldset className={`p-4 border border-gray-700 rounded-lg space-y-4 transition-opacity ${!settings.isEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <legend className="text-lg font-semibold text-indigo-300 px-2">Phát Triển Của NPC</legend>
                <div className="flex justify-between items-center">
                    <label htmlFor="lw-npcDev-enabled" className="font-medium text-gray-200">
                        {VIETNAMESE.livingWorldNpcDevLabel}
                    </label>
                    <ToggleSwitch
                        id="lw-npcDev-enabled"
                        checked={settings.npcAutoDevelopment.enabled}
                        onChange={(checked) => handleToggle('enabled', checked, 'npcAutoDevelopment')}
                        disabled={!settings.isEnabled}
                    />
                </div>
                <p className="text-xs text-gray-400 -mt-3 ml-1">{VIETNAMESE.livingWorldNpcDevDescription}</p>

                <div className={!settings.npcAutoDevelopment.enabled ? 'opacity-50' : ''}>
                    <InputField
                        label={VIETNAMESE.livingWorldNpcDevSpeedLabel}
                        id="lw-npcDev-speed"
                        type="select"
                        value={settings.npcAutoDevelopment.speed}
                        onChange={(e) => handleSelectChange('npcAutoDevelopment', 'speed', e.target.value)}
                        options={['Rất Chậm', 'Chậm', 'Bình Thường', 'Nhanh', 'Rất Nhanh']}
                        disabled={!settings.isEnabled || !settings.npcAutoDevelopment.enabled}
                    />
                    <p className="text-xs text-gray-400 -mt-3 ml-1">{VIETNAMESE.livingWorldNpcDevSpeedDescription}</p>
                </div>
            </fieldset>

            {/* Quyền Tự Quyết Của NPC */}
            <fieldset className={`p-4 border border-gray-700 rounded-lg space-y-4 transition-opacity ${!settings.isEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <legend className="text-lg font-semibold text-indigo-300 px-2">Quyền Tự Quyết Của NPC</legend>
                <div className="flex justify-between items-center">
                    <label htmlFor="lw-npcAutonomy-enabled" className="font-medium text-gray-200">
                        {VIETNAMESE.livingWorldNpcAutonomyLabel}
                    </label>
                    <ToggleSwitch
                        id="lw-npcAutonomy-enabled"
                        checked={settings.npcAutonomy.enabled}
                        onChange={(checked) => handleToggle('enabled', checked, 'npcAutonomy')}
                        disabled={!settings.isEnabled}
                    />
                </div>
                <p className="text-xs text-gray-400 -mt-3 ml-1">{VIETNAMESE.livingWorldNpcAutonomyDescription}</p>

                <div className={`space-y-4 ${!settings.npcAutonomy.enabled ? 'opacity-50' : ''}`}>
                    <InputField
                        label={VIETNAMESE.livingWorldNpcAutonomyFreqLabel}
                        id="lw-npcAutonomy-freq"
                        type="select"
                        value={settings.npcAutonomy.frequency}
                        onChange={(e) => handleSelectChange('npcAutonomy', 'frequency', e.target.value)}
                        options={['Thấp', 'Vừa', 'Cao']}
                        disabled={!settings.isEnabled || !settings.npcAutonomy.enabled}
                    />
                     <p className="text-xs text-gray-400 -mt-3 ml-1">{VIETNAMESE.livingWorldNpcAutonomyFreqDescription}</p>
                    
                    <InputField
                        label={VIETNAMESE.livingWorldNpcAutonomyScopeLabel}
                        id="lw-npcAutonomy-scope"
                        type="select"
                        value={settings.npcAutonomy.scope}
                        onChange={(e) => handleSelectChange('npcAutonomy', 'scope', e.target.value)}
                        options={['Khu vực hiện tại', 'Toàn bộ thế giới']}
                        disabled={!settings.isEnabled || !settings.npcAutonomy.enabled}
                    />
                     <p className="text-xs text-gray-400 -mt-3 ml-1">{VIETNAMESE.livingWorldNpcAutonomyScopeDescription}</p>
                </div>
            </fieldset>

             {/* Sự Kiện Động Của Thế Giới */}
             <fieldset className={`p-4 border border-gray-700 rounded-lg space-y-4 transition-opacity ${!settings.isEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <legend className="text-lg font-semibold text-indigo-300 px-2">Sự Kiện Động</legend>
                <div className="flex justify-between items-center">
                    <label htmlFor="lw-dynamicEvents-enabled" className="font-medium text-gray-200">
                        {VIETNAMESE.livingWorldDynamicEventsLabel}
                    </label>
                    <ToggleSwitch
                        id="lw-dynamicEvents-enabled"
                        checked={settings.dynamicEvents.enabled}
                        onChange={(checked) => handleToggle('enabled', checked, 'dynamicEvents')}
                        disabled={!settings.isEnabled}
                    />
                </div>
                <p className="text-xs text-gray-400 -mt-3 ml-1">{VIETNAMESE.livingWorldDynamicEventsDescription}</p>
            </fieldset>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-center pt-6 mt-6 border-t border-gray-700 space-y-3 sm:space-y-0">
            <Button variant="ghost" onClick={() => setCurrentScreen(GameScreen.Gameplay)}>
                {VIETNAMESE.goBackButton}
            </Button>
            <Button variant="primary" size="lg" onClick={handleSave} disabled={!hasChanges}>
                {VIETNAMESE.saveSettingsButton}
            </Button>
        </div>
      </div>
    </div>
  );
};

export default LivingWorldSettingsScreen;
