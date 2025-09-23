

import { useState, useCallback } from 'react';
// FIX: Correct import path for types
import type { GameEntity, GameEntityType } from './types';
// FIX: Add missing React import to resolve namespace errors.
import type React from 'react';

export const usePopover = () => {
    const [popover, setPopover] = useState<{
        isOpen: boolean;
        targetRect: DOMRect | null;
        entity: GameEntity | null;
        entityType: GameEntityType | null;
    }>({ isOpen: false, targetRect: null, entity: null, entityType: null });
    
    const handleKeywordClick = useCallback((
        event: React.MouseEvent<HTMLSpanElement>,
        entity: GameEntity,
        entityType: GameEntityType
    ) => {
        const target = event.currentTarget as HTMLElement;
        setPopover(prev => {
            if (prev.isOpen && prev.entity === entity) {
                return { ...prev, isOpen: false, targetRect: null, entity: null, entityType: null };
            }
            return {
                isOpen: true,
                targetRect: target.getBoundingClientRect(),
                entity,
                entityType,
            };
        });
    }, []);

    const closePopover = useCallback(() => {
        setPopover(prev => ({ ...prev, isOpen: false, targetRect: null, entity: null, entityType: null }));
    }, []);

    return {
        popover,
        handleKeywordClick,
        closePopover,
    };
};