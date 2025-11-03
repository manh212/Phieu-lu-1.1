import React, { useState } from 'react';
import OffCanvasPanel from '../ui/OffCanvasPanel';
import VoiceChatTab from './tabs/VoiceChatTab';
import TextChatTab from './tabs/TextChatTab';
import Button from '../ui/Button';
import { useGame } from '../../hooks/useGame';

interface AICopilotPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const AICopilotPanel: React.FC<AICopilotPanelProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'voice' | 'text'>('voice');
  const { resetCopilotConversation, resetArchitectConversation } = useGame();

  const activeTabStyle = "flex-1 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm border-indigo-500 text-indigo-400";
  const inactiveTabStyle = "flex-1 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500";

  const handleRefresh = () => {
    if (activeTab === 'voice') {
      resetCopilotConversation();
    } else {
      resetArchitectConversation();
    }
  };

  return (
    <OffCanvasPanel isOpen={isOpen} onClose={onClose} title="Trợ Lý AI Đa Năng" position="right">
      <div className="flex flex-col h-full">
        {/* Tab Navigation */}
        <div className="flex-shrink-0 border-b border-gray-700">
            <div className="flex items-center">
                <nav className="-mb-px flex flex-grow" aria-label="Tabs">
                    <button onClick={() => setActiveTab('voice')} className={activeTab === 'voice' ? activeTabStyle : inactiveTabStyle}>
                    Giọng Nói 🎙️
                    </button>
                    <button onClick={() => setActiveTab('text')} className={activeTab === 'text' ? activeTabStyle : inactiveTabStyle}>
                    Văn Bản ⌨️
                    </button>
                </nav>
                <Button
                    variant="ghost"
                    size="sm"
                    className="mr-2 !py-1 !px-2 flex-shrink-0"
                    title="Làm mới cuộc trò chuyện"
                    onClick={handleRefresh}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 11.664 0l3.181-3.183m-4.991-2.691L7.985 5.942m7.042 2.692L19.015 5.94m-7.043 2.691L14.985 19.643" />
                    </svg>
                </Button>
            </div>
        </div>


        {/* Tab Content */}
        <div className="flex-grow min-h-0">
          {activeTab === 'voice' && <VoiceChatTab />}
          {activeTab === 'text' && <TextChatTab />}
        </div>
      </div>
    </OffCanvasPanel>
  );
};

export default AICopilotPanel;