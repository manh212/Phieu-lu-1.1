// src/components/gameSetup/AIArchitectModal.tsx
// FIX: Import useState, useRef, and useEffect from React to resolve 'Cannot find name' errors.
import React, { useState, useRef, useEffect } from 'react';
// FIX: Correct import path for types
import { WorldSettings } from '../../types/index';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { generateArchitectResponse } from '../../services';
import { processSetupTags } from '../../utils/setupTagProcessor';
import ToggleSwitch from '../ui/ToggleSwitch';
import { DEFAULT_MODEL_ID, AVAILABLE_MODELS } from '../../constants';

interface AIArchitectModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentSettings: WorldSettings;
    onApplyChanges: (newSettings: WorldSettings) => void;
}

type ArchitectChatMessage = {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    actionTags?: string[];
    applied?: boolean;
};

export const AIArchitectModal: React.FC<AIArchitectModalProps> = ({ isOpen, onClose, currentSettings, onApplyChanges }) => {
    const [history, setHistory] = useState<ArchitectChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isActionModus, setIsActionModus] = useState(true);
    const [useGoogleSearch, setUseGoogleSearch] = useState(false);
    const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL_ID);
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
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);
    
    const handleModelSelect = (modelId: string) => {
        setSelectedModel(modelId);
        setIsModelSelectorOpen(false);
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: ArchitectChatMessage = {
            id: `user-${Date.now()}`,
            sender: 'user',
            text: input.trim(),
        };

        const currentHistory = [...history, userMessage];
        setHistory(currentHistory);
        setInput('');
        setIsLoading(true);

        try {
            const settingsJSON = JSON.stringify(currentSettings, null, 2);
            const chatHistoryString = currentHistory
                .map(msg => `${msg.sender === 'user' ? 'User' : 'AI'}: ${msg.text}`)
                .join('\n');
            
            const rawResponse = await generateArchitectResponse(
                settingsJSON, 
                chatHistoryString, 
                userMessage.text, 
                isActionModus, 
                selectedModel,
                useGoogleSearch
            );
            
            let aiText = rawResponse;
            let tags: string[] = [];

            const changesMatch = rawResponse.match(/<GAME_CHANGES>([\s\S]*?)<\/GAME_CHANGES>/);
            if (changesMatch && changesMatch[1]) {
                const tagsBlock = changesMatch[1].trim();
                aiText = rawResponse.replace(/<GAME_CHANGES>[\s\S]*?<\/GAME_CHANGES>/, '').trim();
                const tagRegex = /\[[^\]]+\]/g;
                let match;
                while ((match = tagRegex.exec(tagsBlock)) !== null) {
                    tags.push(match[0]);
                }
            }

            const aiMessage: ArchitectChatMessage = {
                id: `ai-${Date.now()}`,
                sender: 'ai',
                text: aiText || "Đây là những thay đổi tôi đã chuẩn bị dựa trên yêu cầu của bạn.",
                actionTags: tags.length > 0 ? tags : undefined,
                applied: false,
            };
            setHistory(prev => [...prev, aiMessage]);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Đã có lỗi xảy ra.";
            const aiErrorMessage: ArchitectChatMessage = {
                id: `ai-error-${Date.now()}`,
                sender: 'ai',
                text: `Rất tiếc, đã xảy ra lỗi: ${errorMessage}`,
            };
            setHistory(prev => [...prev, aiErrorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApply = (tags: string[], messageId: string) => {
        try {
            const newSettings = processSetupTags(currentSettings, tags);
            onApplyChanges(newSettings);
            
            // Mark the change as applied in history
            setHistory(prev => prev.map(msg => 
                msg.id === messageId ? { ...msg, applied: true } : msg
            ));

            onClose(); // Close modal after applying changes
        } catch (error) {
            console.error("Error applying setup changes:", error);
            // You might want to show a notification to the user here
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Trò Chuyện với Kiến Trúc Sư AI">
            <div className="flex flex-col h-[70vh]">
                <div className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-4">
                    {history.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-md p-3 rounded-lg shadow-md ${msg.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                {msg.actionTags && (
                                    <div className="mt-3 pt-3 border-t border-gray-500/50">
                                        <p className="text-xs text-amber-300 mb-2">AI đề xuất các thay đổi sau:</p>
                                        <pre className="text-xs bg-gray-800 p-2 rounded max-h-32 overflow-y-auto custom-scrollbar">
                                            {msg.actionTags.join('\n')}
                                        </pre>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            className="w-full mt-2 bg-green-600 hover:bg-green-700"
                                            onClick={() => handleApply(msg.actionTags!, msg.id)}
                                            disabled={isLoading || msg.applied}
                                        >
                                            {msg.applied ? 'Đã Áp Dụng' : 'Áp Dụng Thay Đổi'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="max-w-md p-3 rounded-lg bg-gray-700 text-gray-200">
                                <Spinner size="sm" text="AI đang suy nghĩ..."/>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
                <div className="flex-shrink-0 p-2 border-t border-gray-700">
                    <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="space-y-2">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder="Yêu cầu AI thay đổi thiết lập..."
                            className="w-full p-2 bg-gray-600 border border-gray-500 rounded-md focus:ring-indigo-500 text-white placeholder-gray-400 resize-none text-sm"
                            rows={2}
                            disabled={isLoading}
                        />
                         <div className="flex gap-2 items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                    <ToggleSwitch id="architect-search-toggle" checked={useGoogleSearch} onChange={setUseGoogleSearch} disabled={isLoading} />
                                    <label htmlFor="architect-search-toggle" className="text-xs text-gray-400 cursor-pointer flex items-center gap-1">
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                                         Search
                                    </label>
                                </div>
                                <div className="flex items-center gap-1">
                                    <ToggleSwitch id="architect-mode-toggle" checked={isActionModus} onChange={setIsActionModus} disabled={isLoading} />
                                    <label htmlFor="architect-mode-toggle" className="text-xs text-gray-400 cursor-pointer">{isActionModus ? 'Hành Động' : 'Thảo Luận'}</label>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative" ref={modelSelectorRef}>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        className="!p-2"
                                        onClick={() => setIsModelSelectorOpen(prev => !prev)}
                                        disabled={isLoading}
                                        title="Chọn model Gemini"
                                        aria-haspopup="true"
                                        aria-expanded={isModelSelectorOpen}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.532 1.532 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.532 1.532 0 01-.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                                    </Button>
                                    {isModelSelectorOpen && (
                                        <div className="absolute bottom-full right-0 mb-2 w-56 bg-gray-700 rounded-lg shadow-lg z-[70] border border-gray-600">
                                            <ul className="py-1" role="menu">
                                                {AVAILABLE_MODELS.map(model => (
                                                    <li key={model.id} role="none">
                                                        <button
                                                            type="button"
                                                            role="menuitem"
                                                            className={`w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-indigo-500 ${selectedModel === model.id ? 'bg-indigo-600 font-semibold' : ''}`}
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
                                <Button type="submit" disabled={isLoading || !input.trim()}>Gửi</Button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </Modal>
    );
};