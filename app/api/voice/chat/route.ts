import { NextResponse } from 'next/server';
import { buildWardSystemPrompt } from '@/lib/voice/ward-prompt';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      message,
      history = [],
      provider = 'groq',
      model = 'qwen/qwen3.8-27b',
      stream = true,
    } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const systemPrompt = await buildWardSystemPrompt();
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ];

    const userApiKey =
      body.apiKey ||
      (provider === 'openai'
        ? request.headers.get('x-openai-api-key')
        : request.headers.get('x-groq-api-key'));

    const apiKey =
      userApiKey ||
      (provider === 'openai'
        ? process.env.OPENAI_API_KEY
        : process.env.GROQ_API_KEY);

    const endpoint =
      provider === 'openai'
        ? 'https://api.openai.com/v1/chat/completions'
        : 'https://api.groq.com/openai/v1/chat/completions';

    if (!apiKey) {
      // Graceful fallback response if keys are missing
      const mockResponse = `Warden operational assistant: acknowledged "${message}". Live telemetry and ward model active.`;
      if (stream) {
        const encoder = new TextEncoder();
        const customStream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: mockResponse, done: false })}\n\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: '', done: true })}\n\n`));
            controller.close();
          },
        });
        return new Response(customStream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        });
      }
      return NextResponse.json({ text: mockResponse });
    }

    // Call upstream LLM (Groq / OpenAI)
    const upstreamRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || (provider === 'openai' ? 'gpt-4o-mini' : 'qwen/qwen3.8-27b'),
        messages,
        temperature: 0.4,
        max_tokens: 150,
        stream: !!stream,
      }),
    });

    if (!upstreamRes.ok) {
      const errText = await upstreamRes.text();
      console.error('LLM error:', upstreamRes.status, errText);
      return NextResponse.json({ error: `LLM upstream error: ${errText}` }, { status: 502 });
    }

    if (!stream) {
      const json = await upstreamRes.json();
      const text = json.choices?.[0]?.message?.content || '';
      return NextResponse.json({ text });
    }

    // Stream SSE events forward to client
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = upstreamRes.body?.getReader();

    if (!reader) {
      return NextResponse.json({ error: 'No response body from LLM stream' }, { status: 500 });
    }

    const readableStream = new ReadableStream({
      async start(controller) {
        let buffer = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data:')) continue;
              if (trimmed === 'data: [DONE]') {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: '', done: true })}\n\n`));
                continue;
              }
              try {
                const parsed = JSON.parse(trimmed.slice(5).trim());
                const delta = parsed.choices?.[0]?.delta?.content || '';
                if (delta) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ text: delta, done: false })}\n\n`)
                  );
                }
              } catch (e) {
                // Ignore parse errors on partial frames
              }
            }
          }
        } catch (err: any) {
          console.error('Stream processing error:', err);
        } finally {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: '', done: true })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
