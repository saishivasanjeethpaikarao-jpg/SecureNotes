// Daily.co room + token provisioning
// Creates the shared room (idempotent) and mints a meeting token for the user.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ROOM_NAME = 'nani-ammu-love-room';

async function ensureRoom(apiKey: string): Promise<void> {
  // Check if room exists
  const checkRes = await fetch(`https://api.daily.co/v1/rooms/${ROOM_NAME}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (checkRes.ok) return;

  // Create the room — persistent, private, audio + video allowed
  const createRes = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: ROOM_NAME,
      privacy: 'private',
      properties: {
        max_participants: 2,
        enable_chat: false,
        enable_screenshare: true,
        start_video_off: false,
        start_audio_off: false,
        eject_at_room_exp: false,
      },
    }),
  });
  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`Daily room creation failed: ${createRes.status} ${text}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('DAILY_API_KEY');
    if (!apiKey) throw new Error('DAILY_API_KEY not configured');

    const { username, callType } = await req.json();
    if (!username) throw new Error('username required');

    await ensureRoom(apiKey);

    // Mint a meeting token (1 hour expiry)
    const tokenRes = await fetch('https://api.daily.co/v1/meeting-tokens', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          room_name: ROOM_NAME,
          user_name: username,
          exp: Math.floor(Date.now() / 1000) + 60 * 60,
          start_video_off: callType === 'audio',
          start_audio_off: false,
        },
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      throw new Error(`Token creation failed: ${tokenRes.status} ${text}`);
    }

    const { token } = await tokenRes.json();
    const url = `https://${apiKey.includes('.') ? apiKey.split('.')[0] : 'cloud'}.daily.co/${ROOM_NAME}`;

    // Use the standard daily.co URL pattern — actual subdomain comes from the room object
    const roomRes = await fetch(`https://api.daily.co/v1/rooms/${ROOM_NAME}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const room = await roomRes.json();

    return new Response(
      JSON.stringify({ token, url: room.url, roomName: ROOM_NAME }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('[daily-token] error:', err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
