// src/utils/tagProcessors/rewriteTurnTagProcessor.ts
import { KnowledgeBase } from '../../types/index';

export interface RewriteTurnResult {
    rewriteTurnDirective?: string;
}

export const processRewriteTurn = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>
): RewriteTurnResult => {
    const directive = tagParams.prompt;

    if (!directive || !directive.trim()) {
        console.warn("REWRITE_TURN: Tag is missing a valid 'prompt' parameter.", tagParams);
        return {};
    }

    // This processor doesn't modify the KB directly. It just signals the need for a rewrite.
    // The main game loop will see this directive and handle the rollback-and-regenerate logic.
    return { rewriteTurnDirective: directive.trim() };
};
