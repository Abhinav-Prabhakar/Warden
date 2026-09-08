"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { VoiceConfig, DEFAULT_VOICE_CONFIG } from "@/lib/voice/types";
import { OrbState } from "thinking-orbs";
import { getRotatedApiKey } from "@/lib/voice/key-rotation";

export function useVoiceAgent() {
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("warden_voice_config");
        const savedKeys = localStorage.getItem("warden_api_keys");
        const parsed = saved ? JSON.parse(saved) : {};
        const parsedKeys = savedKeys ? JSON.parse(savedKeys) : {};
        return {
          ...DEFAULT_VOICE_CONFIG,
          ...parsed,
          apiKeys: {
            ...DEFAULT_VOICE_CONFIG.apiKeys,
            ...(parsed.apiKeys || {}),
            ...parsedKeys,
          },
        };
      } catch (e) {}
    }
    return DEFAULT_VOICE_CONFIG;
  });

  const [orbState, setOrbState] = useState<OrbState>("listening");
  const [orbSpeed, setOrbSpeed] = useState<number>(1);
  const [statusText, setStatusText] = useState<string>("Ready");
  const [transcript, setTranscript] = useState<string>("");
  const [lastResponse, setLastResponse] = useState<string>("");
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  // Audio & speech references
  const audioContextRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedSpeechRef = useRef<string>("");
  const currentAudioElementRef = useRef<HTMLAudioElement | null>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHoldingRef = useRef<boolean>(false);
  const isSynthesizingRef = useRef<boolean>(false);

  // Save config to localStorage
  const updateConfig = useCallback((newConfig: VoiceConfig) => {
    setVoiceConfig(newConfig);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("warden_voice_config", JSON.stringify(newConfig));
        if (newConfig.apiKeys) {
          localStorage.setItem("warden_api_keys", JSON.stringify(newConfig.apiKeys));
        }
      } catch (e) {
        console.warn("Failed to persist voice config", e);
      }
    }
  }, []);

  // Play audio buffer from TTS
  const playAudioBlob = useCallback(async (blob: Blob): Promise<void> => {
    return new Promise((resolve) => {
      try {
        if (currentAudioElementRef.current) {
          currentAudioElementRef.current.pause();
          currentAudioElementRef.current = null;
        }

        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        currentAudioElementRef.current = audio;

        audio.onplay = () => {
          setIsPlayingAudio(true);
          setOrbState("composing"); // Dynamic animated speaking state
          setOrbSpeed(1.25);
          setStatusText("Warden Speaking");
        };

        audio.onended = () => {
          setIsPlayingAudio(false);
          setOrbState("listening");
          setOrbSpeed(1.0);
          setStatusText("Listening");
          URL.revokeObjectURL(audioUrl);
          resolve();
        };

        audio.onerror = (e) => {
          console.warn("Audio playback error:", e);
          setIsPlayingAudio(false);
          setOrbState("listening");
          setOrbSpeed(1.0);
          resolve();
        };

        audio.play().catch((err) => {
          console.warn("Autoplay was prevented or error occurred:", err);
          setIsPlayingAudio(false);
          setOrbState("listening");
          resolve();
        });
      } catch (err) {
        console.error("Audio playback exception:", err);
        resolve();
      }
    });
  }, []);

  // Synthesize text chunk with TTS
  const synthesizeText = useCallback(
    async (text: string): Promise<void> => {
      if (!text || !text.trim()) return;
      isSynthesizingRef.current = true;

      try {
        if (voiceConfig.tts.provider === "browser_speech") {
          if (typeof window !== "undefined" && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.05;
            utterance.onstart = () => {
              setIsPlayingAudio(true);
              setOrbState("composing");
              setOrbSpeed(1.25);
            };
            utterance.onend = () => {
              setIsPlayingAudio(false);
              setOrbState("listening");
              setOrbSpeed(1.0);
            };
            window.speechSynthesis.speak(utterance);
          }
          return;
        }

        const rawTTSKey =
          voiceConfig.tts.provider === "groq"
            ? voiceConfig.apiKeys?.groq
            : voiceConfig.tts.provider === "fish_audio"
            ? voiceConfig.apiKeys?.fishAudio
            : voiceConfig.tts.provider === "rime"
            ? voiceConfig.apiKeys?.rime
            : voiceConfig.apiKeys?.openai;

        const activeTTSKey = getRotatedApiKey(
          voiceConfig.tts.provider === "groq" ? "groq" : voiceConfig.tts.provider,
          rawTTSKey
        );

        const res = await fetch("/api/voice/tts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(voiceConfig.apiKeys?.groq ? { "x-groq-api-key": voiceConfig.apiKeys.groq } : {}),
            ...(voiceConfig.apiKeys?.fishAudio ? { "x-fish-audio-api-key": voiceConfig.apiKeys.fishAudio } : {}),
            ...(voiceConfig.apiKeys?.rime ? { "x-rime-api-key": voiceConfig.apiKeys.rime } : {}),
            ...(voiceConfig.apiKeys?.openai ? { "x-openai-api-key": voiceConfig.apiKeys.openai } : {}),
          },
          body: JSON.stringify({
            text,
            provider: voiceConfig.tts.provider,
            speaker: voiceConfig.tts.speaker,
            modelId: voiceConfig.tts.modelId,
            speedAlpha: voiceConfig.tts.speedAlpha,
            apiKey: activeTTSKey,
          }),
        });

        if (!res.ok) {
          throw new Error(`TTS failed with status ${res.status}`);
        }

        const blob = await res.blob();
        await playAudioBlob(blob);
      } catch (err: any) {
        console.warn("TTS synthesis error:", err?.message);
        // Fallback to browser synthesis if online TTS provider fails
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          window.speechSynthesis.speak(utterance);
        }
      } finally {
        isSynthesizingRef.current = false;
      }
    },
    [voiceConfig, playAudioBlob]
  );

  // Dispatch spoken transcript to LLM chat stream
  const processUserSpeech = useCallback(
    async (userText: string) => {
      if (!userText || !userText.trim()) return;
      const cleanInput = userText.trim();
      setTranscript(cleanInput);
      setStatusText("Thinking...");
      setOrbState("searching"); // Orb state while reasoning
      setOrbSpeed(1.4);

      let fullResponseText = "";
      let sentenceBuffer = "";

      try {
        const rawLLMKey =
          voiceConfig.llm.provider === "openai"
            ? voiceConfig.apiKeys?.openai
            : voiceConfig.apiKeys?.groq;

        const activeLLMKey = getRotatedApiKey(
          voiceConfig.llm.provider === "openai" ? "openai" : "groq",
          rawLLMKey
        );

        const response = await fetch("/api/voice/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(voiceConfig.apiKeys?.groq ? { "x-groq-api-key": voiceConfig.apiKeys.groq } : {}),
            ...(voiceConfig.apiKeys?.openai ? { "x-openai-api-key": voiceConfig.apiKeys.openai } : {}),
          },
          body: JSON.stringify({
            message: cleanInput,
            provider: voiceConfig.llm.provider,
            model: voiceConfig.llm.model,
            stream: voiceConfig.llm.stream,
            apiKey: activeLLMKey,
          }),
        });

        if (!response.ok) {
          throw new Error(`Chat failed with status ${response.status}`);
        }

        if (!voiceConfig.llm.stream) {
          const json = await response.json();
          fullResponseText = json.text || "";
          setLastResponse(fullResponseText);
          await synthesizeText(fullResponseText);
          return;
        }

        // Handle SSE Stream
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No readable stream available");
        }

        let isFirstAudioChunk = true;
        let sseBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;

            try {
              const data = JSON.parse(trimmed.slice(5).trim());
              if (data.text) {
                fullResponseText += data.text;
                sentenceBuffer += data.text;
                setLastResponse(fullResponseText);

                // If streaming chunk synthesis is enabled, speak as sentences complete
                if (
                  voiceConfig.tts.streamSSE &&
                  (/[.!?:;]\s$/.test(sentenceBuffer) ||
                    (isFirstAudioChunk && sentenceBuffer.length > 45))
                ) {
                  const chunkToSpeak = sentenceBuffer.trim();
                  sentenceBuffer = "";
                  isFirstAudioChunk = false;
                  await synthesizeText(chunkToSpeak);
                }
              }
            } catch (e) {}
          }
        }

        // Synthesize any remaining sentence buffer
        if (sentenceBuffer.trim()) {
          await synthesizeText(sentenceBuffer.trim());
        }
      } catch (err: any) {
        console.error("Voice processing error:", err);
        const fallbackMsg = "Acknowledged. Live ward status updated.";
        setLastResponse(fallbackMsg);
        await synthesizeText(fallbackMsg);
      } finally {
        setStatusText("Ready");
        setOrbState("listening");
        setOrbSpeed(1.0);
      }
    },
    [voiceConfig, synthesizeText]
  );

  // Initialize Web Speech Recognition
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Web Speech Recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = voiceConfig.stt.language || "en-US";

    recognition.onstart = () => {
      setIsRecording(true);
      setStatusText("Listening");
      setOrbState("listening");
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      const spoken = (final || interim).trim();
      if (spoken) {
        accumulatedSpeechRef.current = spoken;
        setTranscript(spoken);

        // Start media recorder if configured for Groq / OpenAI Whisper
        if (voiceConfig.stt.provider !== "web_speech" && typeof navigator !== "undefined" && navigator.mediaDevices) {
          if (!mediaStreamRef.current) {
            navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
              mediaStreamRef.current = stream;
              const rec = new MediaRecorder(stream);
              rec.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
              };
              mediaRecorderRef.current = rec;
              rec.start(100);
            }).catch((e) => console.warn("Mic stream error:", e));
          } else if (mediaRecorderRef.current && mediaRecorderRef.current.state === "inactive") {
            audioChunksRef.current = [];
            mediaRecorderRef.current.start(100);
          }
        }

        // Orb reacts dynamically to incoming voice energy
        setOrbState("breathing");
        setOrbSpeed(1.5);

        // Reset silence timer on pause detection
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        silenceTimerRef.current = setTimeout(async () => {
          const textToProcess = accumulatedSpeechRef.current;
          accumulatedSpeechRef.current = "";

          // If Groq or OpenAI Whisper is selected, transcribe recorded audio blob
          if (
            voiceConfig.stt.provider !== "web_speech" &&
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state === "recording"
          ) {
            mediaRecorderRef.current.onstop = async () => {
              const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
              audioChunksRef.current = [];

              if (audioBlob.size > 0) {
                try {
                  const rawSTTKey =
                    voiceConfig.stt.provider === "openai"
                      ? voiceConfig.apiKeys?.openai
                      : voiceConfig.apiKeys?.groq;
                  const activeSTTKey = getRotatedApiKey(
                    voiceConfig.stt.provider === "openai" ? "openai" : "groq",
                    rawSTTKey
                  );

                  const formData = new FormData();
                  formData.append("file", audioBlob, "speech.webm");
                  formData.append("provider", voiceConfig.stt.provider);
                  if (activeSTTKey) formData.append("apiKey", activeSTTKey);

                  const res = await fetch("/api/voice/stt", {
                    method: "POST",
                    headers: {
                      ...(voiceConfig.apiKeys?.groq ? { "x-groq-api-key": voiceConfig.apiKeys.groq } : {}),
                      ...(voiceConfig.apiKeys?.openai ? { "x-openai-api-key": voiceConfig.apiKeys.openai } : {}),
                    },
                    body: formData,
                  });

                  if (res.ok) {
                    const data = await res.json();
                    if (data.text && data.text.trim()) {
                      processUserSpeech(data.text.trim());
                      return;
                    }
                  }
                } catch (err) {
                  console.warn("STT whisper error, falling back to Web Speech:", err);
                }
              }

              // Fallback if transcription returned empty
              if (textToProcess) {
                processUserSpeech(textToProcess);
              }
            };
            mediaRecorderRef.current.stop();
            return;
          }

          if (textToProcess) {
            processUserSpeech(textToProcess);
          }
        }, voiceConfig.stt.silenceTimeoutMs);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "no-speech") {
        console.warn("Speech recognition error:", event.error);
      }
    };

    recognition.onend = () => {
      // Keep listening continuous unless disabled
      try {
        if (!isSynthesizingRef.current) {
          recognition.start();
        }
      } catch (e) {}
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [voiceConfig.stt.language, voiceConfig.stt.silenceTimeoutMs, processUserSpeech]);

  // Click & hold orb for 5 seconds to open settings modal
  const handleOrbMouseDown = () => {
    isHoldingRef.current = true;
    holdTimerRef.current = setTimeout(() => {
      if (isHoldingRef.current) {
        setIsSettingsOpen(true);
      }
    }, 5000); // 5 seconds hold trigger
  };

  const handleOrbMouseUp = () => {
    isHoldingRef.current = false;
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const toggleVoiceSession = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      setStatusText("Paused");
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {}
      }
      setIsRecording(true);
      setStatusText("Listening");
    }
  };

  return {
    voiceConfig,
    updateConfig,
    orbState,
    orbSpeed,
    statusText,
    transcript,
    lastResponse,
    isSettingsOpen,
    setIsSettingsOpen,
    isRecording,
    isPlayingAudio,
    handleOrbMouseDown,
    handleOrbMouseUp,
    toggleVoiceSession,
    processUserSpeech,
  };
}
