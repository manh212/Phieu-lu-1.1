
// FIX: Correct import path for types
import { KnowledgeBase, GameMessage } from '../types/index';
import { VIETNAMESE } from '../constants';

export const getMessagesForPage = (
  pageNumber: number,
  knowledgeBase: KnowledgeBase,
  allGameMessages: GameMessage[]
): GameMessage[] => {
  if (!knowledgeBase.currentPageHistory || knowledgeBase.currentPageHistory.length === 0) {
    return allGameMessages; 
  }
  const turnStartOfPage = knowledgeBase.currentPageHistory[pageNumber -1];
  const turnEndOfPage = (pageNumber < knowledgeBase.currentPageHistory.length) 
                          ? knowledgeBase.currentPageHistory[pageNumber] - 1 
                          : knowledgeBase.playerStats.turn;

  const messages = allGameMessages.filter(msg => 
    msg.turnNumber >= turnStartOfPage && msg.turnNumber <= turnEndOfPage
  );
  
  const summaryForThisPage = knowledgeBase.pageSummaries?.[pageNumber];

  // FIX: Added robust type check to ensure summary is a valid non-empty string.
  // This prevents crashes from corrupted save data where a summary might be null, an object, or an empty string.
  if (typeof summaryForThisPage === 'string' && summaryForThisPage.trim() && turnStartOfPage > 0 && turnEndOfPage >= turnStartOfPage) { 
     const summaryTurn = turnEndOfPage; 
     
     // Check if a summary message for this page has already been added to avoid duplicates.
     const summaryAlreadyExists = messages.some(m => m.type === 'page_summary' && m.turnNumber === summaryTurn);

     if (!summaryAlreadyExists) {
        messages.push({
            id: `page-summary-display-${pageNumber}-${Date.now()}`,
            type: 'page_summary',
            content: `${VIETNAMESE.pageSummaryTitle(pageNumber)}: ${summaryForThisPage}`,
            timestamp: Date.now(), 
            turnNumber: summaryTurn
        });
     }
  }
  return messages;
};


export const calculateTotalPages = (knowledgeBase: KnowledgeBase): number => {
  return Math.max(1, knowledgeBase.currentPageHistory?.length || 1);
};
