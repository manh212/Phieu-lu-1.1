import React, { useState, useEffect, ChangeEvent } from 'react';
import { GameScreen, ApiConfig } from '@/types/index'; 
import Button from './ui/Button';
import { VIETNAMESE, STORAGE_SETTINGS_STORAGE_KEY, DEFAULT_API_CONFIG } from '@/constants';
import { getApiSettings } from '@/services'; 
import CollapsibleSection from './ui/CollapsibleSection';

interface ParameterSettingsScreenProps {
  setCurrentScreen: (screen: GameScreen) => void;
  onSettingsSavedNotification: () => void;
}

const ParameterSettingsScreen: React.FC<ParameterSettingsScreenProps> = ({ setCurrentScreen, onSettingsSavedNotification }) => {
  const [settings, setSettings] = useState<ApiConfig>(DEFAULT_API_CONFIG);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);
  const [openSections, setOpenSections] = useState({
      creativity: true,
      performance: true,
  });

  useEffect(() => {
    setSettings(getApiSettings());
  }, []);

  const handleSettingChange = (field: keyof ApiConfig, value: string | number | boolean | undefined) => {
    let newSettings = { ...settings, [field]: value };

    // Enforce relationship between maxOutputTokens and thinkingBudget
    if (field === 'maxOutputTokens' && newSettings.maxOutputTokens !== undefined) {
      if (newSettings.thinkingBudget !== undefined && newSettings.thinkingBudget >= newSettings.maxOutputTokens) {
        newSettings.thinkingBudget = newSettings.maxOutputTokens - 1;
      }
    }
    if (field === 'thinkingBudget' && newSettings.thinkingBudget !== undefined) {
       if (newSettings.maxOutputTokens !== undefined && newSettings.thinkingBudget >= newSettings.maxOutputTokens) {
        newSettings.maxOutputTokens = newSettings.thinkingBudget + 1;
      }
    }

    setSettings(newSettings);
    if (!hasChanges) setHasChanges(true);
    if (successMessage) setSuccessMessage('');
  };

  const handleRandomizeSeed = () => {
    const randomSeed = Math.floor(Math.random() * 1000000);
    handleSettingChange('seed', randomSeed);
  };

  const handleSaveSettings = () => {
    const currentFullSettings = getApiSettings();
    const settingsToSave: ApiConfig = {
      ...currentFullSettings,
      temperature: settings.temperature,
      topK: settings.topK,
      topP: settings.topP,
      thinkingBudget: settings.thinkingBudget,
      maxOutputTokens: settings.maxOutputTokens,
      seed: settings.seed,
    };
    localStorage.setItem(STORAGE_SETTINGS_STORAGE_KEY, JSON.stringify(settingsToSave));
    setSuccessMessage(VIETNAMESE.parameterSettingsSavedMessage);
    onSettingsSavedNotification();
    setHasChanges(false);
  };
  
  const toggleSection = (section: keyof typeof openSections) => {
      setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-800 p-4 sm:p-6">
      <div className="w-full max-w-lg bg-gray-900 shadow-2xl rounded-xl p-6 sm:p-8">
        <h2 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-500 to-indigo-600 mb-8">
          {VIETNAMESE.parameterSettingsTitle}
        </h2>

        {successMessage && (
          <div className="mb-4 p-3 bg-green-500 bg-opacity-30 border border-green-700 text-green-300 rounded-md text-sm">
            {successMessage}
          </div>
        )}

        <div className="space-y-4">
          <CollapsibleSection title="Cài đặt Sáng tạo" isOpen={openSections.creativity} onToggle={() => toggleSection('creativity')}>
            <div className="space-y-6 p-2">
              <div>
                <label htmlFor="temperature" className="block text-sm font-medium text-gray-300 mb-1">
                  {VIETNAMESE.temperatureLabel} <span className="text-gray-400 font-normal">({settings.temperature?.toFixed(2)})</span>
                </label>
                <input type="range" id="temperature" min="0" max="2.0" step="0.05" value={settings.temperature ?? 1} onChange={(e) => handleSettingChange('temperature', parseFloat(e.target.value))} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"/>
                <p className="text-xs text-gray-400 mt-1">{VIETNAMESE.temperatureDescription}</p>
              </div>

              <div>
                <label htmlFor="topP" className="block text-sm font-medium text-gray-300 mb-1">
                  {VIETNAMESE.topPLabel} <span className="text-gray-400 font-normal">({settings.topP?.toFixed(2)})</span>
                </label>
                <input type="range" id="topP" min="0" max="1" step="0.05" value={settings.topP || 0.95} onChange={(e) => handleSettingChange('topP', parseFloat(e.target.value))} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"/>
                <p className="text-xs text-gray-400 mt-1">{VIETNAMESE.topPDescription}</p>
              </div>
              
              <div>
                <label htmlFor="topK" className="block text-sm font-medium text-gray-300 mb-1">
                  {VIETNAMESE.topKLabel} <span className="text-gray-400 font-normal">({settings.topK})</span>
                </label>
                <input type="range" id="topK" min="1" max="100" step="1" value={settings.topK || 64} onChange={(e) => handleSettingChange('topK', parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"/>
                <p className="text-xs text-gray-400 mt-1">{VIETNAMESE.topKDescription}</p>
              </div>
            </div>
          </CollapsibleSection>
          
          <CollapsibleSection title="Cài đặt Hiệu suất & Nâng cao" isOpen={openSections.performance} onToggle={() => toggleSection('performance')}>
             <div className="space-y-6 p-2">
                <div>
                    <label htmlFor="thinkingBudget" className="block text-sm font-medium text-gray-300 mb-1">
                      Ngân sách Suy nghĩ (Thinking Budget) <span className="text-gray-400 font-normal">({settings.thinkingBudget ?? 'Tự động'})</span>
                    </label>
                    <input type="range" id="thinkingBudget" min="0" max="30000" step="100" value={settings.thinkingBudget ?? 0} onChange={(e) => handleSettingChange('thinkingBudget', parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"/>
                    <p className="text-xs text-gray-400 mt-1">Chỉ dành cho model Flash. 0 = Tắt. Giá trị cao hơn cho chất lượng tốt hơn nhưng chậm hơn.</p>
                </div>

                <div>
                    <label htmlFor="maxOutputTokens" className="block text-sm font-medium text-gray-300 mb-1">
                      Số Token Đầu Ra Tối Đa <span className="text-gray-400 font-normal">({settings.maxOutputTokens ?? 'Tự động'})</span>
                    </label>
                    <input type="range" id="maxOutputTokens" min="50" max="65000" step="10" value={settings.maxOutputTokens ?? 50} onChange={(e) => handleSettingChange('maxOutputTokens', parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"/>
                    <p className="text-xs text-gray-400 mt-1">Giới hạn độ dài tối đa của phản hồi từ AI. Ngân sách suy nghĩ sẽ được tự điều chỉnh nếu cần.</p>
                </div>
                
                 <div>
                    <label htmlFor="seed" className="block text-sm font-medium text-gray-300 mb-1">
                      Hạt giống ngẫu nhiên (Seed)
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            id="seed"
                            value={settings.seed || ''}
                            onChange={(e) => handleSettingChange('seed', e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                            placeholder="Để trống để ngẫu nhiên"
                            className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 placeholder-gray-400 transition-colors"
                        />
                        <Button variant="secondary" onClick={handleRandomizeSeed}>Ngẫu nhiên</Button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Sử dụng một số cụ thể để có kết quả nhất quán, hữu ích cho việc gỡ lỗi.</p>
                </div>
            </div>
          </CollapsibleSection>


          <div className="flex flex-col sm:flex-row justify-between items-center pt-6 space-y-3 sm:space-y-0 sm:space-x-4">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setCurrentScreen(GameScreen.Initial)}
              className="w-full sm:w-auto"
            >
              {VIETNAMESE.goBackButton}
            </Button>
            <Button 
              type="button" 
              variant="primary" 
              size="lg" 
              onClick={handleSaveSettings}
              className="w-full sm:w-auto"
              disabled={!hasChanges}
            >
              {VIETNAMESE.saveSettingsButton}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParameterSettingsScreen;