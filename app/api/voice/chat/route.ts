import { NextResponse } from 'next/server';
import { buildWardSystemPrompt } from '@/lib/voice/ward-prompt';
import { WARDEN_VOICE_TOOLS, executeVoiceTool } from '@/lib/voice/tools';

export const runtime = 'nodejs';

const latestRevisionBySession = new Map<string, number>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      message,
      history = [],
      provider = 'groq',
      model = 'qwen/qwen3.8-27b',
      stream = true,
      sessionId,
      operationId,
      revision,
    } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (sessionId && Number.isInteger(revision)) {
      const latest = latestRevisionBySession.get(sessionId) || 0;
      if (revision < latest) {
        return NextResponse.json({ error: 'Obsolete voice operation discarded', operationId, revision }, { status: 409 });
      }
      latestRevisionBySession.set(sessionId, revision);
    }

    const assertCurrent = () => {
      if (request.signal.aborted) throw new DOMException('Voice operation aborted', 'AbortError');
      if (sessionId && Number.isInteger(revision) && latestRevisionBySession.get(sessionId) !== revision) {
        throw new Error('STALE_VOICE_OPERATION');
      }
    };

    const systemPrompt = await buildWardSystemPrompt();
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ];

    function parseKeys(raw?: string | null): string[] {
      if (!raw || typeof raw !== 'string') return [];
      return raw.split(',').map((k) => k.trim()).filter((k) => k.length > 0);
    }

    const headerKey =
      provider === 'openai'
        ? request.headers.get('x-openai-api-key')
        : request.headers.get('x-groq-api-key');

    const envKey =
      provider === 'openai'
        ? process.env.OPENAI_API_KEY
        : process.env.GROQ_API_KEY;

    const raw = [body.apiKey, headerKey, envKey].filter(Boolean).join(',');
    const keys = Array.from(new Set(parseKeys(raw)));

    const endpoint =
      provider === 'openai'
        ? 'https://api.openai.com/v1/chat/completions'
        : 'https://api.groq.com/openai/v1/chat/completions';

    if (keys.length === 0) {
      return NextResponse.json(
        {
          error: `${provider === 'openai' ? 'OPENAI_API_KEY' : 'GROQ_API_KEY'} is not configured`,
          code: 'REASONING_PROVIDER_NOT_CONFIGURED',
          configured: false,
        },
        { status: 503 },
      );
    }

    // Helper to call upstream LLM with failover across key pool
    async function callUpstreamLLM(payload: Record<string, any>): Promise<{ res: Response | null; lastStatus: number; lastError: string }> {
      let upstreamRes: Response | null = null;
      let lastError = 'LLM upstream call failed';
      let lastStatus = 500;

      for (const apiKey of keys) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (res.ok) {
            upstreamRes = res;
            break;
          }

          lastStatus = res.status;
          lastError = await res.text();
          console.warn(`LLM key attempt failed (${lastStatus}): ${lastError}`);

          if (lastStatus !== 429 && lastStatus !== 401) {
            break;
          }
        } catch (e: any) {
          lastError = e.message;
        }
      }

      return { res: upstreamRes, lastStatus, lastError };
    }

    const selectedModel = model || (provider === 'openai' ? 'gpt-4o-mini' : 'qwen/qwen3.8-27b');

    // 1. Initial reasoning step with Tool Calling enabled
    const initialPayload: Record<string, any> = {
      model: selectedModel,
      messages,
      temperature: 0.3,
      max_tokens: 220,
      tools: WARDEN_VOICE_TOOLS,
      tool_choice: 'auto',
      stream: false,
    };

    const { res: initialRes, lastStatus, lastError } = await callUpstreamLLM(initialPayload);
    assertCurrent();

    if (!initialRes || !initialRes.ok) {
      console.error('LLM initial error:', lastStatus, lastError);
      return NextResponse.json({ error: `LLM upstream error: ${lastError}` }, { status: lastStatus });
    }

    const initialJson = await initialRes.json();
    const choice = initialJson.choices?.[0];
    const toolCalls = choice?.message?.tool_calls;

    // 2. If the LLM invoked tools to query Supabase
    if (toolCalls && toolCalls.length > 0) {
      messages.push(choice.message);

      for (const call of toolCalls) {
        assertCurrent();
        let args = {};
        try {
          args = JSON.parse(call.function.arguments || '{}');
        } catch {}

        const toolResult = await executeVoiceTool(call.function.name, args, { operationId, revision, sessionId });
        assertCurrent();
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(toolResult),
        });
      }

      // Final response step after tool execution
      const finalPayload: Record<string, any> = {
        model: selectedModel,
        messages,
        temperature: 0.3,
        max_tokens: 180,
        stream: !!stream,
      };

      const { res: finalRes, lastStatus: fStatus, lastError: fErr } = await callUpstreamLLM(finalPayload);
      assertCurrent();
      if (!finalRes || !finalRes.ok) {
        return NextResponse.json({ error: `LLM final error: ${fErr}` }, { status: fStatus });
      }

      if (!stream) {
        const finalJson = await finalRes.json();
        const text = finalJson.choices?.[0]?.message?.content || '';
        return NextResponse.json({ text });
      }

      // Stream SSE from final step
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const reader = finalRes.body?.getReader();
      if (!reader) {
        return NextResponse.json({ error: 'No response body from stream' }, { status: 500 });
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
                } catch {}
              }
            }
          } catch (err) {
            console.error('Stream reader error:', err);
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
    }

    // 3. No tools called — return direct response
    const directText = choice?.message?.content || '';

    if (!stream) {
      return NextResponse.json({ text: directText });
    }

    // Emit direct response as fast SSE chunks for voice synthesis
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      start(controller) {
        const sentences = directText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [directText];
        for (const s of sentences) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: s, done: false })}\n\n`));
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: '', done: true })}\n\n`));
        controller.close();
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
    if (err?.message === 'STALE_VOICE_OPERATION' || err?.name === 'AbortError') {
      return NextResponse.json({ error: 'Obsolete voice operation discarded' }, { status: 409 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
