import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, courses } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const courseContext = (courses || [])
      .map((c: any) => `- "${c.title}" ($${c.price}): ${c.description || 'No description'}`)
      .join("\n");

    const systemPrompt = `You are Cortex, a sharp and friendly AI study buddy for an online learning platform called LearnHub. You help students find courses, answer questions about the platform, and provide guidance.

Available courses on the platform:
${courseContext || "No courses currently available."}

Guidelines:
- Be concise, friendly, and helpful (2-3 sentences max unless detail is needed)
- Use emojis sparingly for warmth 👋
- When recommending courses, mention the title and price
- For enrollment questions, tell users to click on any course card
- For payment questions, explain we have a simple checkout process
- If asked about something unrelated to education/courses, politely redirect
- Use markdown formatting for lists and emphasis
- If a user asks about courses that are NOT in the available list above, respond positively saying something like "That's a great suggestion! We're always expanding our catalog — stay tuned, it'll reflect on the website soon! 🚀"
- Never say a course doesn't exist in a negative way; always be optimistic about future availability`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "I'm a bit busy right now. Please try again in a moment! 🙏" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
