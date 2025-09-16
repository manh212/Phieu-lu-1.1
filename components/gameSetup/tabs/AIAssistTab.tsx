
import React, { ChangeEvent, useRef, useState } from 'react';
import { useGameSetup } from '../../../contexts/GameSetupContext';
import { useAIAssist } from '../../../hooks/useAIAssist';
import Button from '../../ui/Button';
import InputField from '../../ui/InputField';
import Spinner from '../../ui/Spinner';
import Modal from '../../ui/Modal';
import { VIETNAMESE, MAX_TOKENS_FANFIC } from '../../../constants';
import CollapsibleSection from '../../ui/CollapsibleSection';

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
  
  const [openSections, setOpenSections] = useState({
    style: false,
    story: false,
    fanfic: false,
  });

  const fanficFileInputRef = useRef<HTMLInputElement>(null);
  const writingStyleFileInputRef = useRef<HTMLInputElement>(null);
  
  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

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
        <h3 className="text-xl font-semibold text-purple-400 mb-3">Kiến Trúc Sư AI</h3>
        <Button onClick={() => setIsArchitectModalOpen(true)} variant="primary" className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 focus:ring-purple-500">
          Trò chuyện với Kiến Trúc sư AI
        </Button>
      </div>

      {/* Autocomplete */}
      <div className="border border-green-500 p-4 rounded-lg bg-gray-800/30">
        <h3 className="text-xl font-semibold text-green-400 mb-3">Hoàn Thiện Tự Động</h3>
        <Button onClick={() => generateCompletion(settings)} isLoading={loadingStates.completion} disabled={Object.values(loadingStates).some(s => s)} variant="primary" className="w-full sm:w-auto bg-green-600 hover:bg-green-700 focus:ring-green-500" loadingText="AI đang hoàn thiện...">
          AI Hoàn Thiện Các Trường Trống
        </Button>
      </div>
      
      {/* Style Analysis */}
      <CollapsibleSection title="AI Phản Hồi & Phân Tích Văn Phong" isOpen={openSections.style} onToggle={() => toggleSection('style')}>
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
      </CollapsibleSection>

      {/* Story Idea */}
      <CollapsibleSection title={VIETNAMESE.storyIdeaGeneratorSection} isOpen={openSections.story} onToggle={() => toggleSection('story')}>
        <InputField label="" id="storyIdea" name="storyIdea" value={storyIdea} onChange={(e) => setStoryIdea(e.target.value)} textarea rows={4} placeholder={VIETNAMESE.storyIdeaDescriptionPlaceholder} />
        <Button onClick={() => generateFromStoryIdea(storyIdea, settings)} isLoading={loadingStates.fromStory} disabled={Object.values(loadingStates).some(s => s)} variant="primary" className="w-full sm:w-auto mt-3 bg-blue-600 hover:bg-blue-700 focus:ring-blue-500" loadingText={VIETNAMESE.generatingWorldDetails}>
          {VIETNAMESE.generateDetailsFromStoryButton}
        </Button>
      </CollapsibleSection>
      
      {/* Fanfiction Section */}
      <CollapsibleSection title={VIETNAMESE.fanficStoryGeneratorSection} isOpen={openSections.fanfic} onToggle={() => toggleSection('fanfic')}>
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
      </CollapsibleSection>
      
      {showRawResponseModal && rawApiResponseText && ( <Modal isOpen={showRawResponseModal} onClose={() => setShowRawResponseModal(false)} title={VIETNAMESE.rawAiResponseModalTitle}> <pre className="whitespace-pre-wrap break-all bg-gray-700 p-3 rounded-md text-xs text-gray-200 max-h-[60vh] overflow-y-auto custom-scrollbar"> {rawApiResponseText} </pre> </Modal> )}
      {showSentPromptModal && sentWorldGenPrompt && ( <Modal isOpen={showSentPromptModal} onClose={() => setShowSentPromptModal(false)} title={VIETNAMESE.sentPromptModalTitle}> <pre className="whitespace-pre-wrap break-all bg-gray-700 p-3 rounded-md text-xs text-gray-200 max-h-[60vh] overflow-y-auto custom-scrollbar"> {sentWorldGenPrompt} </pre> </Modal> )}
    </div>
  );
};

export default AIAssistTab;
