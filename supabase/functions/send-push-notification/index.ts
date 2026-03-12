import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
    const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      console.error('OneSignal credentials not configured');
      return new Response(JSON.stringify({ error: 'OneSignal not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { type, record } = await req.json();

    let targetUser = '';
    let title = 'Couple Stars ✨';
    let message = 'You have a new update';

    if (type === 'message') {
      targetUser = record.receiver;
      title = `💬 New message from ${record.sender}`;
      message = record.type === 'text' 
        ? (record.content?.substring(0, 100) || 'New message') 
        : '📎 Sent a media file';
    } else if (type === 'star') {
      targetUser = record.receiver;
      title = `⭐ ${record.giver} gave you a star!`;
      message = record.reason || 'You received a star';
    } else if (type === 'milestone') {
      // Notify the other user about the milestone
      targetUser = record.username === 'Nani' ? 'Ammu' : 'Nani';
      title = '🎉 Milestone reached!';
      message = `${record.username} reached ${record.milestone_value} stars!`;
    } else {
      return new Response(JSON.stringify({ error: 'Unknown type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send push via OneSignal using filters to target specific user by tag
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        filters: [
          { field: 'tag', key: 'username', relation: '=', value: targetUser }
        ],
        headings: { en: title },
        contents: { en: message },
        // For Median.co apps
        ios_badgeType: 'Increase',
        ios_badgeCount: 1,
      }),
    });

    const result = await response.json();
    console.log('OneSignal response:', JSON.stringify(result));

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Push notification error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
