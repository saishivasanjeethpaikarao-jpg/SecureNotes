import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { gameType, currentUser, partner, previousQuestions } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const gamePrompts: Record<string, string> = {
      'truth-or-dare': `Generate 1 unique romantic "Truth" question and 1 unique romantic "Dare" for a couple named ${currentUser} and ${partner}. Make them personal, fun, and relationship-focused. Return JSON: {"truth": "...", "dare": "..."}`,
      'would-you-rather': `Generate 1 unique romantic "Would You Rather" question for a couple named ${currentUser} and ${partner}. Make it thought-provoking and relationship-themed. Return JSON: {"option_a": "...", "option_b": "..."}`,
      'love-quiz': `Generate 1 unique fun personal question that ${currentUser} should ask ${partner} about themselves to test how well they know each other. Make it creative and personal. Return JSON: {"question": "..."}`,
      'never-have-i-ever': `Generate 1 unique romantic "Never Have I Ever" statement for a couple named ${currentUser} and ${partner}. Make it relatable and couple-focused. Return JSON: {"statement": "Never have I ever ..."}`,
      'this-or-that': `Generate 1 unique romantic "This or That" choice for a couple named ${currentUser} and ${partner}. Make it fun and relationship-themed. Return JSON: {"option_a": "...", "option_b": "..."}`,
      'complete-sentence': `Generate 1 unique romantic sentence completion prompt for a couple named ${currentUser} and ${partner}. Return JSON: {"sentence": "..."}`,
      'two-truths-lie': `Generate 1 unique "Two Truths and a Lie" topic prompt for a couple named ${currentUser} and ${partner}. Return JSON: {"prompt": "Tell 2 truths and 1 lie about ..."}`,
      '21-questions': `Generate 1 unique deep, meaningful question for a couple named ${currentUser} and ${partner} to discuss. Return JSON: {"question": "..."}`,
    };

    const prompt = gamePrompts[gameType] || gamePrompts['21-questions'];
    const avoidList = previousQuestions?.length
      ? `\n\nDo NOT repeat any of these previously asked questions:\n${previousQuestions.slice(-10).join('\n')}`
      : '';

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You are a romantic relationship expert creating personalized couple game questions. Always respond with valid JSON only, no markdown formatting." },
          { role: "user", content: prompt + avoidList },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    
    // Parse JSON from response, handling potential markdown wrapping
    let parsed;
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = { error: "Failed to parse AI response" };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-questions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
