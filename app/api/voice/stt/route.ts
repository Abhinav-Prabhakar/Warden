import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function parseKeys(raw?: string | null): string[] {
  if (!raw || typeof raw !== 'string') return [];
  return raw.split(',').map((k) => k.trim()).filter((k) => k.length > 0);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob | null;
    const provider = (formData.get('provider') as string) || 'groq';
    const formApiKey = (formData.get('apiKey') as string) || null;

    if (!file) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    if (provider === 'groq') {
      const headerKey = request.headers.get('x-groq-api-key');
      const raw = [formApiKey, headerKey, process.env.GROQ_API_KEY].filter(Boolean).join(',');
      const keys = Array.from(new Set(parseKeys(raw)));

      if (keys.length === 0) {
        return NextResponse.json({ error: 'GROQ API key not configured' }, { status: 400 });
      }

      let lastError = 'Groq STT transcription failed';
      let lastStatus = 500;

      for (const apiKey of keys) {
        try {
          const groqFormData = new FormData();
          groqFormData.append('file', file, 'audio.wav');
          groqFormData.append('model', 'whisper-large-v3-turbo');
          groqFormData.append('language', 'en');

          const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
            body: groqFormData,
          });

          if (groqRes.ok) {
            const data = await groqRes.json();
            return NextResponse.json({ text: data.text || '' });
          }

          lastStatus = groqRes.status;
          lastError = await groqRes.text();
          console.warn(`Groq STT key failed (${lastStatus}): ${lastError}`);

          if (lastStatus !== 429 && lastStatus !== 401) {
            break;
          }
        } catch (e: any) {
          lastError = e.message;
        }
      }

      return NextResponse.json({ error: `Groq STT error: ${lastError}` }, { status: lastStatus });
    }

    if (provider === 'openai') {
      const headerKey = request.headers.get('x-openai-api-key');
      const raw = [formApiKey, headerKey, process.env.OPENAI_API_KEY].filter(Boolean).join(',');
      const keys = Array.from(new Set(parseKeys(raw)));

      if (keys.length === 0) {
        return NextResponse.json({ error: 'OPENAI API key not configured' }, { status: 400 });
      }

      let lastError = 'OpenAI STT transcription failed';
      let lastStatus = 500;

      for (const apiKey of keys) {
        try {
          const openAiFormData = new FormData();
          openAiFormData.append('file', file, 'audio.wav');
          openAiFormData.append('model', 'whisper-1');

          const openAiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
            body: openAiFormData,
          });

          if (openAiRes.ok) {
            const data = await openAiRes.json();
            return NextResponse.json({ text: data.text || '' });
          }

          lastStatus = openAiRes.status;
          lastError = await openAiRes.text();
          if (lastStatus !== 429 && lastStatus !== 401) {
            break;
          }
        } catch (e: any) {
          lastError = e.message;
        }
      }

      return NextResponse.json({ error: `OpenAI STT error: ${lastError}` }, { status: lastStatus });
    }

    return NextResponse.json({ error: `Unsupported STT provider: ${provider}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
