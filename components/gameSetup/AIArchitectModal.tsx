// src/components/gameSetup/AIArchitectModal.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
// FIX: Correct import path for types
import { WorldSettings } from '../../types/index';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { generateArchitectResponse } from '../../services';
import { processSetupTags } from '../../utils/setupTagProcessor';

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
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);

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
            
            const rawResponse = await generateArchitectResponse(settingsJSON, chatHistoryString, userMessage.text);
            
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
                    <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder="Yêu cầu AI thay đổi thiết lập..."
                            className="flex-grow p-2 bg-gray-600 border border-gray-500 rounded-md focus:ring-indigo-500 text-white placeholder-gray-400 resize-none text-sm"
                            rows={2}
                            disabled={isLoading}
                        />
                        <Button type="submit" disabled={isLoading || !input.trim()}>Gửi</Button>
                    </form>
                </div>
            </div>
        </Modal>
    );
};