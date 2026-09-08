import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function parseKeys(raw?: string | null): string[] {
  if (!raw || typeof raw !== 'string') return [];
  return raw.split(',').map((k) => k.trim()).filter((k) => k.length > 0);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      text,
      provider = 'fish_audio',
      speaker = 'default',
      modelId,
      speedAlpha = 1.0,
    } = body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Text is required for TTS' }, { status: 400 });
    }

    const cleanText = text.trim();
    const userApiKey =
      body.apiKey ||
      request.headers.get('x-groq-api-key') ||
      request.headers.get('x-fish-audio-api-key') ||
      request.headers.get('x-rime-api-key') ||
      request.headers.get('x-openai-api-key');

    // 1. Groq TTS (canopylabs/orpheus-v1-english)
    if (provider === 'groq') {
      const raw = [body.apiKey, request.headers.get('x-groq-api-key'), process.env.GROQ_API_KEY].filter(Boolean).join(',');
      const keys = Array.from(new Set(parseKeys(raw)));
      if (keys.length === 0) {
        return NextResponse.json({ error: 'GROQ API key is not configured' }, { status: 400 });
      }

      const groqModel = modelId || 'canopylabs/orpheus-v1-english';
      const groqVoice = speaker || 'troy';

      let lastError = 'Failed to synthesize audio with Groq';
      let lastStatus = 500;

      for (const apiKey of keys) {
        try {
          const groqRes = await fetch('https://api.groq.com/openai/v1/audio/speech', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: groqModel,
              voice: groqVoice,
              input: cleanText,
              response_format: 'wav',
            }),
          });

          if (groqRes.ok) {
            const audioBuffer = await groqRes.arrayBuffer();
            return new Response(audioBuffer, {
              headers: {
                'Content-Type': 'audio/wav',
                'Content-Length': audioBuffer.byteLength.toString(),
                'Cache-Control': 'no-cache',
                'X-TTS-Provider': 'groq',
              },
            });
          }

          lastStatus = groqRes.status;
          lastError = await groqRes.text();
          console.warn(`Groq TTS key failed with status ${lastStatus}: ${lastError}`);

          // If not rate limited (429) or auth issue (401), stop retry
          if (lastStatus !== 429 && lastStatus !== 401) {
            break;
          }
        } catch (e: any) {
          lastError = e.message;
        }
      }

      return NextResponse.json({ error: `Groq TTS error: ${lastError}` }, { status: lastStatus });
    }

    // 2. Fish Audio TTS
    if (provider === 'fish_audio') {
      const raw = [body.apiKey, request.headers.get('x-fish-audio-api-key'), process.env.FISH_AUDIO_API_KEY].filter(Boolean).join(',');
      const keys = Array.from(new Set(parseKeys(raw)));
      const selectedModel = modelId || 's2.1-pro-free';

      const candidateKeys = keys.length > 0 ? keys : [''];

      for (const apiKey of candidateKeys) {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          model: selectedModel,
        };
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const fishRes = await fetch('https://api.fish.audio/v1/tts', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            text: cleanText,
            format: 'mp3',
            latency: 'low',
          }),
        });

        if (fishRes.ok) {
          const audioBuffer = await fishRes.arrayBuffer();
          return new Response(audioBuffer, {
            headers: {
              'Content-Type': 'audio/mpeg',
              'Content-Length': audioBuffer.byteLength.toString(),
              'Cache-Control': 'no-cache',
              'X-TTS-Provider': 'fish_audio',
            },
          });
        }
      }

      // Fallback to Rime if available
      const rimeApiKey = process.env.RIME_API_KEY || '';
      const rimeRes = await fetch('https://users.rime.ai/v1/rime-tts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${rimeApiKey}`,
          'Content-Type': 'application/json',
          Accept: 'audio/mp3',
        },
        body: JSON.stringify({
          text: cleanText,
          speaker: 'abbie',
          modelId: 'mistv2',
          speedAlpha: 1.0,
        }),
      });

      if (rimeRes.ok) {
        const audioBuffer = await rimeRes.arrayBuffer();
        return new Response(audioBuffer, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.byteLength.toString(),
            'Cache-Control': 'no-cache',
            'X-TTS-Provider': 'rime-fallback',
          },
        });
      }

      return NextResponse.json(
        { error: 'Fish Audio TTS error and fallback failed' },
        { status: 500 }
      );
    }

    // 3. Rime AI TTS
    if (provider === 'rime') {
      const raw = [body.apiKey, request.headers.get('x-rime-api-key'), process.env.RIME_API_KEY, ''].filter(Boolean).join(',');
      const keys = Array.from(new Set(parseKeys(raw)));

      for (const apiKey of keys) {
        const rimeRes = await fetch('https://users.rime.ai/v1/rime-tts', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'audio/mp3',
          },
          body: JSON.stringify({
            text: cleanText,
            speaker: speaker || 'abbie',
            modelId: modelId || 'mistv2',
            speedAlpha: typeof speedAlpha === 'number' ? speedAlpha : 1.0,
          }),
        });

        if (rimeRes.ok) {
          const audioBuffer = await rimeRes.arrayBuffer();
          return new Response(audioBuffer, {
            headers: {
              'Content-Type': 'audio/mpeg',
              'Content-Length': audioBuffer.byteLength.toString(),
              'Cache-Control': 'no-cache',
            },
          });
        }
      }

      return NextResponse.json({ error: 'Rime TTS failed across configured keys' }, { status: 500 });
    }

    // 4. OpenAI TTS
    if (provider === 'openai') {
      const raw = [body.apiKey, request.headers.get('x-openai-api-key'), process.env.OPENAI_API_KEY].filter(Boolean).join(',');
      const keys = Array.from(new Set(parseKeys(raw)));
      if (keys.length === 0) {
        return NextResponse.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 400 });
      }

      for (const apiKey of keys) {
        const openAiRes = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: cleanText,
            voice: speaker || 'alloy',
          }),
        });

        if (openAiRes.ok) {
          const audioBuffer = await openAiRes.arrayBuffer();
          return new Response(audioBuffer, {
            headers: {
              'Content-Type': 'audio/mpeg',
              'Content-Length': audioBuffer.byteLength.toString(),
            },
          });
        }
      }

      return NextResponse.json({ error: 'OpenAI TTS failed across configured keys' }, { status: 500 });
    }

    return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
