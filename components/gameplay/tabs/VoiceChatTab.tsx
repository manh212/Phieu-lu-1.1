import React, { useRef, useEffect } from 'react';
import { useGame } from '../../../hooks/useGame';
import Button from '../../ui/Button';
import Spinner from '../../ui/Spinner';
import type { GameMessage } from '../../../types/game';

// A simple wave visualizer placeholder
const AudioVisualizer: React.FC<{ status: 'listening' | 'speaking' | 'idle' | 'connecting' }> = ({ status }) => {
    const statusText = {
        listening: 'Đang lắng nghe...',
        speaking: 'AI đang nói...',
        idle: 'Nhấn để bắt đầu cuộc gọi',
        connecting: 'Đang kết nối...'
    };
    const colorClass = {
        listening: 'bg-green-500',
        speaking: 'bg-blue-500',
        idle: 'bg-gray-600',
        connecting: 'bg-yellow-500'
    };

    return (
        <div className="flex flex-col items-center justify-center p-4 bg-gray-800/50 rounded-lg border border-gray-700">
             <style>{`
                @keyframes pulse {
                    0% { transform: scaleY(1); }
                    50% { transform: scaleY(0.4); }
                    100% { transform: scaleY(1); }
                }
            `}</style>
            <div className="flex justify-center items-center h-10 space-x-1">
                {[...Array(5)].map((_, i) => (
                    <div
                        key={i}
                        className={`w-1.5 rounded-full ${colorClass[status]} transition-transform duration-300`}
                        style={{
                            animation: status !== 'idle' ? `pulse ${0.8 + i*0.2}s infinite alternate ease-in-out` : 'none',
                            transform: status === 'idle' ? 'scaleY(0.2)' : 'scaleY(1)',
                        }}
                    />
                ))}
            </div>
            <p className="text-sm text-gray-400 mt-2">{statusText[status]}</p>
        </div>
    );
};

const VoiceChatTab: React.FC = () => {
  const {
    aiCopilotMessages,
    isLoadingApi,
    startCopilotSession,
    endCopilotSession,
    copilotSessionState,
  } = useGame();

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiCopilotMessages]);
  
  const getVisualizerStatus = (): 'listening' | 'speaking' | 'idle' | 'connecting' => {
      if (copilotSessionState === 'connecting') return 'connecting';
      if (copilotSessionState !== 'connected') return 'idle';
      
      const lastMessage = aiCopilotMessages.length > 0 ? aiCopilotMessages[aiCopilotMessages.length - 1] : null;
      if (lastMessage && !lastMessage.isPlayerInput && !lastMessage.isFinal) {
          return 'speaking';
      }
      return 'listening';
  }

  return (
    <div className="flex flex-col h-full pt-4">
      {/* Call Controls & Status */}
      <div className="flex-shrink-0 px-2 space-y-3">
           <AudioVisualizer status={getVisualizerStatus()} />
          <div className="flex gap-2">
              {copilotSessionState !== 'connected' ? (
                  <Button 
                      variant="primary" 
                      className="w-full bg-green-600 hover:bg-green-700 focus:ring-green-500" 
                      onClick={startCopilotSession} 
                      isLoading={copilotSessionState === 'connecting'}
                      disabled={isLoadingApi}
                  >
                      Bắt đầu cuộc gọi
                  </Button>
              ) : (
                  <Button 
                      variant="danger" 
                      className="w-full" 
                      onClick={endCopilotSession} 
                      disabled={isLoadingApi}
                  >
                      Kết thúc cuộc gọi
                  </Button>
              )}
          </div>
      </div>

      {/* Transcript Area */}
      <div className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-4 mt-4">
        {aiCopilotMessages.length === 0 && copilotSessionState === 'disconnected' && (
          <div className="flex items-center justify-center h-full text-center">
              <p className="text-sm text-gray-500 italic">Lịch sử cuộc trò chuyện sẽ hiện ở đây.</p>
          </div>
        )}
        {(aiCopilotMessages || []).map((msg) => (
          <div key={msg.id} className={`flex ${msg.isPlayerInput ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-md p-3 rounded-lg shadow text-sm ${msg.isPlayerInput ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
              <p className="font-semibold mb-1 text-xs">{msg.isPlayerInput ? "Bạn" : "Đạo Diễn AI"}</p>
              <p className="whitespace-pre-wrap">{typeof msg.content === 'string' ? msg.content : '[Nội dung không phải văn bản]'}</p>
            </div>
          </div>
        ))}
        {isLoadingApi && copilotSessionState === 'connected' && (
            <div className="flex justify-start">
                 <div className="max-w-xs md:max-w-md p-3 rounded-lg bg-gray-700 text-gray-200">
                    <Spinner size="sm" text="AI đang nói..."/>
                 </div>
            </div>
        )}
        <div ref={chatEndRef} />
      </div>
    </div>
  );
};

export default VoiceChatTab;
