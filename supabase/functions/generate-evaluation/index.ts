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
    const { scenario, idea, answers, recommendations, refinement, currentHtml, submissionDate, requestType, triageRecommendation } = await req.json();

    const isRefinement = refinement && currentHtml;
    const isSupportRequest = requestType === "support";

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
- If this is a support request, preserve support-language labels: use "Submission Support Request" / "Support Request" and do not use "Innovation Idea Brief".
- The HTML must be fully self-contained (inline styles, no external dependencies).`,
        },
        {
          role: "user",
          content: `Here is the current evaluation document HTML:\n\n${currentHtml}\n\n---\n\nPlease apply the following changes:\n${refinement}`,
        },
      ];
    } else {
      const documentLabel = isSupportRequest ? "Submission Support Request" : "Innovation Idea Brief";
      const boardLabel = isSupportRequest ? "Innovation Review Board — Support Request" : "Innovation Review Board — Idea Brief";
      const documentStructureLabel = isSupportRequest ? "a Submission Support Request" : "an Innovation Idea Brief";
      const intakeType = isSupportRequest ? "support request" : "idea submission";
      const titleType = isSupportRequest ? "request" : "idea";
      const overviewHeading = isSupportRequest ? "Request Overview" : "Submission Overview";
      const boardPurpose = isSupportRequest
        ? "review incoming support requests and decide how to route, scope, and fulfill them"
        : "evaluate incoming idea submissions and decide whether to advance, redirect, or decline them";

      const systemPrompt = `You are a senior innovation analyst preparing a briefing for the Innovation Review Board — a cross-functional panel of senior leaders (innovation, technology, operations, strategy, and finance) who ${boardPurpose}. Your audience is time-constrained, analytical, and outcome-oriented. They are not the submitter, and they have not seen the raw intake conversation.

Audience & Tone:
- Write in the third person, referring to the submitter as "the submitter" or by role — never "you" or "your idea."
- Voice: precise, evidence-based, neutral, and decision-ready. Think internal audit memo or investment committee brief — concise, no marketing language, no motivational filler, no second-person coaching.
- Lead with what the board needs to decide and why. Surface signal over narrative. Favor declarative statements, qualified claims ("appears to," "indicates," "lacks evidence of"), and explicit callouts of unknowns or assumptions.
- Avoid hype words ("revolutionary," "game-changing," "exciting"), hedging filler ("it could be argued"), and direct address. Do not thank or congratulate the submitter.
- Where the intake answers are thin, say so plainly (e.g., "Success criteria not specified by submitter — board may wish to clarify before advancing.").

Rules:
- Output ONLY valid HTML. No markdown, no code fences, no explanation text.
- Output a COMPLETE document starting with <!DOCTYPE html>.
- Use inline CSS with a professional, executive-ready design. Use system-ui font, clean typography, and a muted color palette (#1e3a5f navy, #f97316 accent orange, #f8fafc backgrounds).
- For ${isSupportRequest ? "support requests" : "idea submissions"}, the top-of-document label, eyebrow, and browser title must use "${documentLabel}" / "Support Request" language, not "Innovation Idea Brief" language.
- The main title/header of the document should be the specific ${titleType} title derived from the ${intakeType} — NOT a generic "${documentLabel.toUpperCase()}" heading. Use the ${titleType} name/title as the prominent H1 header at the top. Include a small subtitle/eyebrow above or below the H1 reading "${boardLabel}".
- The document should be structured as ${documentStructureLabel} containing these sections:

1. **${overviewHeading}** — Scenario type, ${titleType} title, submission date, and a 2-3 sentence executive summary written for the board (what the ${titleType} is and why it warrants review). The date MUST be exactly: ${submissionDate || "the current date"}. Do NOT use any other date.
2. **Pros / Strengths** — 3-5 bullet points highlighting strategic fit, differentiation, potential value, and alignment with stated organizational priorities. Frame each as an evaluative observation, not a sales pitch.
3. **Cons / Weaknesses** — 3-5 bullet points covering gaps, risks, unanswered questions, and areas where the ${intakeType} lacks supporting detail. Be candid; this is the board's risk lens.
4. **Tangible Metrics & Considerations** — Qualitative indicators: estimated effort (Low/Medium/High), time-to-value, required resources, key dependencies, and target audience/impact scope. Use descriptive labels — DO NOT assign numeric scores.
5. **Triage Routing** — The routing recommendation has ALREADY been determined by a deterministic rule-based system based on the intake path the submitter took. The three groups are:
   - **AI Studio** — AI enhancers, accelerators, custom model dev, prototypes, AI-specific tooling, GenAI use cases.
   - **Innovation Group** — cross-functional ideas, new offerings, broader transformation efforts, strategic concepts.
   - **IT Group** — Microsoft stack and internal operations technology (Power Platform, Copilot rollouts, SharePoint, integrations).
   ${triageRecommendation ? `**Rule-based recommendation for this ${titleType}: ${triageRecommendation.group}.** Rationale: ${triageRecommendation.rationale}\n   You MUST present "${triageRecommendation.group}" as the recommended group exactly as given — do NOT override, re-evaluate, or substitute a different group. Restate the rationale above in clear prose. You may add 1-2 sentences of supporting context tied to the submitter's specific answers, but the recommended group is fixed.` : `Recommend a primary group with a 1-2 sentence rationale and optionally a secondary group.`} End the section with a clear statement that this is a recommendation only and the final routing decision rests with the team.

- IMPORTANT: Do NOT include any numeric scores, ratings out of 10/100, score bars, or overall score summaries anywhere in the document. Focus only on qualitative analysis, pros/cons, and tangible descriptive metrics.
- Do NOT include a Risk Analysis section, an Existing Solutions Considered section, or a Recommended Next Steps section.
- Use clean tables and clear hierarchy.
- Include realistic, specific content derived from the inputs — NOT generic boilerplate. If a field is missing from the submitter's answers, name the gap explicitly rather than inventing detail.
- Make it responsive and printable.
- The HTML must be fully self-contained (inline styles, no external dependencies).`;



      const userPrompt = `Generate a ${isSupportRequest ? "support request briefing" : "idea evaluation document"} for the review board:

**Scenario Type:** ${scenario}

**${isSupportRequest ? "Request" : "Idea"}:** ${idea}

**Submitter's Answers:**
${Object.entries(answers || {}).map(([q, a]) => `- ${q}: ${a}`).join("\n")}

**Existing Solutions Shown:** ${recommendations?.length ? recommendations.map((r: any) => r.name).join(", ") : "None"}
**Submitter Chose to Proceed:** Yes (${isSupportRequest ? "submitted as a support request" : "submitted as new idea"})

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

    if (isSupportRequest) {
      html = html
        .replace(/Innovation Idea Brief/gi, "Submission Support Request")
        .replace(/Idea Submission Brief/gi, "Submission Support Request")
        .replace(/Idea Brief/gi, "Support Request")
        .replace(/Submission Overview/gi, "Request Overview")
        .replace(/idea submission/gi, "support request")
        .replace(/idea submissions/gi, "support requests")
        .replace(/new idea/gi, "support request");
    }

    if (!html.includes("<!DOCTYPE html>")) {
      const fallbackTitle = requestType === "support" ? "Submission Support Request" : "Innovation Idea Brief";
      html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${fallbackTitle}</title></head><body>${html}</body></html>`;
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
