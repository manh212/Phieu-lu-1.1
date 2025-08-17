import { useState, useRef, useCallback } from 'react';
import { PlayerActionInputType, ResponseLength } from '../types';

interface UsePlayerInputProps {
  onPlayerAction: (action: string, isChoice: boolean, inputType: PlayerActionInputType, responseLength: ResponseLength) => void;
  onRefreshChoices: (playerHint: string) => void;
  isLoading: boolean;
  isSummarizing: boolean;
  isCurrentlyActivePage: boolean;
  messageIdBeingEdited: string | null;
}

export const usePlayerInput = ({ onPlayerAction, onRefreshChoices, isLoading, isSummarizing, isCurrentlyActivePage, messageIdBeingEdited }: UsePlayerInputProps) => {
  const [playerInput, setPlayerInput] = useState('');
  const [currentActionType, setCurrentActionType] = useState<PlayerActionInputType>('action');
  const [selectedResponseLength, setSelectedResponseLength] = useState<ResponseLength>('default');
  const [isResponseLengthDropdownOpen, setIsResponseLengthDropdownOpen] = useState(false);
  const [showAiSuggestions, setShowAiSuggestions] = useState(true);

  const responseLengthDropdownRef = useRef<HTMLDivElement | null>(null);
  
  const handleChoiceClick = useCallback((choiceText: string) => {
    if (!isLoading && !isSummarizing && isCurrentlyActivePage) {
      onPlayerAction(choiceText, true, 'action', selectedResponseLength);
      setPlayerInput('');
    }
  }, [isLoading, isSummarizing, isCurrentlyActivePage, onPlayerAction, selectedResponseLength]);
  
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (playerInput.trim() && !isLoading && !isSummarizing && isCurrentlyActivePage && !messageIdBeingEdited) {
      onPlayerAction(playerInput.trim(), false, currentActionType, selectedResponseLength);
      setPlayerInput('');
    }
  }, [playerInput, isLoading, isSummarizing, isCurrentlyActivePage, messageIdBeingEdited, onPlayerAction, currentActionType, selectedResponseLength]);

  const handleRefresh = useCallback(() => {
    if (!isLoading && !isSummarizing && isCurrentlyActivePage) {
        onRefreshChoices(playerInput);
        setPlayerInput(''); // Clear input after refresh request
    }
  }, [isLoading, isSummarizing, isCurrentlyActivePage, onRefreshChoices, playerInput]);


  return {
    playerInput,
    setPlayerInput,
    currentActionType,
    setCurrentActionType,
    selectedResponseLength,
    setSelectedResponseLength,
    isResponseLengthDropdownOpen,
    setIsResponseLengthDropdownOpen,
    showAiSuggestions,
    setShowAiSuggestions,
    responseLengthDropdownRef,
    handleChoiceClick,
    handleSubmit,
    handleRefresh,
  };
};