# AI Studio Intake — Three Dedicated Conversational Questionnaires

Split the shared `AI Studio Support` scenario into three separate, conversational questionnaires — one per sub-path from the diagram. After the last question, the existing flow continues unchanged (accelerator recommendations → differentiation question → evaluation report → submit).

## Changes (single file: `src/components/ChatInterface.tsx`)

### 1. Update `selectionToScenario`
- `"Client Workshop"` → `"AI Studio - Client Workshop"`
- `"Prototype Development"` → `"AI Studio - Prototype Development"`
- `"Idea for an AI Showcase"` → `"AI Studio - AI Showcase"`

### 2. Add three new entries to `scenarioQuestions` (and remove `"AI Studio Support"`)

**AI Studio - Client Workshop**
Greeting: "A Client Workshop at the AI Studio — exciting! Let's capture the details so we can plan a great session."
1. To start, **what's the purpose of your visit to the AI Studio?** Are you exploring AI broadly, working on a specific use case, or aiming to inspire the client?
2. **Which client is this workshop for?** Please share the client name.
3. **Who is the sponsoring MD** championing this workshop internally?
4. **Who are the key client stakeholders attending,** and what's their level (e.g., C-Suite, VP, Director)?
5. **Who will be the day-to-day contact(s)** coordinating logistics on both sides?
6. **Which function is this aligned to?** (e.g., Finance, Risk, Internal Audit, Technology)
7. **What industry is the client in?** This helps us tailor examples and demos.
8. **How would you describe the client's current maturity with AI?** Are they exploring, piloting, or already operationalizing?
9. **What's the desired outcome of the workshop?** A signed pursuit, a roadmap, education, ideation — what does winning look like?
10. **What's your preferred timeline** for running this workshop?
11. **Where would you like the workshop held** — at the AI Studio, client site, or virtual?
12. Last one: **Any other topics of interest** you'd like us to weave into the agenda?

**AI Studio - Prototype Development**
Greeting: "Prototype development — let's scope what we're building. I'll walk you through everything we need to get the right team and tech in place."
1. To start, **who is the sponsoring EMD** for this prototype?
2. **Who are the primary contacts** we should coordinate with on this effort?
3. **Which client(s) are potentially interested** in seeing or using this prototype?
4. **What functional area does this prototype address?** (e.g., Finance, Audit, Risk, Operations)
5. **What industry is this targeted at?**
6. **Any specific sub-industry** we should tailor the prototype to?
7. **Who is the target buyer / persona** this prototype is being built for?
8. **What's the title of the use case** you're prototyping?
9. **Describe the use case in detail** — what problem does it solve and how should it work?
10. **Is the data needed for this use case available?** (Yes / No / Unsure — and a quick note on what data you're thinking of)
11. **Where does that data live today?** (e.g., client system, Protiviti environment, public sources)
12. **What's the desired outcome** of the prototype — a working demo, a measurable result, a conversation starter?
13. **What's the business value or benefit** this prototype is meant to demonstrate?
14. **What timeline are we working with?** Is there a specific client meeting or milestone driving it?
15. Last one: **Anything else we should know?** Additional comments, constraints, or context.

**AI Studio - AI Showcase**
Greeting: "Submitting an idea for the AI Showcase — love it! A few quick questions so we can evaluate it for inclusion."
1. To start, **what type of submission is this?** (e.g., a working demo, a credential, a concept, a client story)
2. **Which industry does this showcase target?**
3. **Who is the C-Suite buyer** this would resonate with? (e.g., CFO, CIO, CRO, CHRO)
4. **Who are the point(s) of contact** for this idea or example?
5. **What's the title of your use case?**
6. **Describe the use case** — what does it do, who benefits, and why is it showcase-worthy?
7. Last one: **Do you have a demo or credential asset** we can use? Share a link or describe what's available.

### 3. Update `directTriageScenarios`
Replace `"AI Studio Support"` with all three new keys so auto-routing to IT / AI Studio is preserved for every AI Studio sub-path.

## Out of scope
- No UI/visual redesign.
- No changes to the report generator, recommendations, or differentiation flow — they continue to work because they consume the full conversation transcript.
- Side annotations in the diagram (e.g., "Michael Thor selected as the EMD", "AI Protiviti Industry Teams on Atlas") are treated as reference notes, not user-facing fields.
