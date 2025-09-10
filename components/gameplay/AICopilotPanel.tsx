import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useGame } from '../../hooks/useGame';
import OffCanvasPanel from '../ui/OffCanvasPanel';
import Button from '../ui/Button';
import { GameMessage } from '../../types/index';
import Spinner from '../ui/Spinner';
import { parseTagValue } from '../../utils/gameLogicUtils';
import ToggleSwitch from '../ui/ToggleSwitch';
import { AVAILABLE_MODELS } from '../../constants';

interface AICopilotPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper to parse tags for a user-friendly summary
const parseActionTagsForSummary = (tags: string[]): React.ReactNode[] => {
    return tags.map((tag, index) => {
        const match = tag.match(/\[(.*?):(.*)\]/s);
        if (!match) return <li key={index} className="text-gray-400">Thẻ không hợp lệ: {tag}</li>;

        const tagName = match[1].trim().toUpperCase();
        const params = parseTagValue(match[2].trim());
        const name = params.name || params.title || 'Không rõ';

        let summary = '';
        let colorClass = 'text-gray-300';
        let icon = 'ℹ️';

        if (tagName.includes('ADD') || tagName.includes('ACQUIRED') || tagName.startsWith('NPC') && !tagName.includes('UPDATE')) {
            colorClass = 'text-green-400';
            icon = '➕';
            if (tagName.includes('ITEM')) summary = `Thêm vật phẩm: ${name} (x${params.quantity || 1})`;
            else if (tagName.includes('NPC')) summary = `Thêm NPC: ${name}`;
            else if (tagName.includes('SKILL')) summary = `Thêm kỹ năng: ${name}`;
            else if (tagName === 'USER_PROMPT_ADD') summary = `Thêm lời nhắc mới cho AI: "${params.text}"`;
            else summary = `Thêm mới: ${name}`;
        } else if (tagName.includes('UPDATE')) {
            colorClass = 'text-yellow-400';
            icon = '🔄';
            if (tagName.includes('STATS')) {
                const changes = Object.entries(params).map(([key, value]) => `${key} ${value}`).join(', ');
                summary = `Cập nhật chỉ số: ${changes}`;
            } else if (tagName === 'REWRITE_TURN') {
                colorClass = 'text-cyan-400';
                icon = '✍️';
                summary = `Viết lại lượt kể với chỉ dẫn mới.`;
            } else {
                summary = `Cập nhật: ${name}`;
            }
        } else if (tagName.includes('REMOVE') || tagName.includes('DELETE')) {
            colorClass = 'text-red-400';
            icon = '➖';
            summary = `Xóa: ${name}`;
        } else if (tagName.includes('EVENT')) {
            colorClass = 'text-cyan-400';
            icon = '🗓️';
            summary = `Sự kiện: ${params.title}`;
        } else if (tagName.includes('STAGED_ACTION')) {
            colorClass = 'text-purple-400';
            icon = '🎭';
            summary = `Đạo diễn: ${params.description}`;
        }
        else {
            summary = `Hành động: ${tagName}`;
        }

        return (
            <li key={index} className={`flex items-start ${colorClass}`}>
                <span className="mr-2">{icon}</span>
                <span>{summary}</span>
            </li>
        );
    });
};


const AICopilotPanel: React.FC<AICopilotPanelProps> = ({ isOpen, onClose }) => {
  const {
    handleCopilotQuery,
    aiCopilotMessages,
    isLoadingApi,
    handleProcessDebugTags,
    showNotification,
    sentPromptsLog, // Get the log of sent prompts
    handleRewriteTurn, // Get the new function from context
    resetCopilotConversation,
    knowledgeBase,
    setKnowledgeBase,
  } = useGame();

  const [userInput, setUserInput] = useState('');
  const [isActionModus, setIsActionModus] = useState(true);
  const [useGoogleSearch, setUseGoogleSearch] = useState(false);
  const [appliedChanges, setAppliedChanges] = useState<Set<string>>(new Set());
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const modelSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
            setIsModelSelectorOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [modelSelectorRef]);

  useEffect(() => {
    if (isOpen) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiCopilotMessages, isOpen]);
  
  const activeCopilotConfig = useMemo(() => {
    if (!knowledgeBase.aiCopilotConfigs || !knowledgeBase.activeAICopilotConfigId) return null;
    return knowledgeBase.aiCopilotConfigs.find(c => c.id === knowledgeBase.activeAICopilotConfigId);
  }, [knowledgeBase.aiCopilotConfigs, knowledgeBase.activeAICopilotConfigId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim()) {
      handleCopilotQuery(userInput.trim(), undefined, isActionModus, activeCopilotConfig?.model, useGoogleSearch);
      setUserInput('');
    }
  };
  
  const handleReset = () => {
    if (window.confirm("Bạn có chắc chắn muốn làm mới cuộc trò chuyện này không? Toàn bộ lịch sử sẽ bị xóa.")) {
        resetCopilotConversation();
    }
  };

  const handleQuickAction = (question: string, context?: string) => {
    handleCopilotQuery(question, context, isActionModus, activeCopilotConfig?.model, useGoogleSearch);
    setUserInput('');
  };

  const handleApplyChanges = async (tags: string[], messageId: string) => {
    setAppliedChanges(prev => new Set(prev).add(messageId));

    const rewriteTag = tags.find(t => t.toUpperCase().startsWith('[REWRITE_TURN'));
    
    if (rewriteTag) {
        const params = parseTagValue(rewriteTag.substring(rewriteTag.indexOf(':') + 1, rewriteTag.lastIndexOf(']')).trim());
        const directive = params.prompt;
        if (directive) {
            await handleRewriteTurn(directive);
            showNotification("Đang yêu cầu AI viết lại lượt...", "info");
            onClose(); // Close the panel to see the result
            return;
        } else {
            showNotification("Lỗi: Thẻ viết lại lượt không có chỉ dẫn.", "error");
        }
    }

    // If not a rewrite tag, process normally
    const narrationForProcessing = "Thay đổi được áp dụng từ Siêu Trợ Lý AI.";
    const tagsString = tags.join('\n');
    await handleProcessDebugTags(narrationForProcessing, tagsString);
    showNotification("Các thay đổi từ Siêu Trợ Lý đã được áp dụng!", "success");
  };

  const handleModelSelect = (modelId: string) => {
    if (!activeCopilotConfig) return;

    setKnowledgeBase(prevKb => {
        const newKb = JSON.parse(JSON.stringify(prevKb));
        const configToUpdate = newKb.aiCopilotConfigs.find((c: any) => c.id === newKb.activeAICopilotConfigId);
        if (configToUpdate) {
            configToUpdate.model = modelId;
        }
        return newKb;
    });
    setIsModelSelectorOpen(false);
  };
  
  const quickActions = [
      { label: "Túi đồ của tôi có gì?", query: "Liệt kê các vật phẩm trong túi đồ của tôi." },
      { label: "Nhiệm vụ của tôi là gì?", query: "Liệt kê tất cả các nhiệm vụ tôi đang làm." },
      { label: "Các NPC gần đây?", query: "Những NPC nào đang ở cùng địa điểm với tôi?" },
      { label: "Tại sao AI lại kể như vậy?", query: "Phân tích prompt cuối cùng và giải thích tại sao AI lại có hành động/lời kể như vậy.", contextProvider: () => sentPromptsLog[0] || "Không có prompt nào được ghi lại." },
  ];

  return (
    <OffCanvasPanel isOpen={isOpen} onClose={onClose} title="Siêu Trợ Lý AI" position="right">
      <div className="flex flex-col h-full">
        <div className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-4">
          {(aiCopilotMessages || []).map((msg) => (
            <div key={msg.id} className={`flex ${msg.isPlayerInput ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs md:max-w-md p-3 rounded-lg shadow ${msg.isPlayerInput ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                <p className="text-sm whitespace-pre-wrap">{typeof msg.content === 'string' ? msg.content : null}</p>
                 {msg.groundingMetadata && msg.groundingMetadata.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-500/50">
                        <h5 className="text-xs font-semibold text-gray-400 mb-1">Nguồn Tham Khảo:</h5>
                        <ul className="space-y-1 text-xs">
                            {msg.groundingMetadata.map((source, idx) => source.web && (
                                <li key={idx} className="truncate">
                                    <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline" title={source.web.uri}>
                                        {idx + 1}. {source.web.title || source.web.uri}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {msg.actionTags && msg.actionTags.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-500/50 bg-gray-800/50 -m-3 p-3 rounded-b-lg">
                    <h4 className="text-sm font-semibold text-amber-300 mb-2">Đề Xuất Thay Đổi</h4>
                    <ul className="text-xs space-y-1">
                        {parseActionTagsForSummary(msg.actionTags)}
                    </ul>
                    <Button 
                        variant="primary" 
                        size="sm" 
                        className="w-full mt-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-500"
                        onClick={() => handleApplyChanges(msg.actionTags!, msg.id)}
                        disabled={isLoadingApi || appliedChanges.has(msg.id)}
                    >
                        {appliedChanges.has(msg.id) ? 'Đã Áp Dụng' : 'Áp Dụng Thay Đổi'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoadingApi && (
              <div className="flex justify-start">
                   <div className="max-w-xs md:max-w-md p-3 rounded-lg bg-gray-700 text-gray-200">
                      <Spinner size="sm" text="AI đang suy nghĩ..."/>
                   </div>
              </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div className="flex-shrink-0 p-2 border-t border-gray-700 space-y-2">
            <div className="flex justify-end">
                <Button
                    type="button"
                    variant="secondary"
                    className="!p-2"
                    onClick={handleReset}
                    disabled={isLoadingApi}
                    title="Làm mới cuộc trò chuyện"
                >
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.667 0l3.181-3.183m-4.991-2.691v4.992h-4.992m0 0l-3.181-3.183a8.25 8.25 0 0111.667 0l3.181 3.183" />
                    </svg>
                </Button>
            </div>
            <div className="grid grid-cols-2 gap-1">
                {quickActions.map(action => (
                    <Button key={action.label} variant="ghost" size="sm" className="!p-1.5 text-xs" onClick={() => handleQuickAction(action.query, action.contextProvider ? action.contextProvider() : undefined)} disabled={isLoadingApi}>
                        {action.label}
                    </Button>
                ))}
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Hỏi hoặc ra lệnh cho AI..."
                  className="w-full p-2 bg-gray-600 border border-gray-500 rounded-md focus:ring-indigo-500 text-white placeholder-gray-400 resize-none text-sm"
                  rows={3}
                  disabled={isLoadingApi}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
                />
                <div className="flex gap-2 items-center justify-end">
                    <div className="flex items-center gap-1 mr-auto">
                        <ToggleSwitch
                            id="copilot-search-toggle"
                            checked={useGoogleSearch}
                            onChange={setUseGoogleSearch}
                            disabled={isLoadingApi}
                        />
                        <label htmlFor="copilot-search-toggle" className="text-xs text-gray-400 cursor-pointer flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                            Search
                        </label>
                    </div>
                    <div className="relative" ref={modelSelectorRef}>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="!p-2"
                            onClick={() => setIsModelSelectorOpen(prev => !prev)}
                            disabled={isLoadingApi}
                            title="Chọn model Gemini"
                            aria-haspopup="true"
                            aria-expanded={isModelSelectorOpen}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.532 1.532 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.532 1.532 0 01-.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                        </Button>
                        {isModelSelectorOpen && (
                            <div className="absolute bottom-full right-0 mb-2 w-56 bg-gray-700 rounded-lg shadow-lg z-20 border border-gray-600">
                                <ul className="py-1" role="menu">
                                    {AVAILABLE_MODELS.map(model => (
                                        <li key={model.id} role="none">
                                            <button
                                                type="button"
                                                role="menuitem"
                                                className={`w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-indigo-500 ${activeCopilotConfig?.model === model.id ? 'bg-indigo-600 font-semibold' : ''}`}
                                                onClick={() => handleModelSelect(model.id)}
                                            >
                                                {model.name}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <ToggleSwitch
                            id="copilot-mode-toggle"
                            checked={isActionModus}
                            onChange={setIsActionModus}
                            disabled={isLoadingApi}
                        />
                        <label htmlFor="copilot-mode-toggle" className="text-xs text-gray-400 cursor-pointer">
                            {isActionModus ? 'Hành Động' : 'Thảo Luận'}
                        </label>
                    </div>
                    <Button type="submit" disabled={isLoadingApi || !userInput.trim()}>Gửi</Button>
                </div>
            </form>
        </div>
      </div>
    </OffCanvasPanel>
  );
};

export default AICopilotPanel;