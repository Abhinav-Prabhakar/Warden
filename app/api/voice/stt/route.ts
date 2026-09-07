import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob | null;
    const provider = (formData.get('provider') as string) || 'groq';

    if (!file) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    if (provider === 'groq') {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 400 });
      }

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

      if (!groqRes.ok) {
        const errText = await groqRes.text();
        return NextResponse.json({ error: `Groq STT error: ${errText}` }, { status: groqRes.status });
      }

      const data = await groqRes.json();
      return NextResponse.json({ text: data.text || '' });
    }

    if (provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 400 });
      }

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

      if (!openAiRes.ok) {
        const errText = await openAiRes.text();
        return NextResponse.json({ error: `OpenAI STT error: ${errText}` }, { status: openAiRes.status });
      }

      const data = await openAiRes.json();
      return NextResponse.json({ text: data.text || '' });
    }

    return NextResponse.json({ error: `Unsupported STT provider: ${provider}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
