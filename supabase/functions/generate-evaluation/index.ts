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
    const { scenario, idea, answers, recommendations, refinement, currentHtml } = await req.json();

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
          content: `You are a senior innovation analyst. You will be given an existing evaluation document in HTML and a refinement request. Apply the requested changes and return the COMPLETE updated HTML document.

Rules:
- Output ONLY valid HTML. No markdown, no code fences, no explanation text.
- Output a COMPLETE document starting with <!DOCTYPE html>.
- Keep all existing styling and structure intact unless the refinement specifically asks to change it.
- Apply the requested changes precisely and thoroughly.
- The HTML must be fully self-contained (inline styles, no external dependencies).`,
        },
        {
          role: "user",
          content: `Here is the current evaluation document HTML:\n\n${currentHtml}\n\n---\n\nPlease apply the following changes:\n${refinement}`,
        },
      ];
    } else {
      const systemPrompt = `You are a senior innovation analyst evaluating idea submissions for a review board. Given an idea, its scenario type, and the submitter's answers, generate a professional evaluation document in clean, self-contained HTML.

Rules:
- Output ONLY valid HTML. No markdown, no code fences, no explanation text.
- Output a COMPLETE document starting with <!DOCTYPE html>.
- Use inline CSS with a professional, executive-ready design. Use system-ui font, clean typography, and a muted color palette (#1e3a5f navy, #f97316 accent orange, #f8fafc backgrounds).
- The main title/header of the document should be the specific idea title derived from the submission — NOT a generic "IDEA EVALUATION REPORT" heading. Use the idea name/title as the prominent H1 header at the top.
- The document should be structured as an evaluation report containing these sections:

1. **Submission Overview** — Scenario type, idea title, date, and a 2-3 sentence executive summary.
2. **Pros / Strengths** — 3-5 bullet points highlighting the strongest aspects of the idea (strategic fit, innovation, potential value, etc.).
3. **Cons / Weaknesses** — 3-5 bullet points covering limitations, gaps, or concerns.
4. **Risk Analysis** — 3-4 key risks with severity ratings (High/Medium/Low) and mitigations, presented in a clean table.
5. **Tangible Metrics & Considerations** — Qualitative indicators such as estimated effort level (Low/Medium/High), time-to-value, required resources, dependencies, and target audience/impact scope. Use descriptive labels — DO NOT assign numeric scores.
6. **Existing Solutions Considered** — If recommendations were shown, list them and note whether the submitter chose to proceed anyway and why.
7. **Recommended Next Steps** — Clear actionable steps for the review board: Approve / Needs More Info / Redirect to Existing Solution / Decline.
8. **Triage Routing** — Based on the scenario type, indicate which team(s) should be notified (IT, AI Studio, Platform Engineering, etc.).

- IMPORTANT: Do NOT include any numeric scores, ratings out of 10/100, score bars, or overall score summaries anywhere in the document. Focus only on qualitative analysis, pros/cons, risks, and tangible descriptive metrics.
- Use clean tables, color-coded severity tags (for risks only), and clear hierarchy.
- Include realistic, specific content derived from the inputs — NOT generic boilerplate.
- Make it responsive and printable.
- The HTML must be fully self-contained (inline styles, no external dependencies).`;

      const userPrompt = `Generate an idea evaluation document for the review board:

**Scenario Type:** ${scenario}

**Idea:** ${idea}

**Submitter's Answers:**
${Object.entries(answers || {}).map(([q, a]) => `- ${q}: ${a}`).join("\n")}

**Existing Solutions Shown:** ${recommendations?.length ? recommendations.map((r: any) => r.name).join(", ") : "None"}
**Submitter Chose to Proceed:** Yes (submitted as new idea)

Create a thorough qualitative evaluation (no numeric scores) that helps the review board make an informed decision.`;

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
      const message = lastError instanceof Error ? lastError.message : "Evaluation generation timed out";
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
        JSON.stringify({ error: "Failed to generate evaluation" }),
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

    const htmlMatch = html.match(/```html\s*([\s\S]*?)```/);
    if (htmlMatch) {
      html = htmlMatch[1].trim();
    }

    if (!html.includes("<!DOCTYPE html>")) {
      html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Idea Evaluation</title></head><body>${html}</body></html>`;
    }

    return new Response(JSON.stringify({ html }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-evaluation error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
