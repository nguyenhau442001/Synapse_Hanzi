// Ambient declarations for legacy global bridges during incremental TypeScript checkJs adoption.
// Remove entries as window.* and implicit globals are migrated to ES module stores.
export {};

declare global {
  interface Window {
    [key: string]: any;
  }

  const LEVELS: Record<string, any>;
  const WORDS: any[];
  let currentLevel: string | null;
  let order: number[];
  let filteredOrder: number[];
  let srsCards: Record<string, any>;
  let progress: Record<string, any>;
  let reviewLog: Record<string, any>;
  let srsRetention: number;
  let showPinyin: boolean;
  function localDateKey(date?: Date): string;
  function storageKey(suffix: string): string;
  function stopSpeech(): void;
}
