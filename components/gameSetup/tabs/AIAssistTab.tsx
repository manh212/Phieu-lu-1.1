import React, { ChangeEvent, useRef, useState } from 'react';
import { useGameSetup } from '../../../contexts/GameSetupContext';
import { useAIAssist } from '../../../hooks/useAIAssist';
import Button from '../../ui/Button';
import InputField from '../../ui/InputField';
import Spinner from '../../ui/Spinner';
import Modal from '../../ui/Modal';
import { VIETNAMESE, MAX_TOKENS_FANFIC, NSFW_DESCRIPTION_STYLES, DEFAULT_NSFW_DESCRIPTION_STYLE, VIOLENCE_LEVELS, DEFAULT_VIOLENCE_LEVEL, STORY_TONES, DEFAULT_STORY_TONE, AVAILABLE_GENRES } from '../../../constants';
import * as GameTemplates from '../../../types/index';
import { GeneratedWorldElements, StartingSkill, StartingItem, StartingNPC, StartingLore, StartingLocation, StartingFaction, GenreType, ViolenceLevel, StoryTone, NsfwDescriptionStyle, TuChatTier, WorldDate, CongPhapGrade, CongPhapType, LinhKiActivationType, LinhKiCategory, ProfessionGrade, ProfessionType, RaceCultivationSystem, StartingYeuThu, WorldSettings } from '../../../types/index';
import { parseTagValue } from '../../../utils/parseTagValue';

// --- START: Manual Input Modal Component ---
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


// --- START: Manual Tag Parser ---
const parseManualTags = (responseText: string | undefined): GeneratedWorldElements => {
    const generated: GeneratedWorldElements = {
        startingSkills: [], startingItems: [], startingNPCs: [], startingLore: [], startingYeuThu: [],
        startingLocations: [], startingFactions: [], raceCultivationSystems: [], yeuThuRealmSystem: '',
        genre: AVAILABLE_GENRES[0], isCultivationEnabled: true, nsfwDescriptionStyle: DEFAULT_NSFW_DESCRIPTION_STYLE,
        violenceLevel: DEFAULT_VIOLENCE_LEVEL, storyTone: DEFAULT_STORY_TONE,
    };
    
    if (!responseText) return generated;

    const lines = responseText.split('\n');
    lines.forEach(line => {
        const match = line.trim().match(/^\[(GENERATED_[A-Z_]+):\s*(.*)\]$/);
        if (!match) return;

        const tagName = match[1];
        const params = parseTagValue(match[2]);

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
                    generated.raceCultivationSystems.push({ id: `sys-${params.race}-${Date.now()}`, raceName: params.race, realmSystem: params.system });
                }
                break;
            case 'GENERATED_YEUTHU_SYSTEM':
                if (params.system) generated.yeuThuRealmSystem = params.system;
                break;
            
            case 'GENERATED_SKILL':
                if(params.name) generated.startingSkills.push(params as any);
                break;
            case 'GENERATED_ITEM':
                if(params.name) generated.startingItems.push(params as any);
                break;
            case 'GENERATED_NPC':
                if(params.name) generated.startingNPCs.push(params as any);
                break;
            case 'GENERATED_YEUTHU':
                 if(params.name) generated.startingYeuThu.push(params as any);
                break;
            case 'GENERATED_LORE':
                 if(params.title) generated.startingLore.push(params as any);
                break;
            case 'GENERATED_LOCATION':
                 if(params.name) generated.startingLocations.push(params as any);
                break;
            case 'GENERATED_FACTION':
                 if(params.name) generated.startingFactions.push(params as any);
                break;
        }
    });

    return generated;
}
// --- END: Manual Tag Parser ---

interface AIAssistTabProps {
  setIsArchitectModalOpen: (isOpen: boolean) => void;
}

const AIAssistTab: React.FC<AIAssistTabProps> = ({ setIsArchitectModalOpen }) => {
  const { state, dispatch } = useGameSetup();
  const { settings } = state;
  const { 
    generateFromStoryIdea, 
    generateFromFanfic, 
    generateCompletion, 
    analyzeWritingStyle,
    loadingStates, 
    error: assistError, 
    generatorMessage,
    countFileTokens,
    rawApiResponseText,
    sentWorldGenPrompt
  } = useAIAssist();

  // Local state for form inputs
  const [storyIdea, setStoryIdea] = useState('');
  const [fanficSourceType, setFanficSourceType] = useState<'name' | 'file'>('name');
  const [fanficStoryName, setFanficStoryName] = useState('');
  const [fanficFile, setFanficFile] = useState<File | null>(null);
  const [fanficTokenCount, setFanficTokenCount] = useState<number | null>(null);
  const [fanficPlayerDescription, setFanficPlayerDescription] = useState('');
  const [showOriginalStorySummary, setShowOriginalStorySummary] = useState(false);
  
  const [writingStyleSource, setWritingStyleSource] = useState<'file' | 'text'>('text');
  const [analysisResult, setAnalysisResult] = useState<{ analysis: string; summary: string } | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [showRawResponseModal, setShowRawResponseModal] = useState(false);
  const [showSentPromptModal, setShowSentPromptModal] = useState(false);
  
  // NEW: State for manual input modal
  const [isManualInputModalOpen, setIsManualInputModalOpen] = useState(false);
  const [isParsingManual, setIsParsingManual] = useState(false);

  const fanficFileInputRef = useRef<HTMLInputElement>(null);
  const writingStyleFileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFanficFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFanficFile(file);
      const tokens = await countFileTokens(file);
      setFanficTokenCount(tokens);
    }
  };

  const handleWritingStyleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const content = await file.text();
        dispatch({ type: 'UPDATE_FIELD', payload: { field: 'writingStyleGuide', value: content }});
      } catch (err) {
        dispatch({type: 'SET_ERROR', payload: "Lỗi khi đọc file."})
      }
    }
  };

  const handleGenFanfic = async () => {
    let source = fanficStoryName;
    let isContent = false;
    if (fanficSourceType === 'file' && fanficFile) {
        source = await fanficFile.text();
        isContent = true;
    }
    generateFromFanfic(source, isContent, fanficPlayerDescription, settings);
  };
  
  const handleAnalyzeStyle = async () => {
    setAnalysisResult(null);
    setAnalysisError(null);
    const result = await analyzeWritingStyle(settings.writingStyleGuide || '');
    if (result) {
        const analysisMatch = result.match(/\[ANALYSIS_START\]([\s\S]*?)\[ANALYSIS_END\]/);
        const summaryMatch = result.match(/\[SUMMARY_PROMPT_START\]([\s\S]*?)\[SUMMARY_PROMPT_END\]/);
        if (analysisMatch && summaryMatch) {
            setAnalysisResult({ analysis: analysisMatch[1].trim(), summary: summaryMatch[1].trim() });
        } else {
            setAnalysisError("AI trả về kết quả không đúng định dạng. Vui lòng thử lại.");
        }
    } else {
        setAnalysisError("Không nhận được phản hồi từ AI.");
    }
  };

  const handleApplyStyle = () => {
    if (analysisResult?.summary) {
        dispatch({ type: 'UPDATE_FIELD', payload: { field: 'writingStyleGuide', value: analysisResult.summary }});
        showNotification('Đã áp dụng văn phong tóm tắt!', 'success');
    }
  };
  
  // NEW: Handler for manual input
  const handleApplyManualInput = (text: string) => {
      setIsParsingManual(true);
      try {
          const parsedElements = parseManualTags(text);
          dispatch({ type: 'APPLY_AI_GENERATION', payload: parsedElements });
          showNotification('Đã áp dụng thành công các thiết lập từ thẻ thủ công!', 'success');
          setIsManualInputModalOpen(false);
      } catch (e) {
          const errorMsg = e instanceof Error ? e.message : 'Lỗi không xác định.';
          dispatch({ type: 'SET_ERROR', payload: `Lỗi khi phân tích thẻ thủ công: ${errorMsg}` });
      } finally {
          setIsParsingManual(false);
      }
  };

  const showNotification = (message: string, type: 'success' | 'info') => {
      // A simple alert, or replace with a proper toast notification system if available
      alert(message);
  };

  return (
    <div className="space-y-6">
      {(generatorMessage || assistError || state.error) && (
          <div className={`p-3 rounded-md text-sm ${ assistError || state.error ? 'bg-red-600/80 text-white' : 'bg-blue-600/80 text-white' }`}>
            {generatorMessage || assistError || state.error}
          </div>
      )}

      {/* Debug Buttons */}
      {(rawApiResponseText || sentWorldGenPrompt) && (
          <div className="flex gap-4 p-2 bg-gray-800 rounded-md">
            {rawApiResponseText && <Button variant="ghost" size="sm" onClick={() => setShowRawResponseModal(true)}>Xem Phản Hồi Thô</Button>}
            {sentWorldGenPrompt && <Button variant="ghost" size="sm" onClick={() => setShowSentPromptModal(true)}>Xem Prompt Đã Gửi</Button>}
          </div>
      )}
      
      {/* AI Architect */}
      <div className="border border-purple-500 p-4 rounded-lg bg-gray-800/30">
        <h3 className="text-xl font-semibold text-purple-400 mb-2">Kiến Trúc Sư AI</h3>
        <p className="text-sm text-gray-300 mb-3">Sử dụng ngôn ngữ tự nhiên để thay đổi bất kỳ thiết lập nào trên màn hình này. Bạn có thể yêu cầu AI thêm, sửa, xóa các yếu tố khởi đầu hoặc thay đổi các cài đặt của thế giới.</p>
        <Button onClick={() => setIsArchitectModalOpen(true)} variant="primary" className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 focus:ring-purple-500">
          Trò chuyện với Kiến Trúc sư AI
        </Button>
      </div>
      
      {/* Manual Tag Input */}
      <div className="border border-gray-600 p-4 rounded-lg bg-gray-800/30">
        <h3 className="text-xl font-semibold text-gray-400 mb-2">Nhập Thẻ Thủ Công</h3>
        <p className="text-sm text-gray-300 mb-3">Dán trực tiếp các thẻ thiết lập thế giới (ví dụ: từ một file đã lưu hoặc một lần tạo trước đó) để nhanh chóng tái tạo hoặc tinh chỉnh thế giới của bạn.</p>
        <Button onClick={() => setIsManualInputModalOpen(true)} variant="secondary" className="w-full sm:w-auto">
          Mở trình nhập thủ công
        </Button>
      </div>

      {/* Autocomplete */}
      <div className="border border-green-500 p-4 rounded-lg bg-gray-800/30">
        <h3 className="text-xl font-semibold text-green-400 mb-2">Hoàn Thiện Tự Động</h3>
        <p className="text-sm text-gray-300 mb-3">Bạn đã điền một vài thông tin? Nhấn nút này để AI tự động điền nốt các trường còn lại dựa trên bối cảnh bạn đã cung cấp.</p>
        <Button onClick={() => generateCompletion(settings)} isLoading={loadingStates.completion} disabled={Object.values(loadingStates).some(s => s)} variant="primary" className="w-full sm:w-auto bg-green-600 hover:bg-green-700 focus:ring-green-500" loadingText="AI đang hoàn thiện...">
          AI Hoàn Thiện Các Trường Trống
        </Button>
      </div>
      
      {/* Style Analysis */}
      <div className="border border-orange-500 p-4 rounded-lg bg-gray-800/30">
          <h3 className="text-xl font-semibold text-orange-400 mb-2">AI Phản Hồi & Phân Tích Văn Phong</h3>
          <p className="text-sm text-gray-300 mb-3">Cung cấp một đoạn văn mẫu để AI bắt chước văn phong, hoặc nhấn "Phân Tích" để AI đưa ra nhận xét và tạo một đoạn tóm tắt văn phong cho bạn.</p>
          <div className="flex gap-4 mb-3">
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="style-source" checked={writingStyleSource === 'file'} onChange={() => setWritingStyleSource('file')} className="h-4 w-4 text-indigo-600 border-gray-500 focus:ring-indigo-500"/> Tải Lên File (.txt)</label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="style-source" checked={writingStyleSource === 'text'} onChange={() => setWritingStyleSource('text')} className="h-4 w-4 text-indigo-600 border-gray-500 focus:ring-indigo-500"/> Nhập Trực Tiếp</label>
          </div>
          {writingStyleSource === 'text' && (
              <InputField label="" id="writingStyleGuide" name="writingStyleGuide" value={settings.writingStyleGuide || ''} onChange={(e) => dispatch({ type: 'UPDATE_FIELD', payload: { field: 'writingStyleGuide', value: e.target.value }})} textarea rows={8} />
          )}
          {writingStyleSource === 'file' && (
              <Button onClick={() => writingStyleFileInputRef.current?.click()} variant='secondary' className='w-full'>Chọn File Văn Phong (.txt)</Button>
          )}
           <input type="file" ref={writingStyleFileInputRef} onChange={handleWritingStyleFileChange} className="hidden" accept=".txt" />
          <Button onClick={handleAnalyzeStyle} isLoading={loadingStates.styleAnalysis} disabled={Object.values(loadingStates).some(s => s)} variant="secondary" className="w-full sm:w-auto mt-3" loadingText="Đang phân tích...">
              Phân Tích
          </Button>
          {analysisResult && (
              <div className="mt-4 space-y-3 p-3 bg-gray-800/50 rounded-md border border-gray-700">
                  <h4 className="font-semibold text-gray-200">Kết quả Phân Tích:</h4>
                  <div className="whitespace-pre-wrap text-sm text-gray-300 p-2 bg-gray-900/50 rounded">{analysisResult.analysis}</div>
                  <Button onClick={handleApplyStyle} variant="secondary" size="sm" className="w-full">Áp Dụng Văn Phong này cho AI</Button>
              </div>
          )}
      </div>

      {/* Story Idea */}
      <div className="border border-blue-500 p-4 rounded-lg bg-gray-800/30">
        <h3 className="text-xl font-semibold text-blue-400 mb-2">{VIETNAMESE.storyIdeaGeneratorSection}</h3>
        <InputField label="" id="storyIdea" name="storyIdea" value={storyIdea} onChange={(e) => setStoryIdea(e.target.value)} textarea rows={4} placeholder={VIETNAMESE.storyIdeaDescriptionPlaceholder} />
        <Button onClick={() => generateFromStoryIdea(storyIdea, settings)} isLoading={loadingStates.fromStory} disabled={Object.values(loadingStates).some(s => s)} variant="primary" className="w-full sm:w-auto mt-3 bg-blue-600 hover:bg-blue-700 focus:ring-blue-500" loadingText={VIETNAMESE.generatingWorldDetails}>
          {VIETNAMESE.generateDetailsFromStoryButton}
        </Button>
      </div>
      
      {/* Fanfiction Section */}
      <div className="border border-teal-500 p-4 rounded-lg bg-gray-800/30">
          <h3 className="text-xl font-semibold text-teal-400 mb-2">{VIETNAMESE.fanficStoryGeneratorSection}</h3>
          
          <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">{VIETNAMESE.fanficSourceTypeLabel}</label>
              <div className="flex gap-x-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                          type="radio" 
                          name="fanfic-source" 
                          value="name" 
                          checked={fanficSourceType === 'name'} 
                          onChange={() => setFanficSourceType('name')} 
                          className="h-4 w-4 text-indigo-600 border-gray-500 focus:ring-indigo-500"
                      />
                      {VIETNAMESE.fanficSourceTypeName}
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                          type="radio" 
                          name="fanfic-source" 
                          value="file" 
                          checked={fanficSourceType === 'file'} 
                          onChange={() => setFanficSourceType('file')} 
                          className="h-4 w-4 text-indigo-600 border-gray-500 focus:ring-indigo-500"
                      />
                      {VIETNAMESE.fanficSourceTypeFile}
                  </label>
              </div>
          </div>

          {fanficSourceType === 'name' ? (
              <InputField label={VIETNAMESE.fanficStoryNameLabel} id="fanficStoryName" value={fanficStoryName} onChange={(e) => setFanficStoryName(e.target.value)} placeholder={VIETNAMESE.fanficStoryNamePlaceholder} />
          ) : (
              <div className="mb-4">
                  <p className="block text-sm font-medium text-gray-300 mb-1">{VIETNAMESE.fanficFileUploadLabel}</p>
                  <input 
                      type="file" 
                      ref={fanficFileInputRef} 
                      onChange={handleFanficFileChange} 
                      className="hidden" 
                      accept=".txt"
                  />
                  <Button type="button" onClick={() => fanficFileInputRef.current?.click()} variant='secondary' className='w-full'>
                      {fanficFile ? `Đã chọn: ${fanficFile.name}` : 'Chọn File (.txt)'}
                  </Button>
                  {fanficTokenCount !== null && (
                      <p className={`text-xs mt-2 ${fanficTokenCount > MAX_TOKENS_FANFIC ? 'text-red-400 font-bold' : 'text-gray-400'}`}>
                          {VIETNAMESE.tokenCountLabel} {fanficTokenCount.toLocaleString()}
                          {fanficTokenCount > MAX_TOKENS_FANFIC && ` - ${VIETNAMESE.tokenCountExceededError(MAX_TOKENS_FANFIC)}`}
                      </p>
                  )}
              </div>
          )}

          <InputField label={VIETNAMESE.fanficPlayerDescriptionLabel} id="fanficPlayerDescription" value={fanficPlayerDescription} onChange={(e) => setFanficPlayerDescription(e.target.value)} textarea rows={3} placeholder={VIETNAMESE.fanficPlayerDescriptionPlaceholder} />
          <Button onClick={handleGenFanfic} isLoading={loadingStates.fromFanfic} disabled={Object.values(loadingStates).some(s => s)} variant="primary" className="w-full sm:w-auto mt-3 bg-teal-600 hover:bg-teal-700 focus:ring-teal-500" loadingText={VIETNAMESE.generatingFanficDetails}>
              Phân Tích & Tạo Đồng Nhân
          </Button>

          <div className="mt-4 border-t border-gray-700 pt-4">
            <Button variant="ghost" size='sm' onClick={() => setShowOriginalStorySummary(!showOriginalStorySummary)}>
              {showOriginalStorySummary ? '−' : '+'} Thêm/Sửa Tóm Tắt Cốt Truyện Nguyên Tác
            </Button>
            {showOriginalStorySummary && (
               <InputField label="" id="originalStorySummary" name="originalStorySummary" value={settings.originalStorySummary || ''} onChange={(e) => dispatch({ type: 'UPDATE_FIELD', payload: { field: 'originalStorySummary', value: e.target.value }})} textarea rows={8} placeholder={VIETNAMESE.originalStorySummaryPlaceholder} />
            )}
          </div>
      </div>
      
      {showRawResponseModal && rawApiResponseText && ( <Modal isOpen={showRawResponseModal} onClose={() => setShowRawResponseModal(false)} title={VIETNAMESE.rawAiResponseModalTitle}> <pre className="whitespace-pre-wrap break-all bg-gray-700 p-3 rounded-md text-xs text-gray-200 max-h-[60vh] overflow-y-auto custom-scrollbar"> {rawApiResponseText} </pre> </Modal> )}
      {showSentPromptModal && sentWorldGenPrompt && ( <Modal isOpen={showSentPromptModal} onClose={() => setShowSentPromptModal(false)} title={VIETNAMESE.sentPromptModalTitle}> <pre className="whitespace-pre-wrap break-all bg-gray-700 p-3 rounded-md text-xs text-gray-200 max-h-[60vh] overflow-y-auto custom-scrollbar"> {sentWorldGenPrompt} </pre> </Modal> )}
      <ManualInputModal 
        isOpen={isManualInputModalOpen} 
        onClose={() => setIsManualInputModalOpen(false)} 
        onApply={handleApplyManualInput} 
        isLoading={isParsingManual}
      />
    </div>
  );
};

export default AIAssistTab;