"use client";

import React, { useState } from "react";
import { VoiceConfig, STTProvider, LLMProvider, TTSProvider } from "@/lib/voice/types";

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: VoiceConfig;
  onSave: (newConfig: VoiceConfig) => void;
}

import { getLastUsedKeyInfo } from "@/lib/voice/key-rotation";

const GROQ_SPEAKERS = ["troy", "autumn", "diana", "hannah", "austin"];
const RIME_SPEAKERS = [
  "abbie",
  "allison",
  "astra",
  "amber",
  "colin",
  "elena",
  "eva",
  "tyler",
  "maya",
  "luna",
];

export function VoiceSettingsModal({
  isOpen,
  onClose,
  config,
  onSave,
}: VoiceSettingsModalProps) {
  const [localConfig, setLocalConfig] = useState<VoiceConfig>(config);

  React.useEffect(() => {
    if (isOpen) {
      try {
        const savedKeys = localStorage.getItem("warden_api_keys");
        const parsedKeys = savedKeys ? JSON.parse(savedKeys) : {};
        setLocalConfig({
          ...config,
          apiKeys: {
            ...config.apiKeys,
            ...parsedKeys,
          },
        });
      } catch (e) {
        setLocalConfig(config);
      }
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleSave = () => {
    try {
      if (localConfig.apiKeys) {
        localStorage.setItem("warden_api_keys", JSON.stringify(localConfig.apiKeys));
      }
      localStorage.setItem("warden_voice_config", JSON.stringify(localConfig));
    } catch (e) {
      console.warn("Failed to save to localStorage", e);
    }
    onSave(localConfig);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-[6px] select-none"
      onClick={onClose}
    >
      <div
        className="figma-glass-card rounded-[22px] p-6 w-[420px] max-w-[92vw] flex flex-col gap-5 text-white animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h3 className="text-[17px] font-semibold tracking-[-0.01em]">
              Voice Pipeline Configuration
            </h3>
            <p className="text-[11.5px] text-[#8E92A4] mt-[1px]">
              Modular STT, LLM Streaming, and Rime TTS Engine
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-[#8E92A4] hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* STT Section */}
        <div className="flex flex-col gap-2">
          <label className="text-[11.5px] font-medium tracking-[0.04em] uppercase text-[#8E92A4]">
            Speech-to-Text (STT) Engine
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "web_speech", label: "Web Speech" },
              { id: "groq", label: "Groq Whisper" },
              { id: "openai", label: "OpenAI Whisper" },
            ].map((stt) => (
              <button
                key={stt.id}
                type="button"
                onClick={() =>
                  setLocalConfig({
                    ...localConfig,
                    stt: { ...localConfig.stt, provider: stt.id as STTProvider },
                  })
                }
                className={`py-2 px-2 rounded-[10px] text-[11.5px] font-medium transition-all text-center border ${
                  localConfig.stt.provider === stt.id
                    ? "bg-white/15 border-white/40 text-white shadow-sm"
                    : "bg-white/[0.03] border-white/5 text-[#8E92A4] hover:bg-white/[0.08]"
                }`}
              >
                {stt.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[#6D7282]">
            {localConfig.stt.provider === "groq"
              ? "Groq whisper-large-v3-turbo engine with continuous pause/silence detection."
              : "Listens continuously until a natural pause/silence is detected."}
          </p>
        </div>

        {/* LLM Section */}
        <div className="flex flex-col gap-2">
          <label className="text-[11.5px] font-medium tracking-[0.04em] uppercase text-[#8E92A4]">
            Reasoning Engine (LLM)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "groq", label: "Groq (Qwen 27B Turbo)", model: "qwen/qwen3.8-27b" },
              { id: "openai", label: "OpenAI (GPT-4o mini)", model: "gpt-4o-mini" },
            ].map((llm) => (
              <button
                key={llm.id}
                type="button"
                onClick={() =>
                  setLocalConfig({
                    ...localConfig,
                    llm: {
                      ...localConfig.llm,
                      provider: llm.id as LLMProvider,
                      model: llm.model,
                    },
                  })
                }
                className={`py-2 px-2.5 rounded-[10px] text-[11.5px] font-medium transition-all text-left border ${
                  localConfig.llm.provider === llm.id
                    ? "bg-white/15 border-white/40 text-white shadow-sm"
                    : "bg-white/[0.03] border-white/5 text-[#8E92A4] hover:bg-white/[0.08]"
                }`}
              >
                {llm.label}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between text-[11.5px] text-[#8E92A4] mt-1">
            <span>Server-Sent Events (SSE) Streaming</span>
            <input
              type="checkbox"
              checked={localConfig.llm.stream}
              onChange={(e) =>
                setLocalConfig({
                  ...localConfig,
                  llm: { ...localConfig.llm, stream: e.target.checked },
                })
              }
              className="accent-[#1ECCE6] cursor-pointer"
            />
          </div>
        </div>

        {/* TTS Section */}
        <div className="flex flex-col gap-2">
          <label className="text-[11.5px] font-medium tracking-[0.04em] uppercase text-[#8E92A4]">
            Text-to-Speech (TTS) Engine
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {[
              { id: "groq", label: "Groq Orpheus" },
              { id: "fish_audio", label: "Fish Audio" },
              { id: "rime", label: "Rime AI" },
              { id: "openai", label: "OpenAI" },
              { id: "browser_speech", label: "Browser" },
            ].map((tts) => (
              <button
                key={tts.id}
                type="button"
                onClick={() =>
                  setLocalConfig({
                    ...localConfig,
                    tts: {
                      ...localConfig.tts,
                      provider: tts.id as TTSProvider,
                      modelId:
                        tts.id === "groq"
                          ? "canopylabs/orpheus-v1-english"
                          : tts.id === "fish_audio"
                          ? "s2.1-pro-free"
                          : localConfig.tts.modelId,
                      speaker:
                        tts.id === "groq"
                          ? (GROQ_SPEAKERS.includes(localConfig.tts.speaker) ? localConfig.tts.speaker : "troy")
                          : localConfig.tts.speaker,
                    },
                  })
                }
                className={`py-2 px-1 rounded-[10px] text-[10.5px] font-medium transition-all text-center border ${
                  localConfig.tts.provider === tts.id
                    ? "bg-white/15 border-white/40 text-white shadow-sm"
                    : "bg-white/[0.03] border-white/5 text-[#8E92A4] hover:bg-white/[0.08]"
                }`}
              >
                {tts.label}
              </button>
            ))}
          </div>

          {localConfig.tts.provider === "groq" && (
            <div className="flex flex-col gap-2 mt-1 bg-white/[0.02] p-2.5 rounded-[10px] border border-white/5">
              <div className="flex items-center justify-between text-[11px] text-[#8E92A4]">
                <span>Model</span>
                <span className="font-mono text-[10px] text-[#1ECCE6] bg-[#1ECCE6]/10 px-2 py-0.5 rounded border border-[#1ECCE6]/20">
                  canopylabs/orpheus-v1-english
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#8E92A4]">
                <span>Voice Speaker</span>
                <select
                  value={localConfig.tts.speaker || "troy"}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      tts: { ...localConfig.tts, speaker: e.target.value },
                    })
                  }
                  className="bg-[#1A1E26] border border-white/15 rounded-md px-2 py-0.5 text-white text-[11.5px] outline-none capitalize"
                >
                  {GROQ_SPEAKERS.map((spk) => (
                    <option key={spk} value={spk}>
                      {spk}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#8E92A4]">
                <span>Chunk Stream Synthesis</span>
                <input
                  type="checkbox"
                  checked={localConfig.tts.streamSSE}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      tts: { ...localConfig.tts, streamSSE: e.target.checked },
                    })
                  }
                  className="accent-[#1ECCE6] cursor-pointer"
                />
              </div>
            </div>
          )}

          {localConfig.tts.provider === "fish_audio" && (
            <div className="flex flex-col gap-2 mt-1 bg-white/[0.02] p-2.5 rounded-[10px] border border-white/5">
              <div className="flex items-center justify-between text-[11px] text-[#8E92A4]">
                <span>Model Tier</span>
                <span className="font-mono text-[11px] text-[#1ECCE6] bg-[#1ECCE6]/10 px-2 py-0.5 rounded border border-[#1ECCE6]/20">
                  s2.1-pro-free
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#8E92A4]">
                <span>Chunk Stream Synthesis</span>
                <input
                  type="checkbox"
                  checked={localConfig.tts.streamSSE}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      tts: { ...localConfig.tts, streamSSE: e.target.checked },
                    })
                  }
                  className="accent-[#1ECCE6] cursor-pointer"
                />
              </div>
            </div>
          )}

          {localConfig.tts.provider === "rime" && (
            <div className="flex flex-col gap-1.5 mt-1 bg-white/[0.02] p-2.5 rounded-[10px] border border-white/5">
              <div className="flex items-center justify-between text-[11px] text-[#8E92A4]">
                <span>Rime Speaker</span>
                <select
                  value={localConfig.tts.speaker}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      tts: { ...localConfig.tts, speaker: e.target.value },
                    })
                  }
                  className="bg-[#1A1E26] border border-white/15 rounded-md px-2 py-0.5 text-white text-[11.5px] outline-none"
                >
                  {RIME_SPEAKERS.map((spk) => (
                    <option key={spk} value={spk}>
                      {spk}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#8E92A4]">
                <span>Chunk Stream Synthesis</span>
                <input
                  type="checkbox"
                  checked={localConfig.tts.streamSSE}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      tts: { ...localConfig.tts, streamSSE: e.target.checked },
                    })
                  }
                  className="accent-[#1ECCE6] cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* API Keys Configuration Section (Saved to LocalStorage with Round-Robin Rotation) */}
        <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <label className="text-[11.5px] font-medium tracking-[0.04em] uppercase text-[#8E92A4]">
              API Keys & Credentials
            </label>
            <span className="text-[10px] text-[#1ECCE6] font-mono bg-[#1ECCE6]/10 px-1.5 py-0.5 rounded border border-[#1ECCE6]/20">
              LocalStorage · Comma-Separated Rotation
            </span>
          </div>

          <div className="flex flex-col gap-2.5 max-h-[175px] overflow-y-auto pr-1">
            {/* Groq API Key (Multi-key round robin) */}
            {(() => {
              const info = getLastUsedKeyInfo("groq", localConfig.apiKeys?.groq);
              return (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#C1C6D7] font-medium">
                      Groq API Keys (Qwen, Whisper, Orpheus)
                    </span>
                    {info.total > 1 ? (
                      <span className="text-[9.5px] text-[#1ECCE6] font-mono bg-[#1ECCE6]/10 px-1.5 py-0.2 rounded border border-[#1ECCE6]/20">
                        🔄 {info.total} keys · Next: #{info.currentIndex + 1} ({info.activeKeyPreview})
                      </span>
                    ) : info.total === 1 ? (
                      <span className="text-[9.5px] text-[#1EE639] font-mono">1 key active</span>
                    ) : null}
                  </div>
                  <input
                    type="password"
                    placeholder="gsk_key1, gsk_key2, gsk_key3 (round-robin rotated)"
                    value={localConfig.apiKeys?.groq || ""}
                    onChange={(e) =>
                      setLocalConfig({
                        ...localConfig,
                        apiKeys: { ...localConfig.apiKeys, groq: e.target.value },
                      })
                    }
                    className="bg-black/40 border border-white/10 rounded-[8px] px-2.5 py-1.5 text-[11px] text-white placeholder-[#5C6170] focus:border-[#1ECCE6]/50 outline-none"
                  />
                </div>
              );
            })()}

            {/* Fish Audio API Key */}
            {(() => {
              const info = getLastUsedKeyInfo("fish_audio", localConfig.apiKeys?.fishAudio);
              return (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#C1C6D7] font-medium">Fish Audio API Key(s)</span>
                    {info.total > 1 && (
                      <span className="text-[9.5px] text-[#1ECCE6] font-mono bg-[#1ECCE6]/10 px-1.5 py-0.2 rounded border border-[#1ECCE6]/20">
                        🔄 {info.total} keys · Next: #{info.currentIndex + 1}
                      </span>
                    )}
                  </div>
                  <input
                    type="password"
                    placeholder="s2.1-pro-free / custom key (optional, comma-separated)"
                    value={localConfig.apiKeys?.fishAudio || ""}
                    onChange={(e) =>
                      setLocalConfig({
                        ...localConfig,
                        apiKeys: { ...localConfig.apiKeys, fishAudio: e.target.value },
                      })
                    }
                    className="bg-black/40 border border-white/10 rounded-[8px] px-2.5 py-1.5 text-[11px] text-white placeholder-[#5C6170] focus:border-[#1ECCE6]/50 outline-none"
                  />
                </div>
              );
            })()}

            {/* OpenAI API Key */}
            {(() => {
              const info = getLastUsedKeyInfo("openai", localConfig.apiKeys?.openai);
              return (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#C1C6D7] font-medium">OpenAI API Key(s)</span>
                    {info.total > 1 && (
                      <span className="text-[9.5px] text-[#1ECCE6] font-mono bg-[#1ECCE6]/10 px-1.5 py-0.2 rounded border border-[#1ECCE6]/20">
                        🔄 {info.total} keys · Next: #{info.currentIndex + 1}
                      </span>
                    )}
                  </div>
                  <input
                    type="password"
                    placeholder="sk-key1, sk-key2 (comma-separated for rotation)"
                    value={localConfig.apiKeys?.openai || ""}
                    onChange={(e) =>
                      setLocalConfig({
                        ...localConfig,
                        apiKeys: { ...localConfig.apiKeys, openai: e.target.value },
                      })
                    }
                    className="bg-black/40 border border-white/10 rounded-[8px] px-2.5 py-1.5 text-[11px] text-white placeholder-[#5C6170] focus:border-[#1ECCE6]/50 outline-none"
                  />
                </div>
              );
            })()}

            {/* Rime AI API Key */}
            {(() => {
              const info = getLastUsedKeyInfo("rime", localConfig.apiKeys?.rime);
              return (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#C1C6D7] font-medium">Rime AI API Key(s)</span>
                    {info.total > 1 && (
                      <span className="text-[9.5px] text-[#1ECCE6] font-mono bg-[#1ECCE6]/10 px-1.5 py-0.2 rounded border border-[#1ECCE6]/20">
                        🔄 {info.total} keys · Next: #{info.currentIndex + 1}
                      </span>
                    )}
                  </div>
                  <input
                    type="password"
                    placeholder="rime_... (comma-separated for rotation)"
                    value={localConfig.apiKeys?.rime || ""}
                    onChange={(e) =>
                      setLocalConfig({
                        ...localConfig,
                        apiKeys: { ...localConfig.apiKeys, rime: e.target.value },
                      })
                    }
                    className="bg-black/40 border border-white/10 rounded-[8px] px-2.5 py-1.5 text-[11px] text-white placeholder-[#5C6170] focus:border-[#1ECCE6]/50 outline-none"
                  />
                </div>
              );
            })()}
          </div>
          <p className="text-[10px] text-[#6D7282]">
            Separate multiple keys with commas. Warden round-robin rotates across keys on each call and automatically falls back on rate limits.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-[12px] text-[#8E92A4] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 text-[12px] font-medium bg-[#1ECCE6]/20 border border-[#1ECCE6]/40 text-[#1ECCE6] hover:bg-[#1ECCE6]/30 rounded-[8px] transition-all"
          >
            Save Pipeline
          </button>
        </div>
      </div>
    </div>
  );
}
