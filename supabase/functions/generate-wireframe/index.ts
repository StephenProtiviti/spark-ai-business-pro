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
    const { prompt, refinement, currentHtml } = await req.json();
    if (!prompt && !refinement) {
      return new Response(JSON.stringify({ error: "No prompt provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const baseSystemPrompt = `You are a senior UI/UX designer and frontend developer. Given an MVP specification, generate a complete, self-contained HTML wireframe/prototype that is specific to that exact specification.

Rules:
- Output ONLY valid HTML. No markdown, no code fences, no explanation text.
- Output a COMPLETE document starting with <!DOCTYPE html> and including <html>, <head>, and <body>.
- Use inline CSS with a clean, modern design system (system-ui font, subtle borders, proper spacing).
- Use a muted color palette: white background, #1e3a5f for primary/navy, #f97316 for accent/orange, #f8fafc for muted backgrounds, #64748b for secondary text.
- Include realistic placeholder content that matches the idea being prototyped.
- Make it look like a real product wireframe — include navigation, cards, buttons, forms, data tables, or dashboards ONLY if they fit the specification.
- Add subtle box-shadows and border-radius for a polished look.
- The HTML must be fully self-contained (inline styles, no external dependencies).
- Include a header with the product name and navigation.
- Make it responsive using flexbox/grid.
- Add helpful placeholder icons using unicode symbols (⚡, 📊, 👤, etc.).
- CRITICAL: include all major interfaces and flows explicitly mentioned in the MVP specification. If a required interface is unclear, still include a visible placeholder section for it.
- CRITICAL: derive screen names, section titles, labels, and ALL content directly from the MVP specification text. Do NOT invent your own product name or generic content.
- ABSOLUTELY FORBIDDEN: Do NOT output a "Workspace Overview", revenue dashboard, transactions table, or any generic SaaS analytics dashboard UNLESS the specification explicitly requests financial reporting or analytics.
- ABSOLUTELY FORBIDDEN: Do NOT reuse content from any previous generation. Each output must be unique to the current specification.
- If the specification is about a tool, app, or workflow, build screens showing THAT tool's actual interface (e.g., input forms, output displays, specific workflows).`;

    let messages;

    if (refinement && currentHtml) {
      // Refinement mode: user wants to tweak the existing wireframe
      messages = [
        { role: "system", content: baseSystemPrompt + `\n\nYou are refining an existing wireframe. The user will provide the current HTML and their requested changes. Apply the changes and output the COMPLETE updated HTML document. Do not omit any sections — return the full document with modifications applied.` },
        { role: "user", content: `Here is the current wireframe HTML:\n\n${currentHtml}\n\nPlease apply the following changes:\n${refinement}` },
      ];
    } else {
      // Initial generation mode
      messages = [
        { role: "system", content: baseSystemPrompt },
        { role: "user", content: `Generate an HTML wireframe/prototype for the following MVP specification:\n\n${prompt}` },
      ];
    }

    const requestModel = async (model: string, timeoutMs: number) => {
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages,
            stream: false,
            temperature: 0.5,
            max_tokens: 8000,
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });

        return { response, error: null as unknown };
      } catch (error) {
        console.error(`Model request failed for ${model}:`, error);
        return { response: null as Response | null, error };
      }
    };

    const attempts = [
      { model: "google/gemini-3-flash-preview", timeoutMs: 65000 },
      { model: "google/gemini-2.5-flash", timeoutMs: 65000 },
    ];

    let response: Response | null = null;
    let lastError: unknown = null;

    for (const attempt of attempts) {
      const result = await requestModel(attempt.model, attempt.timeoutMs);
      if (result.response) {
        response = result.response;
        if (response.ok) break;
        if (response.status >= 500 || response.status === 408) continue;
        break;
      }
      lastError = result.error;
    }

    if (!response) {
      const message = lastError instanceof Error ? lastError.message : "Wireframe generation timed out";
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
        JSON.stringify({ error: "Failed to generate wireframe" }),
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

    if (!html.includes("<!DOCTYPE html>")) {
      html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Wireframe</title></head><body>${html}</body></html>`;
    }

    return new Response(JSON.stringify({ html }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-wireframe error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
