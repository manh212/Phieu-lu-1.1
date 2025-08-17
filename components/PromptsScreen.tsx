
import React, { useState } from 'react';
import { useGame } from '../hooks/useGame';
import { GameScreen } from '../types';
import Button from './ui/Button';
import InputField from './ui/InputField';
import { VIETNAMESE } from '../constants';

const PromptsScreen: React.FC = () => {
    const { knowledgeBase, setKnowledgeBase, setCurrentScreen } = useGame();
    const [newPrompt, setNewPrompt] = useState('');

    const userPrompts = knowledgeBase.userPrompts || [];

    const handleAddPrompt = () => {
        if (newPrompt.trim()) {
            setKnowledgeBase(prevKb => ({
                ...prevKb,
                userPrompts: [...(prevKb.userPrompts || []), newPrompt.trim()]
            }));
            setNewPrompt('');
        }
    };

    const handleRemovePrompt = (indexToRemove: number) => {
        setKnowledgeBase(prevKb => ({
            ...prevKb,
            userPrompts: (prevKb.userPrompts || []).filter((_, index) => index !== indexToRemove)
        }));
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-800 p-4 sm:p-6">
            <div className="w-full max-w-2xl bg-gray-900 shadow-2xl rounded-xl p-6 sm:p-8">
                <header className="mb-6 flex justify-between items-center">
                    <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-500">
                        Lời Nhắc Cho AI
                    </h1>
                    <Button variant="secondary" onClick={() => setCurrentScreen(GameScreen.Gameplay)}>
                        {VIETNAMESE.goBackButton}
                    </Button>
                </header>
                
                <div className="space-y-4">
                    <p className="text-sm text-gray-400">
                        Thêm các lời nhắc hoặc quy tắc mà bạn muốn AI luôn tuân theo trong suốt quá trình chơi. 
                        Ví dụ: "Nhân vật chính luôn nói chuyện một cách lịch sự", "Không bao giờ mô tả cảnh giết chóc động vật", "Luôn ưu tiên tìm kiếm cơ duyên để mạnh lên".
                    </p>
                    
                    {/* Add new prompt section */}
                    <div className="flex gap-2">
                        <InputField
                            label=""
                            id="new-prompt-input"
                            value={newPrompt}
                            onChange={(e) => setNewPrompt(e.target.value)}
                            placeholder="Nhập lời nhắc mới tại đây..."
                            className="flex-grow !mb-0"
                        />
                        <Button onClick={handleAddPrompt} disabled={!newPrompt.trim()}>
                            Thêm
                        </Button>
                    </div>

                    {/* List of current prompts */}
                    <div className="space-y-2 pt-4 border-t border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-300">Các lời nhắc hiện tại:</h2>
                        {userPrompts.length > 0 ? (
                            <ul className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
                                {userPrompts.map((prompt, index) => (
                                    <li key={index} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                                        <p className="text-gray-200 text-sm flex-grow mr-4">{prompt}</p>
                                        <Button variant="danger" size="sm" onClick={() => handleRemovePrompt(index)}>
                                            Xóa
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500 italic text-center py-4">Chưa có lời nhắc nào.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PromptsScreen;
