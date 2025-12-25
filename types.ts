
export type AspectRatio = '16:9' | '9:16';
export type Resolution = '720p' | '1080p';

export interface GenerationParams {
  prompt: string;
  startImage?: string; // base64
  endImage?: string;   // base64
  aspectRatio: AspectRatio;
  resolution: Resolution;
}

export interface GenerationState {
  isGenerating: boolean;
  status: string;
  progress: number;
  error?: string;
  videoUrl?: string;
}

// Window extensions for AI Studio
declare global {
  /**
   * Interface representing the AI Studio helper methods.
   * Moved to global scope to allow merging with ambient environmental definitions.
   */
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    /**
     * The aistudio property is defined here to match the environment's global declaration.
     * Fixed the modifier mismatch error by making it optional.
     */
    aistudio?: AIStudio;
  }
}