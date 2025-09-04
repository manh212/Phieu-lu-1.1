
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useGame } from '../../hooks/useGame';
import OffCanvasPanel from '../ui/OffCanvasPanel';
import Button from '../ui/Button';
import InputField from '../ui/InputField';
import { GameMessage } from '../../types';
import Spinner from '../ui/Spinner';
import Modal from '../ui/Modal';
import { AVAILABLE_MODELS } from '../../constants';
import { getApiSettings } from '../../services/geminiService';

interface AICopilotPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const AICopilotPanel: React.FC<AICopilotPanelProps> = ({ isOpen, onClose }) => {
  const {
    handleCopilotQuery,
    aiCopilotMessages,
    knowledgeBase,
    setKnowledgeBase,
    isLoadingApi,
    sentCopilotPromptsLog,
    handleProcessDebugTags,
    showNotification,
  } = useGame();

  const [mode, setMode] = useState<'chat' | 'promptEditor'>('chat');
  const [userInput, setUserInput] = useState('');
  const [editingPrompt, setEditingPrompt] = useState<{ index: number; text: string } | null>(null);
  const [showLastPrompt, setShowLastPrompt] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Ensure there's a default copilot config if one doesn't exist on older saves
    if (isOpen && (!knowledgeBase.aiCopilotConfigs || knowledgeBase.aiCopilotConfigs.length === 0)) {
        const DEFAULT_COPILOT_CONFIG_ID = 'default-copilot';
        const { model: defaultModel } = getApiSettings();
        const newDefaultConfig = {
            id: DEFAULT_COPILOT_CONFIG_ID,
            name: 'Siêu Trợ Lý Mặc Định',
            model: defaultModel,
            systemInstruction: ''
        };
        setKnowledgeBase(prevKb => ({
            ...prevKb,
            aiCopilotConfigs: [newDefaultConfig],
            activeAICopilotConfigId: DEFAULT_COPILOT_CONFIG_ID
        }));
    }
  }, [isOpen, knowledgeBase.aiCopilotConfigs, setKnowledgeBase]);

  useEffect(() => {
    if (isOpen) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiCopilotMessages, isOpen]);

  const activeCopilotConfig = useMemo(() => {
    return knowledgeBase.aiCopilotConfigs.find(c => c.id === knowledgeBase.activeAICopilotConfigId);
  }, [knowledgeBase.aiCopilotConfigs, knowledgeBase.activeAICopilotConfigId]);

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newModel = e.target.value;
      if (activeCopilotConfig) {
          setKnowledgeBase(prevKb => {
              const newConfigs = prevKb.aiCopilotConfigs.map(c => 
                  c.id === activeCopilotConfig.id ? { ...c, model: newModel } : c
              );
              return { ...prevKb, aiCopilotConfigs: newConfigs };
          });
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim()) {
      handleCopilotQuery(userInput.trim());
      setUserInput('');
    }
  };

  const handleQuickAction = (question: string, context?: string) => {
    handleCopilotQuery(question, context);
  };

  const handleApplyChanges = async (tags: string[]) => {
    const narrationForProcessing = "Thay đổi được áp dụng từ Siêu Trợ Lý AI.";
    const tagsString = tags.join('\n');
    await handleProcessDebugTags(narrationForProcessing, tagsString);
    showNotification("Các thay đổi từ Siêu Trợ Lý đã được áp dụng!", "success");
  };

  // Prompt Editor Handlers
  const handleAddPrompt = () => {
    if (userInput.trim()) {
      setKnowledgeBase(prevKb => ({
        ...prevKb,
        userPrompts: [...(prevKb.userPrompts || []), userInput.trim()]
      }));
      setUserInput('');
    }
  };

  const handleUpdatePrompt = () => {
    if (editingPrompt) {
      setKnowledgeBase(prevKb => {
        const newPrompts = [...(prevKb.userPrompts || [])];
        newPrompts[editingPrompt.index] = editingPrompt.text;
        return { ...prevKb, userPrompts: newPrompts };
      });
      setEditingPrompt(null);
    }
  };

  const handleRemovePrompt = (indexToRemove: number) => {
    setKnowledgeBase(prevKb => ({
      ...prevKb,
      userPrompts: (prevKb.userPrompts || []).filter((_, index) => index !== indexToRemove)
    }));
  };

  const renderChatMode = () => (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-4">
        <p className="text-xs text-center text-gray-400 bg-gray-700/50 p-2 rounded-md">Đây là Siêu Trợ Lý AI. Bạn có thể hỏi về trạng thái game, debug prompt, hoặc yêu cầu AI **trực tiếp thay đổi game** (ví dụ: "thêm một NPC mới", "cho tôi một thanh kiếm").</p>
        {(aiCopilotMessages || []).map((msg, index) => (
          <div key={msg.id || index} className={`flex ${msg.isPlayerInput ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${msg.type === 'error' ? 'bg-red-800 text-red-100' : (msg.isPlayerInput ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-200')}`}>
              {/* FIX: Ensure content is a string before rendering */}
              <p className="text-sm whitespace-pre-wrap">{typeof msg.content === 'string' ? msg.content : null}</p>
              {msg.actionTags && msg.actionTags.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-500/50">
                  <p className="text-xs text-amber-300 mb-2">AI đề xuất các thay đổi sau:</p>
                  <pre className="text-xs bg-gray-800 p-2 rounded max-h-24 overflow-y-auto custom-scrollbar">
                      {msg.actionTags.join('\n')}
                  </pre>
                  <Button 
                      variant="primary" 
                      size="sm" 
                      className="w-full mt-2 bg-green-600 hover:bg-green-700"
                      onClick={() => handleApplyChanges(msg.actionTags!)}
                      disabled={isLoadingApi}
                  >
                      Áp Dụng Thay Đổi
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoadingApi && (
            <div className="flex justify-start">
                 <div className="max-w-xs md:max-w-md p-3 rounded-lg bg-gray-700 text-gray-200">
                    <Spinner size="sm" text="AI đang phân tích..."/>
                 </div>
            </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="flex-shrink-0 p-2 border-t border-gray-700 space-y-2">
        <div className="flex items-center gap-2 text-xs">
            <label htmlFor="copilot-model-select" className="text-gray-400 flex-shrink-0">Model:</label>
            <select
                id="copilot-model-select"
                value={activeCopilotConfig?.model || ''}
                onChange={handleModelChange}
                disabled={!activeCopilotConfig || isLoadingApi}
                className="flex-grow p-1 bg-gray-600 border border-gray-500 rounded-md focus:ring-indigo-500 text-white text-xs"
            >
                {AVAILABLE_MODELS.map(model => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                ))}
            </select>
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Hỏi AI hoặc yêu cầu thay đổi game..."
            className="flex-grow p-2 bg-gray-600 border border-gray-500 rounded-md focus:ring-indigo-500 text-white placeholder-gray-400 resize-none text-sm"
            rows={2}
            disabled={isLoadingApi}
          />
          <Button type="submit" disabled={isLoadingApi || !userInput.trim()}>Gửi</Button>
        </form>
      </div>
    </div>
  );

  const renderPromptEditorMode = () => (
    <div className="flex flex-col h-full p-2 space-y-4">
      <Button variant="ghost" size="sm" onClick={() => setMode('chat')}>← Quay lại Chat</Button>
      <div className="flex-grow overflow-y-auto custom-scrollbar space-y-2">
        <h3 className="text-lg font-semibold">Chỉnh Sửa Lời Nhắc Cho AI Kể Chuyện</h3>
        {(knowledgeBase.userPrompts || []).length > 0 ? (
          (knowledgeBase.userPrompts || []).map((prompt, index) => (
            <div key={index} className="bg-gray-700 p-2 rounded-md">
              {editingPrompt?.index === index ? (
                <div className="space-y-2">
                  <textarea
                    value={editingPrompt.text}
                    onChange={(e) => setEditingPrompt({ ...editingPrompt, text: e.target.value })}
                    className="w-full p-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm"
                    rows={3}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => setEditingPrompt(null)}>Hủy</Button>
                    <Button size="sm" variant="primary" onClick={handleUpdatePrompt}>Lưu</Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-200 flex-grow mr-2">{prompt}</p>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="sm" variant="secondary" onClick={() => setEditingPrompt({ index, text: prompt })}>Sửa</Button>
                    <Button size="sm" variant="danger" onClick={() => handleRemovePrompt(index)}>Xóa</Button>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-gray-400 italic">Chưa có lời nhắc nào.</p>
        )}
      </div>
      <div className="flex-shrink-0 p-2 border-t border-gray-700">
        <form onSubmit={(e) => { e.preventDefault(); handleAddPrompt(); }} className="flex gap-2">
          <InputField
            label=""
            id="new-prompt-input"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Thêm lời nhắc mới..."
            className="flex-grow !mb-0"
          />
          <Button type="submit" disabled={!userInput.trim()}>Thêm</Button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <OffCanvasPanel
        isOpen={isOpen}
        onClose={onClose}
        title="Siêu Trợ Lý AI"
        position="right"
      >
        {mode === 'chat' ? renderChatMode() : renderPromptEditorMode()}
      </OffCanvasPanel>

      {showLastPrompt && (sentCopilotPromptsLog || []).length > 0 && (
          <Modal
              isOpen={showLastPrompt}
              onClose={() => setShowLastPrompt(false)}
              title="Bối Cảnh Cuối Cùng Gửi Đến Trợ Lý AI"
          >
              <pre className="whitespace-pre-wrap break-all bg-gray-700 p-3 rounded-md text-xs text-gray-200 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  {sentCopilotPromptsLog[0]}
              </pre>
          </Modal>
      )}
    </>
  );
};

export default AICopilotPanel;
