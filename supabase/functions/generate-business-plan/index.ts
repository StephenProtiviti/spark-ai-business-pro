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
    const { idea, objective, beneficiaries, success, businessBenefits, refinement, currentHtml } = await req.json();

    const isRefinement = refinement && currentHtml;

    if (!isRefinement && !idea) {
      return new Response(JSON.stringify({ error: "No idea provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let messages;

    if (isRefinement) {
      messages = [
        {
          role: "system",
          content: `You are a senior business analyst. You will be given an existing business plan document in HTML and a refinement request. Apply the requested changes and return the COMPLETE updated HTML document.

Rules:
- Output ONLY valid HTML. No markdown, no code fences, no explanation text.
- Output a COMPLETE document starting with <!DOCTYPE html>.
- Keep all existing styling and structure intact unless the refinement specifically asks to change it.
- Apply the requested changes precisely and thoroughly.
- The HTML must be fully self-contained (inline styles, no external dependencies).`,
        },
        {
          role: "user",
          content: `Here is the current business plan HTML:\n\n${currentHtml}\n\n---\n\nPlease apply the following changes:\n${refinement}`,
        },
      ];
    } else {
      const systemPrompt = `You are a senior business analyst and strategy consultant. Given an idea and its context, generate a single-page business analysis document in clean, self-contained HTML.

Rules:
- Output ONLY valid HTML. No markdown, no code fences, no explanation text.
- Output a COMPLETE document starting with <!DOCTYPE html>.
- Use inline CSS with a professional, executive-ready design. Use system-ui font, clean typography, and a muted color palette (#1e3a5f navy, #f97316 accent orange, #f8fafc backgrounds).
- The document should be structured as a ONE-PAGE business brief containing these sections:

1. **Executive Summary** — A 2-3 sentence overview of the idea and its strategic value.
2. **Business Benefits** — 3-5 key benefits with brief descriptions. Use icons (unicode) for visual appeal.
3. **Target Audience & Impact** — Who benefits and how, with quantifiable impact where possible.
4. **Risk Assessment** — 3-4 key risks with mitigation strategies, presented in a risk matrix or table.
5. **Implementation Roadmap** — A phased timeline (Phase 1: Discovery, Phase 2: MVP, Phase 3: Scale) with key milestones.
6. **Success Metrics** — 3-5 KPIs that will measure the initiative's success.
7. **Recommendation** — A clear go/no-go recommendation with rationale.

- Make it look like a professional consulting deliverable — use cards, subtle borders, icons, and clear hierarchy.
- Include realistic, specific content derived from the inputs — NOT generic boilerplate.
- Make it responsive and printable.
- The HTML must be fully self-contained (inline styles, no external dependencies).`;

      const userPrompt = `Generate a single-page business analysis document for the following idea:

**Idea:** ${idea}

**Primary Objective:** ${objective || "Not specified"}

**Target Users & Impact:** ${beneficiaries || "Not specified"}

**Success Criteria:** ${success || "Not specified"}

**Business Benefits & Value Proposition:** ${businessBenefits || "Not specified"}

Create a compelling, executive-ready business brief that highlights the strategic value, risks, and implementation roadmap for this initiative.`;

      messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ];
    }

    const attempts = [
      { model: "google/gemini-3-flash-preview", timeoutMs: 65000 },
      { model: "google/gemini-2.5-flash", timeoutMs: 65000 },
    ];

    let response: Response | null = null;
    let lastError: unknown = null;

    for (const attempt of attempts) {
      try {
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: attempt.model,
            messages,
            stream: false,
            temperature: 0.5,
            max_tokens: 8000,
          }),
          signal: AbortSignal.timeout(attempt.timeoutMs),
        });

        response = resp;
        if (resp.ok) break;
        if (resp.status >= 500 || resp.status === 408) continue;
        break;
      } catch (error) {
        console.error(`Model request failed for ${attempt.model}:`, error);
        lastError = error;
      }
    }

    if (!response) {
      const message = lastError instanceof Error ? lastError.message : "Business plan generation timed out";
      return new Response(
        JSON.stringify({ error: message }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate business plan" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    let html = "";

    if (typeof content === "string") {
      html = content;
    } else if (Array.isArray(content)) {
      html = content.map((part: { text?: string }) => part?.text || "").join("");
    }

    // Clean up markdown fences if present
    const htmlMatch = html.match(/```html\s*([\s\S]*?)```/);
    if (htmlMatch) {
      html = htmlMatch[1].trim();
    }

    if (!html.includes("<!DOCTYPE html>")) {
      html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Business Plan</title></head><body>${html}</body></html>`;
    }

    return new Response(JSON.stringify({ html }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-business-plan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
