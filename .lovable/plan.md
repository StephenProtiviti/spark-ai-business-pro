## Goal

Make the intake chat smart enough to notice when an answer doesn't give the Idea Brief what it needs, and ask **one** targeted follow-up — based purely on the *meaning* of the answer, never on its length.

## Guardrails

1. **No length-based triggers.** A two-word answer that fully answers the question ("Jane Doe", "Q3 2026") passes. A 200-word answer that dodges the question gets a follow-up.
2. **At most one follow-up per question.** After one nudge, accept whatever's given and move on.
3. **Hard cap of 2 follow-ups per intake.** Once hit, no more follow-ups fire for the rest of the conversation.
4. **Skippable.** Every follow-up shows a "Skip / move on" affordance.
5. **Soft framing.** "This will help the review board evaluate it" — never "your answer is insufficient."
6. **Never blocks submission.** Enrichment only.
7. **Exempt questions.** Factual fields (MD sponsor, point of contact, audience size, timeline, yes/no choices) skip the check entirely via per-question metadata.

## How the smartness works (semantic, not length)

After the user submits an answer to an enrichment-eligible question, call a lightweight Lovable AI model (`google/gemini-2.5-flash-lite`) with structured output:

**Input to the model:**
- The question being asked
- A short rubric describing what the Idea Brief actually needs from this field (e.g. for "What problem does this solve?" the rubric is: *a specific pain point, who experiences it, and roughly how often or how much it costs*)
- The user's verbatim answer

**Model returns JSON:**
```
{
  addressesQuestion: boolean,   // did they actually answer the question asked?
  coversRubric: boolean,        // does the answer hit the key facets the brief needs?
  missingFacet: string | null,  // the single most useful thing still missing
  followUp: string | null       // one short, friendly clarifying question — or null
}
```

A follow-up fires **only** when `addressesQuestion` is false OR `coversRubric` is false. The decision is 100% based on semantic content — the model is explicitly instructed to ignore answer length.

## Smart touches that reinforce the goal

- **Per-question rubrics** authored once in `scenarioQuestions` metadata, so the AI judge has a clear, consistent target for each field. (No rubric = question is exempt.)
- **One-shot only.** The follow-up question is generated, posted, and then the next user reply is accepted as-is regardless of quality. The judge does not run on the follow-up answer.
- **End-of-intake recap (optional).** Before submission, the assistant posts a one-paragraph summary of what it captured: "Here's what I'll send to the board — anything to add or correct?" This catches gaps gracefully without ever interrupting mid-flow.
- **Inline "example of a strong answer"** (optional) collapsible hint on heavy questions so users self-correct *before* answering, reducing the need for follow-ups in the first place.

## Where it lives (technical)

- New edge function `supabase/functions/check-answer-quality/index.ts` — Lovable AI judge with structured JSON output and per-question rubric.
- Extend the `scenarioQuestions` data shape in `src/components/ChatInterface.tsx` so each question can carry an optional `rubric: string` (presence = eligible, absence = exempt).
- In `ChatInterface.tsx`, between the user's answer and advancing to the next question:
  - If question is exempt OR follow-up cap hit → advance immediately.
  - Else call the edge function; if it returns a `followUp`, inject it as an assistant message with a "Skip" button, then advance after the next user reply.
- Track `followUpsUsed` in component state, capped at 2.

## Open questions before I build

1. **Hard cap per intake — 2 or 3?** (Recommending 2.)
2. **End-of-intake recap** — include now, or save for a separate pass?
3. **Inline "example of a strong answer" hints** — include now, or save for a separate pass?
