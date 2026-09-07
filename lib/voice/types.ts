export type STTProvider = 'web_speech' | 'groq' | 'openai';
export type LLMProvider = 'groq' | 'openai';
export type TTSProvider = 'rime' | 'openai' | 'browser_speech';

export interface VoiceConfig {
  stt: {
    provider: STTProvider;
    silenceTimeoutMs: number;
    language: string;
  };
  llm: {
    provider: LLMProvider;
    model: string;
    stream: boolean;
  };
  tts: {
    provider: TTSProvider;
    speaker: string;
    modelId: string;
    speedAlpha: number;
    streamSSE: boolean;
  };
}

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  stt: {
    provider: 'web_speech',
    silenceTimeoutMs: 1400,
    language: 'en-US',
  },
  llm: {
    provider: 'groq',
    model: 'qwen/qwen3.8-27b',
    stream: true,
  },
  tts: {
    provider: 'rime',
    speaker: 'abbie',
    modelId: 'mistv2',
    speedAlpha: 1.0,
    streamSSE: true,
  },
};
