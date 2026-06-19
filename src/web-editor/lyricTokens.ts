import {LyricBlock, LyricToken, LyricTokenMode} from './types';

const SMALL_KANA = new Set([...'ゃゅょャュョぁぃぅぇぉァィゥェォっッゎヮゕゖヵヶ']);
const ATTACH_TO_PREVIOUS = new Set([...SMALL_KANA, 'ー', 'ｰ', '゛', '゜']);

const isWhitespace = (char: string) => /\s/.test(char);

export const splitLyricText = (text: string, mode: LyricTokenMode = 'auto'): string[] => {
  if (!text) return [];
  const resolvedMode = mode === 'auto' ? (/\s/.test(text.trim()) ? 'word' : 'mora') : mode;

  if (resolvedMode === 'word') {
    const words = text.match(/\S+\s*/g) ?? [];
    if (words.length > 1) return words;
    return splitLyricText(text, 'mora');
  }

  if (resolvedMode === 'char') {
    return [...text];
  }

  const units: string[] = [];
  for (const char of [...text]) {
    if (isWhitespace(char)) {
      units.push(char);
      continue;
    }
    const previous = units[units.length - 1];
    if (previous && !isWhitespace(previous) && ATTACH_TO_PREVIOUS.has(char)) {
      units[units.length - 1] = previous + char;
      continue;
    }
    units.push(char);
  }
  return units;
};

export const createLyricTokens = (
  lyric: Pick<LyricBlock, 'id' | 'text' | 'startFrame' | 'endFrame' | 'tokenMode'>,
  mode: LyricTokenMode = lyric.tokenMode ?? 'auto'
): LyricToken[] => {
  const units = splitLyricText(lyric.text, mode);
  const duration = Math.max(1, lyric.endFrame - lyric.startFrame);
  return units.map((unit, index) => {
    const startFrame = lyric.startFrame + Math.round((index / Math.max(1, units.length)) * duration);
    const endFrame = lyric.startFrame + Math.round(((index + 1) / Math.max(1, units.length)) * duration);
    return {
      id: `${lyric.id}-token-${index}`,
      text: unit,
      index,
      startFrame,
      endFrame: Math.max(startFrame + 1, endFrame),
    };
  });
};

export const getLyricTokens = (lyric: LyricBlock): LyricToken[] => {
  const existing = lyric.tokens ?? [];
  const existingText = existing.map((token) => token.text).join('');
  if (existing.length > 0 && existingText === lyric.text) {
    return existing
      .map((token, index) => ({
        ...token,
        id: token.id || `${lyric.id}-token-${index}`,
        index,
        startFrame: Math.max(lyric.startFrame, Math.round(token.startFrame)),
        endFrame: Math.min(lyric.endFrame, Math.max(Math.round(token.startFrame) + 1, Math.round(token.endFrame))),
      }))
      .sort((a, b) => a.startFrame - b.startFrame || a.index - b.index);
  }
  return createLyricTokens(lyric);
};

export const withGeneratedTokens = (lyric: LyricBlock, mode: LyricTokenMode = lyric.tokenMode ?? 'auto'): LyricBlock => ({
  ...lyric,
  tokenMode: mode,
  tokens: createLyricTokens({...lyric, tokenMode: mode}),
});
