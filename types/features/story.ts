// types/features/story.ts

/**
 * Represents an action that is set up by the AI Copilot to be triggered
 * by the main storytelling AI when a certain condition is met.
 */
export interface StagedAction {
    /** A description of the action, for the user to understand what was set up. */
    description: string;
    /** The actual tag(s) to be processed when the trigger occurs. */
    actionTags: string;
}