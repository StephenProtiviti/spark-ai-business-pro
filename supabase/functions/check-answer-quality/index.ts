import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, answer, scenario } = await req.json();

    if (!question || typeof answer !== "string") {
      return new Response(JSON.stringify({ sufficient: true, followUp: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // Fail open — never block the user.
      return new Response(JSON.stringify({ sufficient: true, followUp: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an intake assistant for an innovation review board. You evaluate whether a user's answer to an intake question gives the review board enough SUBSTANCE to evaluate the idea.

CRITICAL RULES:
- Judge by MEANING ONLY. Never use length as a signal. A two-word answer like "Jane Doe" or "Q3 2026" can fully answer a factual question. A 200-word answer that dodges the question is insufficient.
- If the question is factual or closed-ended (a name, a date, a yes/no, a multiple-choice selection, a contact, an audience size, a timeline), and the user gave a plausible direct answer to it, return sufficient=true. Do NOT ask them to elaborate on factual questions.
- If the question is open-ended (describe the idea, what problem it solves, expected outcomes, proposed solution, deliverables), check whether the answer actually addresses the substance of what was asked. If it's vague, generic, evasive ("not sure", "tbd", "see above"), off-topic, or only restates the question without adding content, return sufficient=false.
- When insufficient, produce ONE short, friendly follow-up question (max 25 words) that asks for the single most useful missing piece. Frame it as helping the review board, not as criticism. Do not ask multiple things at once.
- Never demand more detail just because you'd like more. Only flag insufficient when the answer genuinely fails to address the question.

Respond with ONLY a valid JSON object in this exact shape, no markdown, no code fences:
{"sufficient": boolean, "followUp": string | null}

If sufficient is true, followUp must be null.`;

    const userPrompt = `Scenario: ${scenario || "Idea intake"}
Question asked: ${question}
User's answer: ${answer}

Evaluate based on meaning, not length. Return JSON.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 200,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      // Fail open
      return new Response(JSON.stringify({ sufficient: true, followUp: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await response.json();
    const raw = payload?.choices?.[0]?.message?.content ?? "";
    let parsed: { sufficient: boolean; followUp: string | null } = { sufficient: true, followUp: null };
    try {
      const text = typeof raw === "string" ? raw : Array.isArray(raw) ? raw.map((p: any) => p?.text || "").join("") : "";
      const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
      const obj = JSON.parse(cleaned);
      parsed = {
        sufficient: obj.sufficient !== false,
        followUp: obj.sufficient === false && typeof obj.followUp === "string" ? obj.followUp.trim() : null,
      };
    } catch (_) {
      // Fail open
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-answer-quality error:", e);
    // Fail open — never block the intake on an evaluator failure.
    return new Response(JSON.stringify({ sufficient: true, followUp: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
