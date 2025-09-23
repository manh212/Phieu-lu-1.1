import React, { useState, useRef, ChangeEvent } from 'react';
import { GameScreen, WorldSettings, GeneratedWorldElements } from '@/types/index'; 
import Button from './ui/Button';
import { VIETNAMESE } from '@/constants';
import { AIArchitectModal } from './gameSetup/AIArchitectModal';
import { GameSetupProvider, useGameSetup } from '@/contexts/GameSetupContext';
import { parseTagValue } from '@/utils/parseTagValue';
import Modal from './ui/Modal';


// Import tab components
import AIAssistTab from './gameSetup/tabs/AIAssistTab';
import CharacterStoryTab from './gameSetup/tabs/CharacterStoryTab';
import WorldSettingsTab from './gameSetup/tabs/WorldSettingsTab';
import StartingElementsTab from './gameSetup/tabs/StartingElementsTab';

// --- START: Manual Input Modal Component (Moved from AIAssistTab) ---
interface ManualInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (text: string) => void;
  isLoading: boolean;
}

const ManualInputModal: React.FC<ManualInputModalProps> = ({ isOpen, onClose, onApply, isLoading }) => {
  const [inputText, setInputText] = useState('');

  const handleApplyClick = () => {
    if (!isLoading) {
      onApply(inputText);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nhập Thẻ Thiết Lập Thủ Công">
      <div className="space-y-4">
        <p className="text-sm text-gray-300">
          Dán các thẻ thiết lập của bạn vào đây. Hệ thống sẽ phân tích và điền các thông tin tương ứng. Mỗi thẻ phải có định dạng như <code>[GENERATED_PLAYER_NAME: name="Tên"]</code> và nằm trên một dòng riêng biệt.
        </p>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="w-full h-64 p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 font-mono text-sm custom-scrollbar"
          placeholder={'[GENERATED_PLAYER_NAME: name="Lý Tiêu Dao"]\n[GENERATED_WORLD_THEME: text="Một thế giới tu tiên tàn khốc..."]\n...'}
          aria-label="Vùng nhập liệu thẻ thủ công"
          disabled={isLoading}
        />
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {VIETNAMESE.cancelEditButton || 'Hủy'}
          </Button>
          <Button variant="primary" onClick={handleApplyClick} className="bg-green-600 hover:bg-green-700 focus:ring-green-500" isLoading={isLoading} disabled={isLoading}>
            Áp dụng & Đóng
          </Button>
        </div>
      </div>
    </Modal>
  );
};
// --- END: Manual Input Modal Component ---

// --- START: Manual Tag Parser (Moved from AIAssistTab) ---
const parseManualTags = (responseText: string | undefined): Partial<GeneratedWorldElements> => {
    const generated: Partial<GeneratedWorldElements> & { [key: string]: any } = {};
    
    if (!responseText) return generated;

    const lines = responseText.split('\n');
    lines.forEach(line => {
        const match = line.trim().match(/^\[(GENERATED_[A-Z_]+):\s*(.*)\]$/);
        if (!match) return;

        const tagName = match[1];
        const params = parseTagValue(match[2]);
        
        const initArray = (key: keyof GeneratedWorldElements) => {
            if (!generated[key]) {
                (generated as any)[key] = [];
            }
        };

        switch (tagName) {
            case 'GENERATED_PLAYER_NAME': if (params.name) generated.playerName = params.name; break;
            case 'GENERATED_PLAYER_GENDER': if (params.gender) generated.playerGender = params.gender as any; break;
            case 'GENERATED_PLAYER_RACE': if (params.text) generated.playerRace = params.text; break;
            case 'GENERATED_PLAYER_PERSONALITY': if (params.text) generated.playerPersonality = params.text; break;
            case 'GENERATED_PLAYER_BACKSTORY': if (params.text) generated.playerBackstory = params.text; break;
            case 'GENERATED_PLAYER_GOAL': if (params.text) generated.playerGoal = params.text; break;
            case 'GENERATED_PLAYER_STARTING_TRAITS': if (params.text) generated.playerStartingTraits = params.text; break;
            case 'GENERATED_WORLD_THEME': if (params.text) generated.theme = params.text; break;
            case 'GENERATED_WORLD_SETTING_DESCRIPTION': if (params.text) generated.settingDescription = params.text; break;
            case 'GENERATED_WORLD_WRITING_STYLE': if (params.text) generated.writingStyle = params.text; break;
            case 'GENERATED_CURRENCY_NAME': if (params.name) generated.currencyName = params.name; break;
            case 'GENERATED_STARTING_CURRENCY': if (params.value) generated.startingCurrency = parseInt(params.value, 10); break;
            case 'GENERATED_CANH_GIOI_KHOI_DAU': if (params.text) generated.canhGioiKhoiDau = params.text; break;
            case 'GENERATED_PLAYER_SPIRITUAL_ROOT': if (params.text) generated.playerSpiritualRoot = params.text; break;
            case 'GENERATED_PLAYER_SPECIAL_PHYSIQUE': if (params.text) generated.playerSpecialPhysique = params.text; break;
            case 'GENERATED_IS_CULTIVATION_ENABLED': if(params.value) generated.isCultivationEnabled = params.value.toLowerCase() === 'true'; break;

            case 'GENERATED_RACE_SYSTEM':
                if (params.race && params.system) {
                    initArray('raceCultivationSystems');
                    generated.raceCultivationSystems!.push({ id: `sys-${params.race}-${Date.now()}`, raceName: params.race, realmSystem: params.system });
                }
                break;
            case 'GENERATED_YEUTHU_SYSTEM':
                if (params.system) generated.yeuThuRealmSystem = params.system;
                break;
            
            case 'GENERATED_SKILL':
                if(params.name) {
                    initArray('startingSkills');
                    generated.startingSkills!.push(params as any);
                }
                break;
            case 'GENERATED_ITEM':
                if(params.name) {
                    initArray('startingItems');
                    generated.startingItems!.push(params as any);
                }
                break;
            case 'GENERATED_NPC':
                if(params.name) {
                    initArray('startingNPCs');
                    generated.startingNPCs!.push(params as any);
                }
                break;
            case 'GENERATED_YEUTHU':
                 if(params.name) {
                    initArray('startingYeuThu');
                    generated.startingYeuThu!.push(params as any);
                 }
                break;
            case 'GENERATED_LORE':
                 if(params.title) {
                    initArray('startingLore');
                    generated.startingLore!.push(params as any);
                 }
                break;
            case 'GENERATED_LOCATION':
                 if(params.name) {
                    initArray('startingLocations');
                    generated.startingLocations!.push(params as any);
                 }
                break;
            case 'GENERATED_FACTION':
                 if(params.name) {
                    initArray('startingFactions');
                    generated.startingFactions!.push(params as any);
                 }
                break;
        }
    });

    return generated;
}
// --- END: Manual Tag Parser ---


interface GameSetupScreenProps {
  setCurrentScreen: (screen: GameScreen) => void;
  onSetupComplete: (settings: WorldSettings, uploadedAvatarData?: string | null) => void;
}

type SetupTab = 'aiAssist' | 'characterStory' | 'worldSettings' | 'startingElements';

const activeTabStyle = "whitespace-nowrap py-3 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm border-indigo-500 text-indigo-400 focus:outline-none";
const inactiveTabStyle = "whitespace-nowrap py-3 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500 focus:outline-none";

// Inner component to access context and hooks
const GameSetupContent = ({ setCurrentScreen, onSetupComplete }: GameSetupScreenProps): React.ReactElement => {
  const [activeTab, setActiveTab] = useState<SetupTab>('aiAssist');
  const [isArchitectModalOpen, setIsArchitectModalOpen] = useState(false);
  const [isManualInputModalOpen, setIsManualInputModalOpen] = useState(false);
  const [isParsingManual, setIsParsingManual] = useState(false);
  const [playerUploadedAvatarData, setPlayerUploadedAvatarData] = useState<string | null>(null);
  const importSettingsFileRef = useRef<HTMLInputElement>(null);
  
  const { state, dispatch } = useGameSetup();

  const [openSections, setOpenSections] = useState({
      skills: false,
      items: false,
      npcs: false,
      yeuThu: false,
      lore: false,
      locations: false,
      factions: false,
  });

  const toggleSection = (section: keyof typeof openSections) => {
      setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  const handleApplyArchitectChanges = (newSettings: WorldSettings) => {
    dispatch({ type: 'LOAD_SETTINGS', payload: newSettings });
  };
  
  const handleApplyManualInput = (text: string) => {
      setIsParsingManual(true);
      try {
          const parsedElements = parseManualTags(text);
          dispatch({ type: 'MANUALLY_ADD_ELEMENTS', payload: parsedElements });
          setIsManualInputModalOpen(false);
      } catch (e) {
          const errorMsg = e instanceof Error ? e.message : 'Lỗi không xác định.';
          dispatch({ type: 'SET_ERROR', payload: `Lỗi khi phân tích thẻ thủ công: ${errorMsg}` });
      } finally {
          setIsParsingManual(false);
      }
  };


  const handleStartGame = () => {
    if (!state.settings.saveGameName.trim()) {
      dispatch({ type: 'SET_ERROR', payload: VIETNAMESE.saveGameNameRequiredError });
      // Optionally switch to the tab with the error
      if (activeTab !== 'worldSettings') {
        setActiveTab('worldSettings');
      }
      return;
    }

    let finalSettings = { ...state.settings };
    if (playerUploadedAvatarData) {
      if (playerUploadedAvatarData.startsWith('data:')) {
        finalSettings.playerAvatarUrl = "uploaded_via_file";
      } else if (playerUploadedAvatarData.startsWith('http')) {
        finalSettings.playerAvatarUrl = playerUploadedAvatarData;
      }
    } else if (finalSettings.playerAvatarUrl && !finalSettings.playerAvatarUrl.startsWith('http')) {
      finalSettings.playerAvatarUrl = undefined;
    }
    onSetupComplete(finalSettings, playerUploadedAvatarData);
  };
  
  const handleExportSettings = () => {
    try {
      const settingsString = JSON.stringify(state.settings, null, 2);
      const blob = new Blob([settingsString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `${state.settings.saveGameName || 'thiet-lap-the-gioi'}.json`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: "Lỗi khi xuất thiết lập." });
    }
  };

  const handleImportSettings = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result;
          if (typeof text === 'string') {
            const importedSettings = JSON.parse(text);
            dispatch({ type: 'LOAD_SETTINGS', payload: importedSettings });
          }
        } catch (err) {
          dispatch({ type: 'SET_ERROR', payload: VIETNAMESE.invalidWorldSettingsFile });
        }
      };
      reader.readAsText(file);
      // Reset file input to allow re-uploading the same file
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-800 p-4">
      <div className="w-full max-w-4xl mx-auto bg-gray-900 shadow-2xl rounded-xl p-6 space-y-6">
        <div className="text-center">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 mb-4">
                Cuộc Phiêu Lưu Mới
            </h1>
            <div className="flex justify-center gap-2">
                <Button onClick={() => setIsManualInputModalOpen(true)} variant="secondary" size="sm">Nhập Thẻ</Button>
                <Button onClick={handleExportSettings} variant="secondary" size="sm">{VIETNAMESE.exportWorldSettingsButton}</Button>
                <Button onClick={() => importSettingsFileRef.current?.click()} variant="primary" size="sm" className="bg-green-600 hover:bg-green-700 focus:ring-green-500">{VIETNAMESE.importWorldSettingsButton}</Button>
                <input type="file" ref={importSettingsFileRef} onChange={handleImportSettings} className="hidden" accept=".json,application/json" />
            </div>
        </div>
        
        <div className="border-b border-gray-700 sticky top-0 bg-gray-900 z-10 -mx-6 px-6 mb-2">
          <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto pb-px hide-scrollbar" aria-label="Tabs" role="tablist">
            <button id="tab-aiAssist" role="tab" aria-controls="panel-aiAssist" aria-selected={activeTab === 'aiAssist'} onClick={() => setActiveTab('aiAssist')} className={activeTab === 'aiAssist' ? activeTabStyle : inactiveTabStyle}>AI Hỗ Trợ</button>
            <button id="tab-characterStory" role="tab" aria-controls="panel-characterStory" aria-selected={activeTab === 'characterStory'} onClick={() => setActiveTab('characterStory')} className={activeTab === 'characterStory' ? activeTabStyle : inactiveTabStyle}>Nhân Vật & Cốt Truyện</button>
            <button id="tab-worldSettings" role="tab" aria-controls="panel-worldSettings" aria-selected={activeTab === 'worldSettings'} onClick={() => setActiveTab('worldSettings')} className={activeTab === 'worldSettings' ? activeTabStyle : inactiveTabStyle}>Thiết Lập Thế Giới</button>
            <button id="tab-startingElements" role="tab" aria-controls="panel-startingElements" aria-selected={activeTab === 'startingElements'} onClick={() => setActiveTab('startingElements')} className={activeTab === 'startingElements' ? activeTabStyle : inactiveTabStyle}>Yếu Tố Khởi Đầu</button>
          </nav>
        </div>

        <div className="max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar pr-2 pb-4 -mr-2">
          {activeTab === 'aiAssist' && (
            <div id="panel-aiAssist" role="tabpanel" tabIndex={0} aria-labelledby="tab-aiAssist">
              <AIAssistTab setIsArchitectModalOpen={setIsArchitectModalOpen} />
            </div>
          )}
          {activeTab === 'characterStory' && (
            <div id="panel-characterStory" role="tabpanel" tabIndex={0} aria-labelledby="tab-characterStory">
              <CharacterStoryTab 
                playerUploadedAvatarData={playerUploadedAvatarData}
                setPlayerUploadedAvatarData={setPlayerUploadedAvatarData}
              />
            </div>
          )}
          {activeTab === 'worldSettings' && (
            <div id="panel-worldSettings" role="tabpanel" tabIndex={0} aria-labelledby="tab-worldSettings">
              <WorldSettingsTab />
            </div>
          )}
          {activeTab === 'startingElements' && (
            <div id="panel-startingElements" role="tabpanel" tabIndex={0} aria-labelledby="tab-startingElements">
              <StartingElementsTab
                openSections={openSections}
                toggleSection={toggleSection}
              />
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-gray-700 space-y-3 sm:space-y-0 sm:space-x-4">
          <Button variant="secondary" onClick={() => setCurrentScreen(GameScreen.Initial)} className="w-full sm:w-auto">
            {VIETNAMESE.goBackButton}
          </Button>
          <Button variant="primary" size="lg" onClick={handleStartGame} className="w-full sm:w-auto">
            {VIETNAMESE.startGame}
          </Button>
        </div>
      </div>
      
      <AIArchitectModal
          isOpen={isArchitectModalOpen}
          onClose={() => setIsArchitectModalOpen(false)}
          currentSettings={state.settings}
          onApplyChanges={handleApplyArchitectChanges}
      />
      <ManualInputModal 
        isOpen={isManualInputModalOpen} 
        onClose={() => setIsManualInputModalOpen(false)} 
        onApply={handleApplyManualInput} 
        isLoading={isParsingManual}
      />
    </div>
  );
};

const GameSetupScreen = (props: GameSetupScreenProps): React.ReactElement => {
  return (
    <GameSetupProvider>
      <GameSetupContent {...props} />
    </GameSetupProvider>
  );
};

export default GameSetupScreen;