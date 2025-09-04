import React, { useRef, useEffect, useState, useMemo, useLayoutEffect } from 'react';
import { GameMessage, KnowledgeBase, StyleSettings, StyleSettingProperty, CombatLogContent } from '../../../types';
import Button from '../../ui/Button';
import Spinner from '../../ui/Spinner';
import { VIETNAMESE } from '../../../constants';
import SystemMessageGroup from './SystemMessageGroup'; // Import the new grouping component
import { useGame } from '../../../hooks/useGame';

interface StoryLogProps {
  storyLogRef: React.RefObject<HTMLDivElement>;
  displayedMessages: GameMessage[];
  isLoadingUi: boolean; 
  isSummarizingUi: boolean; 
  isCurrentlyActivePage: boolean;
  knowledgeBase: KnowledgeBase;
  styleSettings: StyleSettings;
  messageIdBeingEdited: string | null;
  currentEditText: string;
  setCurrentEditText: (text: string) => void;
  onStartEditMessage: (messageId: string) => void; 
  onSaveEditedMessage: (messageId: string, newContent: string) => void;
  onCancelEditMessage: () => void;
  parseAndHighlightText: (text: string) => React.ReactNode[];
  getDynamicMessageStyles: (msgType: GameMessage['type']) => React.CSSProperties;
  onClick: () => void;
  onAskCopilotAboutError: (errorMsg: string) => void;
}

// New Component for rendering structured combat logs
const CombatLogRenderer: React.FC<{ log: CombatLogContent }> = ({ log }) => {
    if (log.type === 'info') {
        return (
            <p className="text-center font-semibold text-gray-400 my-2">
                {log.message}
            </p>
        );
    }

    const {
        actorName, targetName, damage, healing,
        didCrit, didEvade, finalTargetHp, maxTargetHp,
        isPlayerActor, isPlayerTarget, message
    } = log;

    let damageColorClass = '';
    if (damage !== undefined) {
        if (isPlayerActor) damageColorClass = 'text-yellow-400';
        else if (isPlayerTarget) damageColorClass = 'text-red-400';
        else damageColorClass = 'text-gray-300';
    }

    return (
        <p>
            <span>{actorName}</span>
            <span className="text-gray-400"> tấn công </span>
            <span>{targetName}</span>
            <span className="text-gray-400">. </span>

            {didEvade ? (
                <span className="italic text-sky-400">Né tránh!</span>
            ) : (
                <>
                    {didCrit && <span className="font-bold text-red-500 animate-pulse">CHÍ MẠNG! </span>}
                    {damage !== undefined && damage > 0 && (
                        <>
                            <span className="text-gray-400">Gây </span>
                            <span className={`font-bold ${damageColorClass}`}>{damage}</span>
                            <span className="text-gray-400"> sát thương. </span>
                        </>
                    )}
                    {healing !== undefined && healing > 0 && (
                         <>
                            <span className="text-gray-400">Hồi phục </span>
                            <span className="font-bold text-green-400">{healing}</span>
                            <span className="text-gray-400"> sinh lực. </span>
                        </>
                    )}
                    <span className="text-xs text-gray-500">
                        (HP của {targetName}: {finalTargetHp}/{maxTargetHp})
                    </span>
                </>
            )}
        </p>
    );
};


const StoryLog: React.FC<StoryLogProps> = ({
  storyLogRef,
  displayedMessages,
  isLoadingUi,
  isSummarizingUi,
  isCurrentlyActivePage,
  knowledgeBase,
  styleSettings,
  messageIdBeingEdited,
  currentEditText,
  setCurrentEditText,
  onStartEditMessage,
  onSaveEditedMessage,
  onCancelEditMessage,
  parseAndHighlightText,
  getDynamicMessageStyles,
  onClick,
  onAskCopilotAboutError,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingText, setEditingText] = useState('');
  const lastNarrationRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(displayedMessages.length);
  const isInitialMount = useRef(true);
  const [liveRegionText, setLiveRegionText] = useState('');
  const prevMessagesLengthForAnnouncement = useRef(displayedMessages.length);

  useEffect(() => {
    if (messageIdBeingEdited) {
        const msgToEdit = displayedMessages.find(m => m.id === messageIdBeingEdited);
        if (msgToEdit && typeof msgToEdit.content === 'string') {
            setEditingText(msgToEdit.content);
        }
    }
  }, [messageIdBeingEdited, displayedMessages]);

  // Effect for auto-scrolling
  useEffect(() => {
    if (messagesEndRef.current && isCurrentlyActivePage) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [displayedMessages, isCurrentlyActivePage]);

  // Effect for Proactive Focus Management
  useEffect(() => {
    if (isInitialMount.current) {
        isInitialMount.current = false;
        prevMessagesLength.current = displayedMessages.length;
        return;
    }

    const newLength = displayedMessages.length;
    const lengthIncreased = newLength > prevMessagesLength.current;

    if (isCurrentlyActivePage && !isLoadingUi && !isSummarizingUi && lengthIncreased) {
        const lastMessage = displayedMessages[newLength - 1];
        if (lastMessage && (lastMessage.type === 'narration' || lastMessage.type === 'combat_log') && !lastMessage.isPlayerInput) {
            setTimeout(() => {
                lastNarrationRef.current?.focus();
            }, 100);
        }
    }

    prevMessagesLength.current = newLength;
  }, [displayedMessages, isCurrentlyActivePage, isLoadingUi, isSummarizingUi]);

  // Effect for screen reader announcement of new content
  useEffect(() => {
    const lastMessage = displayedMessages[displayedMessages.length - 1];
    if (
        displayedMessages.length > prevMessagesLengthForAnnouncement.current &&
        lastMessage &&
        (lastMessage.type === 'narration' || lastMessage.type === 'combat_log') &&
        !lastMessage.isPlayerInput &&
        isCurrentlyActivePage
    ) {
        const announcement = (typeof lastMessage.content === 'string') 
            ? `AI kể: ${lastMessage.content}` 
            : `Diễn biến chiến đấu: ${(lastMessage.content as CombatLogContent).message}`;
        setLiveRegionText(announcement);
    }
    
    prevMessagesLengthForAnnouncement.current = displayedMessages.length;
  }, [displayedMessages, isCurrentlyActivePage]);


  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (messageIdBeingEdited) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a, [role="button"], textarea')) return;
    onClick();
  };

  const isMajorMessage = (type: GameMessage['type']) => type === 'narration' || type === 'player_action' || type === 'combat_log';
  
  const groupedMessages = useMemo(() => {
    const result: (GameMessage | GameMessage[])[] = [];
    let currentSystemGroup: GameMessage[] = [];

    displayedMessages.forEach((msg) => {
        if (msg.type === 'system') {
            currentSystemGroup.push(msg);
        } else {
            if (currentSystemGroup.length > 0) {
                result.push(currentSystemGroup);
                currentSystemGroup = [];
            }
            result.push(msg);
        }
    });

    if (currentSystemGroup.length > 0) {
        result.push(currentSystemGroup);
    }
    return result;
  }, [displayedMessages]);

  const lastMessageOverall = displayedMessages[displayedMessages.length - 1];

  return (
    <div 
      id="story-log"
      ref={storyLogRef}
      onClick={handleContainerClick}
      className="overflow-y-auto p-3 sm:p-4 bg-gray-800 rounded-t-lg custom-scrollbar flex-grow min-h-0"
      aria-atomic="false"
      aria-relevant="additions"
    >
      <div role="status" aria-live="polite" className="sr-only">
        {liveRegionText}
      </div>
      {groupedMessages.map((item, index) => {
        const isGroup = Array.isArray(item);
        
        let containerMargin = 'mt-2';
        if (index > 0) {
            const prevItem = groupedMessages[index - 1];
            const currentItemIsMajor = isMajorMessage(isGroup ? 'system' : item.type);
            const prevItemIsMajor = isMajorMessage(Array.isArray(prevItem) ? 'system' : prevItem.type);
            if (currentItemIsMajor !== prevItemIsMajor) containerMargin = 'mt-3 sm:mt-4';
        }
        
        if (isGroup) {
            const firstMessageInGroup = item[0];
            return (
                <div key={`group-${firstMessageInGroup.id}`} className={`story-message-container flex justify-start ${containerMargin}`}>
                    <div className="max-w-full w-full">
                       <SystemMessageGroup messages={item} />
                    </div>
                </div>
            );
        }
        
        const msg = item;
        const isLastNarrationMessage = lastMessageOverall && msg.id === lastMessageOverall.id && (msg.type === 'narration' || msg.type === 'combat_log') && !msg.isPlayerInput;
        const messageBaseClass = 'max-w-full p-2 sm:p-3 rounded-xl shadow text-sm sm:text-base relative outline-none focus:ring-2 focus:ring-indigo-400';
        let typeSpecificClass = '';
        let dynamicStyle = getDynamicMessageStyles(msg.type);
        const isEditable = (msg.type === 'narration' || msg.type === 'player_action') && isCurrentlyActivePage && typeof msg.content === 'string';

        switch (msg.type) {
            case 'narration':
            case 'combat_log': // Combat logs use narration style as base
                if (!dynamicStyle.backgroundColor) typeSpecificClass = 'bg-gray-700';
                if (!dynamicStyle.color) typeSpecificClass += (typeSpecificClass ? ' ' : '') + 'text-gray-100';
                dynamicStyle.whiteSpace = 'pre-wrap';
                break;
            case 'player_action':
                if (!dynamicStyle.backgroundColor) typeSpecificClass = 'bg-indigo-600';
                if (!dynamicStyle.color) typeSpecificClass += (typeSpecificClass ? ' ' : '') + 'text-white';
                dynamicStyle.whiteSpace = 'pre-wrap';
                break;
            case 'error': typeSpecificClass = 'bg-red-700 text-white'; break;
            case 'page_summary': typeSpecificClass = 'bg-purple-800 bg-opacity-50 text-purple-200 border border-purple-600 italic text-xs sm:text-sm'; break;
            case 'event_summary': typeSpecificClass = 'bg-green-800 bg-opacity-50 text-green-200 border border-green-600 italic text-xs sm:text-sm'; break;
            default: typeSpecificClass = 'bg-gray-600 text-gray-200';
        }

        return (
          <div key={msg.id} className={`story-message-container flex ${msg.isPlayerInput ? 'justify-end' : 'justify-start'} ${containerMargin}`}>
              <div
                id={`message-${msg.id}`}
                ref={isLastNarrationMessage ? lastNarrationRef : null}
                tabIndex={-1}
                className={`${messageBaseClass} ${typeSpecificClass} ${messageIdBeingEdited === msg.id ? 'w-full' : ''}`}
                style={dynamicStyle}
              >
                {isEditable && messageIdBeingEdited !== msg.id && (
                  <button onClick={() => onStartEditMessage(msg.id)} className="absolute top-1 right-1 p-0.5 text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-full transition-colors" aria-label={VIETNAMESE.editButtonLabel} title={VIETNAMESE.editButtonLabel}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
                  </button>
                )}
                {messageIdBeingEdited === msg.id && typeof msg.content === 'string' ? (
                  <div className="mt-1">
                    <textarea value={editingText} onChange={(e) => setEditingText(e.target.value)} className="w-full p-2 text-sm bg-gray-600 border border-gray-500 rounded-md focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 text-gray-100 min-h-[80px]" rows={Math.max(3, editingText.split('\\n').length)} />
                    <div className="flex justify-end space-x-2 mt-2">
                      <Button size="sm" variant="ghost" onClick={onCancelEditMessage}>{VIETNAMESE.cancelEditButton}</Button>
                      <Button size="sm" variant="primary" onClick={() => onSaveEditedMessage(msg.id, editingText)}>{VIETNAMESE.saveEditButton}</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-start">
                    {msg.type === 'combat_log' ? (
                        <CombatLogRenderer log={msg.content as CombatLogContent} />
                    ) : typeof msg.content === 'string' && (
                        <p className="leading-relaxed">{React.Children.toArray(parseAndHighlightText(msg.content))}</p>
                    )}
                     {msg.type === 'error' && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="!py-1 !px-2 text-xs border-cyan-400 text-cyan-300 hover:bg-cyan-700 mt-2 self-start"
                            onClick={() => onAskCopilotAboutError(msg.content as string)}
                            title="Hỏi Siêu Trợ Lý AI về lỗi này"
                        >
                            <span className="flex items-center gap-1">
                                <span role="img" aria-label="brain">🧠</span>
                                <span>Hỏi AI về lỗi này</span>
                            </span>
                        </Button>
                    )}
                  </div>
                )}
              </div>
          </div>
        );
      })}
      {(isLoadingUi && displayedMessages.length === 0) && <Spinner text={VIETNAMESE.contactingAI} size="sm" className="my-4" />}
      {(isLoadingUi && !isSummarizingUi && isCurrentlyActivePage && displayedMessages.length > 0) && <div role="status" aria-live="polite" className="text-center text-gray-400 italic py-2 mt-2 text-xs sm:text-sm">{VIETNAMESE.contactingAI}</div>}
      {isSummarizingUi && <div className="text-center text-gray-400 italic py-2 mt-2"><Spinner text={displayedMessages.some(m => typeof m.content === 'string' && m.content.includes(VIETNAMESE.creatingMissingSummary)) ? VIETNAMESE.creatingMissingSummary : VIETNAMESE.summarizingAndPreparingNextPage} size="sm" /></div>}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default StoryLog;
