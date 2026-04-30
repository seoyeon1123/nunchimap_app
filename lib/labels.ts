import type { Signal, ReviewMethod } from './types';

export const SIGNAL_DOT: Record<Signal, string> = {
  green: '🟢',
  yellow: '🟡',
  red: '🔴',
  gray: '⚪',
};

export const SIGNAL_LABEL: Record<Signal, string> = {
  green: '카공 OK',
  yellow: '애매',
  red: '비추',
  gray: '데이터 없음',
};

export const METHOD_LABEL: Record<ReviewMethod, string> = {
  gps: 'GPS',
  ocr: '영수증',
  manual: '직접입력',
};

export const TAG_LABEL: Record<string, string> = {
  outlet: '콘센트',
  wifi: 'Wi-Fi',
  quiet: '조용함',
  spacious: '넓음',
  long_stay: '장시간OK',
  open_24h: '24시간',
};

export const TAG_CODES = ['outlet', 'wifi', 'quiet', 'spacious', 'long_stay', 'open_24h'] as const;
