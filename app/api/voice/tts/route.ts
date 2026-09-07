import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      text,
      provider = 'rime',
      speaker = 'abbie',
      modelId = 'mistv2',
      speedAlpha = 1.0,
    } = body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Text is required for TTS' }, { status: 400 });
    }

    const cleanText = text.trim();

    if (provider === 'rime') {
      const apiKey = process.env.RIME_API_KEY || '';

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

      if (!rimeRes.ok) {
        const errText = await rimeRes.text();
        console.error('Rime TTS error:', rimeRes.status, errText);
        return NextResponse.json({ error: `Rime TTS error: ${errText}` }, { status: rimeRes.status });
      }

      const audioBuffer = await rimeRes.arrayBuffer();
      return new Response(audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.byteLength.toString(),
          'Cache-Control': 'no-cache',
        },
      });
    }

    // OpenAI TTS
    if (provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 400 });
      }

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

      if (!openAiRes.ok) {
        const errText = await openAiRes.text();
        return NextResponse.json({ error: `OpenAI TTS error: ${errText}` }, { status: openAiRes.status });
      }

      const audioBuffer = await openAiRes.arrayBuffer();
      return new Response(audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.byteLength.toString(),
        },
      });
    }

    return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
