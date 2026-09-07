import { NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const room = searchParams.get('room') || 'warden-room';
    const username = searchParams.get('username') || `nurse-${Math.floor(Math.random() * 1000)}`;

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        {
          error: 'LiveKit server credentials (LIVEKIT_API_KEY / LIVEKIT_API_SECRET) not set.',
          configured: false,
        },
        { status: 200 }
      );
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: username,
      ttl: '1h',
    });

    at.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      url: livekitUrl,
      configured: true,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
