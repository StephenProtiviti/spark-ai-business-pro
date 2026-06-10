import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, CheckCircle2, FileText, MessageSquare, Lightbulb, Zap, TrendingUp, Shield, BarChart3, Workflow, Pencil, ThumbsUp, Loader2, Eye, RefreshCw, ExternalLink, Layout, Mic, MicOff, Bot, Wrench, Cpu, Rocket, Package, ArrowRight, X, Download, ChevronLeft, Ban } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import ReactMarkdown from "react-markdown";
import { useIdeas, RecentIdea } from "@/contexts/IdeasContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getRecommendations, Accelerator } from "@/data/mockAccelerators";

interface Message {
  role: "user" | "assistant";
  content: string;
  // Marks a user message that is a clarifying reply to a smart follow-up question.
  // These bubbles are shown in the transcript but excluded from answer extraction,
  // so positional question→answer mapping stays correct.
  followUpReply?: boolean;
}

// ── Decision Tree Areas ──
const clientAreas = [
  { label: "AI Studio", icon: Cpu, description: "AI showcases, workshops, and prototypes" },
  { label: "Custom Agent Development", icon: Bot, description: "Build a new custom agent" },
  { label: "Enabler Development", icon: Wrench, description: "Using Atlas and other enabling technologies" },
  { label: "Other generic ideas", icon: Sparkles, description: "Other client delivery ideas" },
];

const internalAreas = [
  { label: "Protiviti Atlas", icon: BarChart3, description: "Atlas Platform Use Case" },
  { label: "Custom Agent Development", icon: Bot, description: "Build a new custom agent" },
  
  { label: "Other generic ideas", icon: Sparkles, description: "Other internal operations ideas" },
];

const subAreas: Record<string, { label: string; icon: any; description: string }[]> = {
  "AI Studio": [
    { label: "Client Workshop", icon: TrendingUp, description: "Schedule or run a client workshop" },
    { label: "Prototype Development", icon: Wrench, description: "Build a proof of concept or prototype" },
    { label: "Idea for AI Showcase", icon: Sparkles, description: "Submit an idea for the AI Showcase" },
  ],
  // Note: "Protiviti Atlas" intentionally has no sub-areas — clicking it skips
  // straight into the Use Case Development question flow.
  "Custom Agent": [
    { label: "New Agent Development", icon: Bot, description: "Build a new custom agent" },
    { label: "Support in Publishing a copilot agent", icon: Package, description: "Help publish a Copilot agent" },
  ],
  // Note: "Custom Agent Development" intentionally has no sub-areas — flows directly into Agent Development questions.
  "Protiviti Atlas API Support": [
    { label: "New Protiviti Atlas API Provisioning", icon: Rocket, description: "Provision a new Protiviti Atlas API" },
    { label: "Existing Protiviti Atlas API Provisioning", icon: Workflow, description: "Support for an existing Protiviti Atlas API provisioning" },
  ],
  "New Protiviti Atlas API Provisioning": [
    { label: "Client use case / enabler", icon: TrendingUp, description: "API provisioning for a client engagement" },
    { label: "Experimentation / Learning / Internal Use", icon: Shield, description: "API provisioning for internal experimentation or learning" },
  ],
};

// Map final selections to scenario question keys
const selectionToScenario: Record<string, string> = {
  "Client Workshop": "AI Studio - Client Workshop",
  "Prototype Development": "AI Studio - Prototype Development",
  "Idea for AI Showcase": "AI Studio - AI Showcase",
  "Use Case Development": "Atlas Use Case Development",
  "New Protiviti Atlas API Provisioning": "Enabler Development",
  "Existing Protiviti Atlas API Provisioning": "Enabler Development",
  "New Agent Development": "Agent Development",
  "Support in Publishing a copilot agent": "Publishing Copilot Agent",
  "Explore Existing Tools (ProGPT & Power Automate)": "Generic Idea",
  "Support in Promoting Enablers": "Promoting Enablers",
  "Enabler Development": "Enabler Development",
  "Copilot Agent Publishing Support": "Publishing Copilot Agent",
  "Design Thinking Workshop": "Design Thinking Workshop",
  "Pursuit Enablement Support": "Pursuit Enablement Support",
  "Support in Exploring Existing Tools": "Exploring Existing Tools",
  "Client use case / enabler": "Atlas API Provisioning - Client",
  "Experimentation / Learning / Internal Use": "Atlas API Provisioning - Internal",
  "Training Conference Support": "Training Conference Support",
  "Other": "Generic Idea",
};

// ── Scenario-Specific Follow-Up Questions ──
const scenarioQuestions: Record<string, { greeting: string; questions: string[] }> = {
  "Design Thinking Workshop": {
    greeting: "Design Thinking Workshop support — let's capture the details so we can shape the right session for you.",
    // NOTE: This scenario uses dynamic branching via buildDTWQuestions(). The list below
    // is only a placeholder for the initial question; the real list is computed from prior answers.
    questions: [
      "To start, **do you have a defined outcome and scope for the workshop?** (Yes / No)",
    ],
  },
  "Training Conference Support": {
    greeting: "Training Conference Support — we'll capture the details for your conference or training event.",
    questions: [
      "To start, **what type of training or conference support do you need?**",
      "**Client name?**",
      "**Event name and date?**",
      "**Session type:** Panel / keynote / breakout / workshop",
      "**What is the primary goal/outcome?**",
      "**How do you want support delivered?** (Examples: Build the training content/materials for me, Co-create content with me)",
      "**Preferred date(s) / timeline & duration?**",
      "**Session format** (Virtual, In-person, Hybrid)",
      "**MD Sponsor and primary point of contact for coordination**",
    ],
  },
  "Pursuit Enablement Support": {
    greeting: "Pursuit Enablement Support — let's capture the details so we can mobilize the right help for your opportunity.",
    questions: [
      "To start, **what type of pursuit support do you need?**",
      "If you selected a demo, **which Technology Delivery Enablers or Solutions** should be demoed? (e.g., AI Showcase, AI showcase and enablers, Technology Delivery Enablers — list all that apply, or say N/A)",
      "**Is this request tied to a live client opportunity with a due date?** (Yes — active pursuit / No — prep, reuse asset, or internal readiness)",
      "**What is the client delivery or presentation date and time?**",
      "**What problem are they trying to solve, and what are the key client questions or asks?**",
      "**What deliverables are needed?** Select all that apply: Deck/slide narrative, Written response (RFI/RFP answers), Prototype/POC, Demo of an existing enabler/solution, Other (please specify).",
      "**What's the format or channel of delivery?** (Live meeting presentation, Email delivery, Portal upload, or Leave-behind deck only)",
      "**Who is the target audience?** (Executive/Board/Audit Committee)",
    ],
  },
  "AI Studio Support": {
    greeting: "AI Studio — great choice! Let's understand what support you need.",
    questions: [
      "**What type of AI Studio support do you need?** (e.g., showcasing a POC on AI Showcase, help building a POC, scheduling a client visit to AI Studio)",
      "**Describe the AI use case or proof of concept.** What problem does it solve and who is the target audience?",
      "**What's the current state?** Do you have an existing prototype, data set, or is this starting from scratch?",
      "**What's the timeline and urgency?** Is there a client demo date or internal deadline driving this?",
      "Last one: **What does success look like?** A working demo, a client commitment, internal buy-in, or something else?",
    ],
  },
  "AI Studio - Prototype Development": {
    greeting: "Prototype Development with the AI Studio — let's capture the details so we can scope and build this well.",
    questions: [
      "First up: **Who is the Sponsoring EMD** championing this prototype?",
      "**Who are the Primary Contact(s)** we'll be coordinating with day-to-day?",
      "**Which client(s) are potentially interested in this prototype?** Share names if known.",
      "**What's the Functional Area?** (e.g., Finance, Risk, Technology, Operations)",
      "**What's the Industry alignment?** Which industry vertical does this target?",
      "**What's the Sub Industry?** (e.g., within Financial Services: Banking, Insurance, Capital Markets)",
      "**Who is the Target Buyer?** (e.g., CIO, CFO, CRO, Head of Innovation)",
      "**What's the Title of the Use Case?**",
      "**Describe the Use Case** — what problem does it solve and how does it work?",
      "**Use Case Data Availability:** Is the data needed already available? (Yes / No / Partial)",
      "**Data Location:** Where does the data live? (e.g., client systems, public datasets, synthetic, Protiviti)",
      "**Describe the Desired Outcome** — what should this prototype prove or demonstrate?",
      "**Describe the Business Value or Benefits** — revenue impact, efficiency gains, strategic value, etc.",
      "**What's the Timeline?** Is there a client demo date or internal deadline?",
      "Last one: **Any Additional Comments** or context we should know?",
    ],
  },
  "AI Studio - Client Workshop": {
    greeting: "A Client Workshop at the AI Studio — exciting! Let's capture the details so we can set this up for success.",
    questions: [
      "First up: **What's the purpose of your visit to the AI Studio?** For example, are you looking to explore an AI opportunity, walk a client through a tailored experience, or help them get hands-on through training and enablement?",
      "**Which client is this workshop for?** Please share the client name.",
      "**Who is the Sponsoring MD** championing this engagement?",
      "**Who are the key client stakeholders attending,** and what's their level/title? (e.g., CIO, VP of Innovation)",
      "**Who are the day-to-day contact(s)** we'll be coordinating with leading up to and during the workshop?",
      "**What's the functional alignment** of this workshop? (e.g., Finance, Risk, Technology, Operations)",
      "**What's the industry alignment?** Which industry vertical does this client sit in?",
      "**How would you describe the client's maturity with AI?** (e.g., Unsure, Exploring, Experimenting, Scaling, Advanced)",
      "**What's the desired outcome** of this workshop? What should the client walk away with?",
      "**What's your preferred timeline** for running this workshop?",
      "**Where would you like the workshop to take place?** (e.g., Chicago AI Studio, Houston AI Studio, client site, virtual)",
      "Last one: **Any other topics of interest** you'd like to weave into the workshop agenda?",
    ],
  },
  "AI Studio - AI Showcase": {
    greeting: "An idea for the AI Showcase — love it! Let's capture the details so we can feature it well.",
    questions: [
      "First up: **What type of submission is this?** (e.g., Idea / Market Trend, Built use case (Internal), Built use case (Client-facing))",
      "**Which industry** does this showcase align to?",
      "**Who is the C-Suite buyer** for this idea? (e.g., CIO, CFO, CRO, CHRO)",
      "**Who are the point(s) of contact** for this idea or example? Please share names and roles.",
      "**What's the title of your use case?**",
      "**Give us a description of your use case** — what problem does it solve, who benefits, and how does it work?",
      "Last one: **Do you have a demo or credential asset** we can showcase? (e.g., recorded demo, slide, link, or 'not yet')",
    ],
  },
  "Agent Development": {
    greeting: "New Agent Development — let's scope out what you're building!",
    questions: [
      "**What is the agent's purpose?** Describe what it should do in 1-2 sentences.",
      "**What is the expected benefit of developing this agent?** (e.g. time saving, currently relying on disparate systems and manual process steps, current client project etc.)",
      "**What is the current approach to performing this task?**",
      "**What will be the knowledge base for this agent?** Please specify PII, confidential client or company information if any that will be included in the knowledge base.",
      "**Is it expected to be built in Protiviti's environment or client environment?**",
      "**Do you have any preference on technology infrastructure to be used for the agent development?**",
      "**Will this be an agent that should be available to use globally or for a specific region or engagement?**",
      "Last one: **Please specify expected number of users who will be interacting with the agent.**",
    ],
  },
  "Enabler Development": {
    greeting: "Enabler development — let's define what you want to build!",
    questions: [
      "**What enabler are you looking to build?** Describe the capability or tool in 1-2 sentences.",
      "**Will this be built on Atlas or another platform/technology?** Specify the platform and any key dependencies.",
      "**Who is the target user of this enabler?** Internal teams, clients, or both?",
      "**What existing tools or processes does this replace or enhance?** Describe the current state.",
      "Last one: **How will you measure adoption and success?** Number of users, integrations, or business outcomes?",
    ],
  },
  "Enabler Development - Client": {
    greeting: "Enabler Development on Protiviti Atlas for Client Delivery — let's capture the details so we can scope, build, and prioritize this properly.",
    questions: [
      "To start, **briefly describe your problem statement.** What gap or pain point does this enabler address?",
      "**Proposed Solution:** What are your expected outcomes from this enabler?",
      "**Who is the MD sponsor?** Please share the name of the MD championing this idea.",
      "**What industry team(s) does this apply to?** Select all that apply:",
      "**Who is the intended end user?** (Client / Protiviti)",
      "**Who is the competitor?** (Consulting Firm / Third Party Vendor)",
      "Last one: **What does the Market Demand look like?** Select the timeframe that best fits:",
    ],
  },

  "Automation Support": {
    greeting: "Automation — let's identify what to streamline!",
    questions: [
      "**What process or workflow do you want to automate?** Describe the current manual steps.",
      "**Is this workflow automation (multi-step orchestration) or process automation (single-task optimization)?**",
      "**Who performs this work today?** Which teams or roles, and roughly how much time do they spend?",
      "**What systems are involved?** List the tools, platforms, or data sources that need to be connected.",
      "Last one: **What's the expected ROI?** Time saved, error reduction, cost savings — estimate the impact.",
    ],
  },
  "Generic Idea": {
    greeting: "Thanks for sharing! Let's shape this idea into something actionable.",
    questions: [
      "**What is the primary objective?** In one sentence, what should this idea accomplish?",
      "**Who benefits from this and how?** Describe the people affected and the outcome they'd experience.",
      "**What does success look like?** Think about the measurable outcome — a metric, milestone, or before/after proof.",
      "**What resources or support would you need?** Teams, technology, budget, or expertise.",
      "Last one: **What's the business value?** Revenue impact, cost savings, competitive advantage, or strategic positioning?",
    ],
  },
  "Client Other": {
    greeting: "Great — let's capture your idea! I'll walk you through a few questions to gather everything we need for the review board.",
    questions: [
      "To start, **briefly describe the idea.** A short summary of what you have in mind.",
      "**What needs does your idea fulfill?** Describe the gap, pain point, or opportunity it addresses.",
      "**What are your expected outcomes from this idea?** How will it deliver value?",
      "**Who is the MD sponsor of this idea?** Please share the name of the MD championing it.",
      "**Please describe the support type** you need (e.g., Project Management, Idea Refinement, Development — Technical Resources support).",
      "**What industry team(s) does this apply to?** Select all that apply:",
      "**Has this idea been validated by the client or anyone in Protiviti?** If yes, please share who validated it.",
      "**Who is the intended end user?** (Client / Protiviti)",
      "Last one: **Who is the competitor?** (Consulting Firm / Third Party Vendor)",
    ],
  },
  "Internal Other": {
    greeting: "Great — let's capture your internal operations idea! I'll walk you through a few quick questions for the review board.",
    questions: [
      "To start, **describe your idea.** A short summary of what you have in mind.",
      "**What needs does your idea fulfill?** Describe the gap or pain point it addresses.",
      "**What are your expected outcomes from this idea?** How will it deliver value?",
      "Last one: **Who is the MD sponsor?** Please share the name of the MD championing it.",
    ],
  },
  "Exploring Existing Tools": {
    greeting: "Support in Exploring Existing Tools — let's capture the details of your training or demo request.",
    questions: [
      "**Please provide the details of the training or demo request.** (Example: Support in developing a Power Automate Flow, demo of a ProGPT Agent, etc.)",
      "**Who is the key point of contact?**",
      "**What is the target audience size?**",
      "Last one: **What is the expected timeline?**",
    ],
  },
  "Atlas Use Case Development": {
    greeting: "Use Case Development on Protiviti Atlas — let's capture the details so we can scope and prioritize this properly.",
    questions: [
      "To start, **what's the name of your idea?** A short working title is perfect.",
      "**Problem Statement:** What need does your idea fulfill? Describe the gap or pain point it addresses.",
      "**Proposed Solution:** What are your expected outcomes from this idea? How will it solve the problem?",
      "**Idea Description:** Walk me through how your idea works in a bit more detail.",
      "**MD Sponsor:** Who is the MD championing this idea internally?",
      "**What is the estimated number of end users impacted by this use case?** (10–50, 51–500, 501–1,000, 1,001–5,000, or Global)",
      "Last one: **What kind of support are you looking for** to develop this use case?",
    ],
  },
  "Atlas Use Case Development - Client": {
    greeting: "Use Case Development on Protiviti Atlas for Client Delivery — let's capture the details so we can scope this properly.",
    questions: [
      "To start, **what's the name of your idea?** A short working title is perfect.",
      "**Problem Statement:** What need does your idea fulfill? Describe the gap or pain point it addresses.",
      "**Proposed Solution:** What are your expected outcomes from this idea? How will it solve the problem?",
      "**Idea Description:** Walk me through how your idea works in a bit more detail.",
      "**What C-Suite Solution Team(s) does this apply to?** (e.g., CFO, CIO, CRO, CHRO, COO — you can list multiple)",
      "**What industry team(s) does this apply to?** (e.g., Financial Services, Healthcare, Consumer Products)",
      "**MD Sponsor:** Who is the MD championing this idea internally?",
      "**Who is the intended end user of your idea?** (e.g., client executives, internal teams, specific personas)",
      "**What is the anticipated revenue impact of this use case?**",
      "**What efficiency gains are expected from this use case?**",
      "**Who is the competitor?** (e.g., Consulting Firms, Third Party Vendors, or both)",
      "**Name of the competitor(s)** — who specifically should we be aware of?",
      "**Current Market Demand:** How would you describe the demand for this in the market today?",
      "**What is the estimated number of end users impacted by this use case?** (10–50, 51–500, 501–1,000, 1,001–5,000, or Global)",
      "**Support Type:** What kind of support are you looking for to develop this use case?",
      "Last one: **Do you have Client Validation for this idea?** If yes, please share the **name of the client**.",
    ],
  },
  "Atlas API Provisioning - Client": {
    greeting: "New Protiviti Atlas API Provisioning for Client Delivery — let's capture the details we need to get this provisioned.",
    questions: [
      "To start, share the **project basics**: **scope/overview**, **project title**, and a **brief description** of what you're building.",
      "**Project ID/Code:** please share the Project ID/Code for this engagement.",
      "**MD sponsor:** who is the **MD championing this project**?",
      "**MD approval status:** has this project received MD approval? (**Yes** / **No**)",
      "**Upload MD approval:** please attach a screenshot of the approval or an exported Outlook message (image, PDF, or .msg).",
      "**Data:** what **kind of data** will be used? (e.g., client, public, synthetic — include any sensitivity considerations)",
      "**User access:** list the **User ID(s)** of all users who will need access to the API.",
      "Last one — **IP addresses to whitelist** for all users: **Home**, **Office**, and **Public** IPs.",
    ],
  },
  "Atlas API Provisioning - Internal": {
    greeting: "New Protiviti Atlas API Provisioning for Internal Operations — let's capture the details we need to get this provisioned.",
    questions: [
      "To start, share the **project basics**: **scope/overview**, **project name**, and the **intended goal** (Experimentation, Learning, or Internal Use).",
      "**Use case & data:** share **details of your use case** (what you're building and why) and the **kind of data** that will be used (internal, public, synthetic — include any sensitivity considerations).",
      "**User access:** list the **User ID(s)** of all users who will need access to the API.",
      "Last one — **IP addresses to whitelist** for all users: **Home**, **Office**, and **Public** IPs.",
    ],
  },
  "Atlas API Provisioning Existing - Client": {
    greeting: "Existing Protiviti Atlas API Provisioning for Client Delivery — let's capture the details we need.",
    questions: [
      "To start, **what type of request are you submitting for an existing Protiviti Atlas API key/project?** (Add new user(s) and request API key(s) to an already approved existing project, Update IP address(es) for an existing API key/project, or Other / Not sure)",
      "**What's the Title of your Project?**",
      "**What is the description of your project?** Walk me through it in a bit more detail.",
      "**Share the Project ID/Code** associated with this engagement.",
      "**Specify the base URL** for the API.",
      "**Specify the User ID(s) of all users** who will need access.",
      "**Specify the IP Address (Home) for all user(s)** who will be accessing from home.",
      "**Specify the IP Address (Public) for all user(s)** that should be whitelisted for public access.",
      "**Specify the IP Address (Office) for all user(s)** who will be accessing from the office.",
      "**What is the anticipated revenue impact of this use case?**",
      "**What efficiency gains are expected from this use case?**",
      "Last one: **What are the anticipated operational efficiency savings expected from this use case?**",
    ],
  },
  "Atlas API Provisioning Existing - Internal": {
    greeting: "Existing Protiviti Atlas API Provisioning for Internal Operations — let's capture the details we need.",
    questions: [
      "To start, **what type of request are you submitting for an existing Protiviti Atlas API key/project?** (Add new user(s) and request API key(s) to an already approved existing project, Update IP address(es) for an existing API key/project, or Other / Not sure)",
      "**What's the Title of your Project?**",
      "**What is the description of your project?** Walk me through it in a bit more detail.",
      "**Share the Project ID/Code** associated with this engagement.",
      "**Specify the base URL** for the API.",
      "**Specify the User ID(s) of all users** who will need access.",
      "**Specify the IP Address (Home) for all user(s)** who will be accessing from home.",
      "**Specify the IP Address (Public) for all user(s)** that should be whitelisted for public access.",
      "**Specify the IP Address (Office) for all user(s)** who will be accessing from the office.",
      "**What is the anticipated revenue impact of this use case?**",
      "**What efficiency gains are expected from this use case?**",
      "Last one: **What are the anticipated operational efficiency savings expected from this use case?**",
    ],
  },
  "Atlas API Provisioning Existing - Support": {
    greeting: "Existing Protiviti Atlas API Provisioning Support — let's capture the details we need.",
    questions: [
      "To start, **what type of request are you submitting for an existing Protiviti Atlas API key/project?** (Add new user(s) and request API key(s) to an already approved existing project, Update IP address(es) for an existing API key/project, or Other / Not sure)",
      "**What is the description of your project?** Walk me through it in a bit more detail.",
      "**What's the Title of your Project?**",
      "**Share the Project ID/Code** associated with this engagement.",
      "**Specify the base URL, IP Address (Home), IP Address (Public) and IP Address (Office)** for this request.",
      "**What is the anticipated revenue impact of this use case?**",
      "**What efficiency gains are expected from this use case?**",
      "Last one: **What are the anticipated operational efficiency savings expected from this use case?**",
    ],
  },
  "Agent Development - Client": {
    // Agent Development - Client: questions ordered per user prompt (May 28)
    greeting: "New Agent Development for Client Delivery — let's scope out what you're building!",
    questions: [
      "To start, **what needs will this Agent fulfill and what value can it create?**",
      "**What are the expected outcomes?**",
      "**What is the current approach of performing the task?**",
      "**What data or knowledge base will this agent rely on** to generate its responses?",
      "**Who are the target users for the agent?** (Global or Regional)",
      "**Specify the Region.**",
      "**Specify the Country.**",
      "**What is the estimated number of end users impacted by this use case?**\n\n- 10 – 50\n- 51 – 500\n- 501 – 1000\n- 1001 – 5000\n- Global",
      "**What is the anticipated revenue impact of this use case?**\n\n- No direct revenue contribution\n- Minor indirect revenue contribution\n- Some measurable revenue contribution\n- Enables new revenue stream\n- Major drivers for high-margin or recurring revenue",
      "**What efficiency gains are expected from this use case?**\n\n- Minimal measurable impact; isolated use\n- Small gains for a single team\n- Moderate cross-team gains\n- High impact on multiple cross-team processes\n- Major cross-functional gains for client and internal operations",
      "**How would you classify the data suggested for this agent?**\n\n- Personal Identifiable Information / Employee Data (e.g., name, SSN, email)\n- Confidential Client Information (e.g., financial records, customer data)\n- Confidential Company Information (e.g., internal reports, source code)\n- Non-Confidential Business Information (e.g., project plans, training docs)\n- Public Data (e.g., published reports, open datasets)\n- Other",
      "Last one: **What are the anticipated operational efficiency savings expected from this use case?**\n\n- No direct savings contribution\n- Minor indirect savings contribution\n- Some measurable savings contribution\n- Significant savings contributions\n- Major savings and cost reductions",
    ],
  },
  "Publishing Copilot Agent": {
    greeting: "Support in Publishing a Copilot Agent — let's capture the details so we can help you publish this agent successfully.",
    questions: [
      "To start, **please describe what the agent does.**",
      "**Explain the business challenge or opportunity** that led to the need for this agent.",
      "**Was this enabler developed for project delivery acceleration or internal use?**",
      "**Describe the knowledge base.** Does it contain any sensitive (PII/PHI/Client confidential) information?",
      "**Please specify the development team** involved in building this enabler.",
      "**Estimated number of users** who will be using this agent?",
      "Last one: **Specify the geographic locations** that will be using this agent.",
    ],
  },

  "Promoting Enablers": {
    greeting: "Support in Promoting Enablers — let's capture the details so we can help promote this enabler internally.",
    questions: [
      "To start, **explain the business challenge or opportunity** that led to the need for this enabler.",
      "**Describe the enabler and how it addresses that need.**",
      "**Please specify the development team** involved in building this enabler.",
      "**Who is the sponsoring MD?**",
      "**What third-party tool and/or ecosystem partner** did you use to develop the enabler?",
      "**Does this enabler use AI?** (Yes / No)",
      "Last one: **Please upload or share a link** of Sales Assets, Overview Presentations, One Pagers, Recorded Demos, or Credentials.",
    ],
  },

  "Agent Development - Internal": {
    greeting: "New Agent Development for Internal Operations — let's scope out what you're building!",
    questions: [
      "To start, **what's the Idea Title?** A short working title is perfect.",
      "**Overview of the Idea:** Give me a quick summary of what this agent is and what it does.",
      "**Problem Statement:** What needs will this Agent fulfill and what value can it create?",
      "**What are the expected outcomes of this idea?**",
      "**What is the current approach of performing the task** the agent will take on?",
      "**What data or knowledge base will this agent rely on** to generate its responses?",
      "**What infrastructure or technology would you like to suggest for building this Agent?** (e.g., Copilot Studio, Atlas, OpenAI, Claude, Other — feel free to mention more than one)",
      "**Specify the MD / Business Point of Contact** for this agent.",
      "**Who are the target users for the agent?** (e.g., internal teams, specific personas, functions)",
      "**What is the estimated number of end users impacted by this use case?** (10–50, 51–500, 501–1,000, 1,001–5,000, or Global)",
      "**What is the anticipated revenue impact of this use case?**",
      "**How would you classify the data suggested for this agent?** (e.g., public, internal, confidential, regulated)",
      "**What efficiency gains are expected from this use case?**",
      "Last one: **What are the anticipated operational efficiency savings expected from this use case?**",
    ],
  },
};

// ── Design Thinking Workshop — dynamic branching question builder ──
// `answers` are the user's answers in order (answers[0] = answer to Q1).
const buildDTWQuestions = (answers: string[]): string[] => {
  const list: string[] = [
    "To start, **do you have a defined outcome and scope for the workshop?** (Yes / No)",
  ];

  const common = [
    "**What's the department / functional area** of the session? (e.g., Finance, Internal Audit, Information Technology)",
    "**Briefly describe the purpose / challenge statement** of this workshop.",
    "**How many participants** do you expect?",
    "**What's your preferred workshop date and duration?**",
    "**Workshop type:** Virtual or In-person?",
    "**What support do you need from our Innovation Team** to assist with the workshop?",
    "Last one: **Please provide a project code** for the Innovation Team to capture time spent preparing and executing the workshop and deliverables.",
  ];

  const a1 = (answers[0] || "").toLowerCase().trim();
  if (!a1) return list;

  if (a1.startsWith("n")) {
    list.push("**Briefly describe your big idea and/or workshop request.**");
    return list;
  }

  list.push("**What's the nature of the workshop?** (Client use case or Internal use case)");
  const a2 = (answers[1] || "").toLowerCase();
  if (!a2) return list;

  if (a2.includes("client")) {
    list.push("**What's the client name?**");
    list.push("**Will we be charging a fee for the workshop?** (Yes / No)");
  }
  // Internal: skip client-specific questions

  list.push(...common);
  return list;
};

// ── Pursuit Enablement Support — dynamic branching ──
// Only include the Technology Delivery Enablers demo question when the user
// selected "Demo of an existing enabler / solution" in Q1.
const buildPursuitQuestions = (answers: string[]): string[] => {
  const base = scenarioQuestions["Pursuit Enablement Support"].questions;
  const a1 = (answers[0] || "").toLowerCase();
  const isDemo = a1.includes("demo");
  // base[1] is the "which Technology Delivery Enablers" question
  return isDemo ? base : [base[0], ...base.slice(2)];
};

// ── Training Conference Support — dynamic branching ──
// Client training/workshop → ask "Client name"; Conference/Other → ask "Event name and date" + "Session type".
const buildTrainingQuestions = (answers: string[]): string[] => {
  const base = scenarioQuestions["Training Conference Support"].questions;
  const a1 = (answers[0] || "").toLowerCase();
  const isClient = a1.includes("client training") || a1.includes("client workshop");
  const isEvent = a1.includes("conference") || a1.includes("other training");
  // base[1] = Client name, base[2] = Event name/date, base[3] = Session type, base[6] = Preferred date(s)
  if (isClient) return [base[0], base[1], ...base.slice(4)];
  if (isEvent) return [base[0], base[2], base[3], base[4], base[5], ...base.slice(7)];
  // Before Q1 answered, show only the first question
  return [base[0]];
};

// ── Atlas API Provisioning - Client — dynamic branching ──
// Skip the "Upload MD approval" step when MD approval status is "No".
const buildAtlasApiClientQuestions = (answers: string[]): string[] => {
  const base = scenarioQuestions["Atlas API Provisioning - Client"].questions;
  // answers[0] = project basics (first real answer), [1] = Project ID/Code,
  // [2] = MD sponsor, [3] = MD approval Yes/No, [4] = upload (if Yes)
  const approval = (answers[3] || "").toLowerCase().trim();
  if (!approval) {
    // Until MD approval is answered, only expose questions up to base[3]
    return [base[0], base[1], base[2], base[3]];
  }
  if (approval.startsWith("y")) return base;
  // No → skip upload step (base[4])
  return [base[0], base[1], base[2], base[3], ...base.slice(5)];
};

// Agent Development - Client: skip Region/Country unless target users answer is "Regional"
const buildAgentDevClientQuestions = (answers: string[]): string[] => {
  const base = scenarioQuestions["Agent Development - Client"].questions;
  // answers[0..3] = first 4 questions, answers[4] = target users (Global/Regional)
  const target = (answers[4] || "").toLowerCase().trim();
  if (!target) {
    // Until target users is answered, only expose questions up to base[4]
    return base.slice(0, 5);
  }
  if (target.startsWith("reg")) return base;
  // Global (or anything else) → skip Region (base[5]) and Country (base[6])
  return [...base.slice(0, 5), ...base.slice(7)];
};

// Resolve the active question list for a scenario, taking dynamic branching into account.
const getQuestionsForScenario = (
  scenario: string | null,
  userMessages: { role: string; content: string }[]
): string[] => {
  const fallback = scenarioQuestions["Generic Idea"]?.questions || [];
  if (!scenario) return fallback;
  if (scenario === "Design Thinking Workshop") {
    const answers = userMessages.slice(1).map((m) => m.content);
    return buildDTWQuestions(answers);
  }
  if (scenario === "Pursuit Enablement Support") {
    const answers = userMessages.slice(1).map((m) => m.content);
    return buildPursuitQuestions(answers);
  }
  if (scenario === "Training Conference Support") {
    const answers = userMessages.slice(1).map((m) => m.content);
    return buildTrainingQuestions(answers);
  }
  if (scenario === "Atlas API Provisioning - Client") {
    const answers = userMessages.slice(1).map((m) => m.content);
    return buildAtlasApiClientQuestions(answers);
  }
  if (scenario === "Agent Development - Client") {
    const answers = userMessages.slice(1).map((m) => m.content);
    return buildAgentDevClientQuestions(answers);
  }
  return scenarioQuestions[scenario]?.questions || fallback;
};

const getMaxQuestionCountForScenario = (scenario: string | null): number => {
  if (!scenario) return scenarioQuestions["Generic Idea"]?.questions.length || 0;
  if (scenario === "Design Thinking Workshop") return 11;
  return scenarioQuestions[scenario]?.questions.length || scenarioQuestions["Generic Idea"]?.questions.length || 0;
};

const isQuestionTotalKnown = (
  scenario: string | null,
  userMessages: { role: string; content: string }[]
): boolean => {
  if (!scenario) return false;
  const answers = userMessages.slice(1).map((m) => m.content.toLowerCase().trim());

  if (scenario === "Design Thinking Workshop") {
    if (!answers[0]) return false;
    if (answers[0].startsWith("n")) return true;
    return Boolean(answers[1]);
  }
  if (scenario === "Pursuit Enablement Support" || scenario === "Training Conference Support") {
    return Boolean(answers[0]);
  }
  if (scenario === "Atlas API Provisioning - Client") {
    return Boolean(answers[3]);
  }
  if (scenario === "Agent Development - Client") {
    return Boolean(answers[4]);
  }
  return true;
};


// Triage mapping — which scenarios go directly to IT/AI Studio
const directTriageScenarios = ["AI Studio Support", "AI Studio - Client Workshop", "AI Studio - AI Showcase"];

// ── Rule-based triage routing ──
// Returns { group, rationale } for one of: "AI Studio" | "Innovation Group" | "IT Group"
const mentionsClient = (text: string): boolean => /\bclient(s|'s)?\b/i.test(text || "");

const computeTriageRecommendation = (
  mode: "idea" | "support",
  category: string | null,
  area: string | null,
  answersText: string,
): { group: "AI Studio" | "Innovation Group" | "IT Group"; rationale: string } | null => {
  // Request Support paths → IT
  if (mode === "support") {
    return {
      group: "IT Group",
      rationale: "Per routing rules, all Request Support paths (Design Thinking Workshop, Pursuit Enablement, Training/Conference Support, Protiviti Atlas API Support, Exploring Existing Tools, Copilot Agent Publishing) route to the IT Group.",
    };
  }

  const clientFound = mentionsClient(answersText);

  // Idea to support client delivery
  if (category === "Client Delivery") {
    if (area === "AI Studio") {
      return { group: "AI Studio", rationale: "Client delivery ideas under the AI Studio path route directly to AI Studio across all three sub-paths (Client Workshop, Prototype Development, AI Showcase)." };
    }
    if (area === "Custom Agent Development") {
      return { group: "Innovation Group", rationale: clientFound ? "Custom Agent Development for client delivery with explicit client context routes to the Innovation Group." : "Custom Agent Development under client delivery routes to the Innovation Group." };
    }
    if (area === "Enabler Development") {
      return { group: "Innovation Group", rationale: clientFound ? "Enabler Development for client delivery with explicit client context routes to the Innovation Group." : "Enabler Development under client delivery routes to the Innovation Group." };
    }
    if (area === "Other generic ideas") {
      return { group: "Innovation Group", rationale: "Other generic client delivery ideas route to the Innovation Group." };
    }
  }

  // Internal Operations
  if (category === "Internal Operations") {
    if (area === "Protiviti Atlas") {
      return clientFound
        ? { group: "Innovation Group", rationale: "Internal Ops → Protiviti Atlas mentions client context, routing to the Innovation Group." }
        : { group: "IT Group", rationale: "Internal Ops → Protiviti Atlas with no client context routes to the IT Group." };
    }
    if (area === "Custom Agent Development") {
      return clientFound
        ? { group: "Innovation Group", rationale: "Internal Ops → Custom Agent Development mentions client context, routing to the Innovation Group." }
        : { group: "IT Group", rationale: "Internal Ops → Custom Agent Development with no client context routes to the IT Group." };
    }
    if (area === "Other generic ideas") {
      return { group: "IT Group", rationale: "Other generic Internal Operations ideas route to the IT Group by default." };
    }
  }

  return null;
};

interface ChatInterfaceProps {
  viewingIdea?: RecentIdea | null;
  mode?: "idea" | "support";
}

const ChatInterface = ({ viewingIdea, mode = "idea" }: ChatInterfaceProps) => {
  const navigate = useNavigate();
  const { submitIdea, createDraftIdea, updateIdea, recentIdeas } = useIdeas();
  const isSupportMode = mode === "support";
  const canvasBriefLabel = isSupportMode ? "Support Request" : "Innovation Idea Brief";
  const generatedBriefLabel = isSupportMode ? "Submission Support Request" : "Innovation Idea Brief";
  const shortBriefLabel = isSupportMode ? "Support Request" : "Idea Brief";
  const [messages, setMessages] = useState<Message[]>([]);
  const [draftIdeaId, setDraftIdeaId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [conversationDone, setConversationDone] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedIdea, setSubmittedIdea] = useState<RecentIdea | null>(null);

  // Recommendations
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState<Accelerator[]>([]);
  const [recommendationsDismissed, setRecommendationsDismissed] = useState(false);
  const [selectedAccelerator, setSelectedAccelerator] = useState<Accelerator | null>(null);
  const [awaitingDifferentiationAnswer, setAwaitingDifferentiationAnswer] = useState(false);

  // Evaluation document
  const [evaluationHtml, setEvaluationHtml] = useState("");
  const [isGeneratingEvaluation, setIsGeneratingEvaluation] = useState(false);
  const [evaluationReady, setEvaluationReady] = useState(false);

  const [viewingMessages, setViewingMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [canvasView, setCanvasView] = useState<"recommendations" | "evaluation">("recommendations");
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const evaluationHtmlRef = useRef(evaluationHtml);
  evaluationHtmlRef.current = evaluationHtml;
  const evaluationTargetIdRef = useRef<string | null>(null);
  const [ideaCategory, setIdeaCategory] = useState<string | null>(null);
  const [ideaArea, setIdeaArea] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedDeliverables, setSelectedDeliverables] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Array<{ name: string; type: string; dataUrl: string }>>([]);
  const [routingStepCount, setRoutingStepCount] = useState(0);


  const hasStarted = messages.length > 0;

  const recordRoutingStep = () => setRoutingStepCount((count) => count + 1);
  const removeRoutingStep = () => setRoutingStepCount((count) => Math.max(0, count - 1));

  const toggleListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  const isViewing = !!viewingIdea;
  const displayMessages = isViewing ? viewingMessages : messages;

  useEffect(() => {
    if (viewingIdea) {
      setViewingMessages([...viewingIdea.messages]);
      const existingHtml = viewingIdea.businessPlanHtml || "";
      setEvaluationHtml(existingHtml);
      setEvaluationReady(Boolean(existingHtml));
      if (existingHtml) setCanvasView("evaluation");
    } else {
      setViewingMessages([]);
      setEvaluationHtml("");
      setEvaluationReady(false);
      setAttachments([]);

    }
  }, [viewingIdea?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [displayMessages, conversationDone, submitted, showRecommendations, evaluationReady]);

  useEffect(() => {
    if (!isViewing && draftIdeaId && messages.length > 0) {
      updateIdea(draftIdeaId, { messages });
    }
  }, [isViewing, draftIdeaId, messages]);

  useEffect(() => {
    if (isViewing && viewingIdea?.id && viewingMessages.length > 0) {
      updateIdea(viewingIdea.id, { messages: viewingMessages });
    }
  }, [isViewing, viewingMessages]);

  // Save evaluation to idea
  useEffect(() => {
    if (evaluationReady && evaluationHtml && evaluationTargetIdRef.current) {
      updateIdea(evaluationTargetIdRef.current, { businessPlanHtml: evaluationHtml });
    }
  }, [evaluationReady, evaluationHtml]);

  const resetChat = () => {
    setMessages([]);
    setInput("");
    setSelectedScenario(null);
    setQuestionIndex(0);
    setConversationDone(false);
    setSubmitted(false);
    setSubmittedIdea(null);
    setShowRecommendations(false);
    setRecommendations([]);
    setRecommendationsDismissed(false);
    setSelectedAccelerator(null);
    setEvaluationHtml("");
    setIsGeneratingEvaluation(false);
    setEvaluationReady(false);
    setDraftIdeaId(null);
    setIdeaCategory(null);
    setIdeaArea(null);
    setRoutingStepCount(0);
    setAwaitingDifferentiationAnswer(false);
    evaluationTargetIdRef.current = null;
  };

  const handleGoBack = () => {
    if (hasStarted && !conversationDone) {
      // During Q&A: remove last user msg + last assistant question to go back one step
      const lastUserIdx = messages.map((m, i) => ({ role: m.role, i })).filter(m => m.role === "user").pop()?.i;
      if (lastUserIdx !== undefined && lastUserIdx > 0) {
        const assistantBefore = messages.slice(0, lastUserIdx).map((m, i) => ({ role: m.role, i })).filter(m => m.role === "assistant").pop()?.i;
        const cutPoint = assistantBefore !== undefined ? assistantBefore : lastUserIdx;
        setMessages(messages.slice(0, cutPoint));
        setQuestionIndex(Math.max(0, questionIndex - 1));
      } else {
        // Returning from Q&A to the selection screen that triggered this scenario.
        setMessages([]);
        setQuestionIndex(0);
        setSelectedScenario(null);
        setConversationDone(false);
        removeRoutingStep();
        if (mode === "support" || ideaCategory === "Support") {
          // Support flow: return to the support welcome (no category/area)
          setIdeaCategory(null);
          setIdeaArea(null);
        } else if (ideaArea && subAreas[ideaArea]) {
          // The scenario was launched from a sub-area picker — keep parent so picker re-renders.
        } else if (ideaArea) {
          // Terminal area click launched the scenario — clear area so the area picker re-renders.
          setIdeaArea(null);
        }
      }
    } else if (ideaArea) {
      // In sub-area or area selection — go back to area / category
      setIdeaArea(null);
      removeRoutingStep();
    } else if (ideaCategory) {
      // In area selection — go back to category
      setIdeaCategory(null);
      removeRoutingStep();
    } else {
      // At the top of the chat flow — go back to the homepage
      navigate("/");
    }
  };

  const handleCancelSubmission = () => {
    setShowCancelModal(false);
    resetChat();
  };

  const extractAnswers = (): Record<string, string> => {
    // Exclude clarifying follow-up replies — they're already merged into the preceding answer.
    const userMsgs = messages.filter((m) => m.role === "user" && !m.followUpReply);
    const scenario = selectedScenario || "Generic Idea";
    const qs = getQuestionsForScenario(scenario, userMsgs);
    const result: Record<string, string> = {};
    // First user message is the idea itself
    result["Idea Description"] = userMsgs[0]?.content || "";
    // Remaining are answers to follow-up questions
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i].replace(/\*\*/g, "").replace(/Last one: /g, "");
      result[q] = userMsgs[i + 1]?.content || "";
    }
    return result;
  };


  const handleSend = (text?: string) => {
    const value = text || input;
    if (!value.trim() || isTyping) return;

    // Handle differentiation follow-up answer for "Client Other"
    if (awaitingDifferentiationAnswer) {
      const userMsg: Message = { role: "user", content: value };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setAwaitingDifferentiationAnswer(false);
      setIsTyping(true);
      setTimeout(() => {
        const reviewText = isSupportMode
          ? "Thanks for sharing the details! Generating your support request for review now..."
          : "Thanks for explaining what makes your idea unique! Generating your idea to review for submission now...";
        setMessages((prev) => [
          ...prev,
          { role: "assistant" as const, content: reviewText },
        ]);
        setIsTyping(false);
        // Now proceed with actual submission
        setRecommendationsDismissed(true);
        setCanvasView("evaluation");
        const targetId = draftIdeaId || undefined;
        evaluationTargetIdRef.current = targetId || null;
        generateEvaluation(targetId);
      }, 1000);
      return;
    }

    const userMsg: Message = { role: "user", content: value };
    const isFirstMessage = messages.length === 0;

    let scenario = selectedScenario;
    if (isFirstMessage) {
      // Map the selection through the decision tree to a scenario
      // Category-aware override: "Other" under Client Delivery uses "Client Other"
      let mappedScenario = selectionToScenario[value] || null;
      if ((value === "Other" || value === "Other generic ideas") && ideaCategory === "Client Delivery") {
        mappedScenario = "Client Other";
      }
      if ((value === "Other" || value === "Other generic ideas") && ideaCategory === "Internal Operations") {
        mappedScenario = "Internal Other";
      }
      if (value === "Use Case Development" && ideaCategory === "Client Delivery") {
        mappedScenario = "Atlas Use Case Development - Client";
      }
      if (value === "New Agent Development" && ideaCategory === "Client Delivery") {
        mappedScenario = "Agent Development - Client";
      }
      if (value === "New Agent Development" && ideaCategory === "Internal Operations") {
        // Use the same question set as Client Delivery for Custom Agent Development
        mappedScenario = "Agent Development - Client";
      }
      if (value === "New Protiviti Atlas API Provisioning" && ideaCategory === "Client Delivery") {
        mappedScenario = "Atlas API Provisioning - Client";
      }
      if (value === "New Protiviti Atlas API Provisioning" && ideaCategory === "Internal Operations") {
        mappedScenario = "Atlas API Provisioning - Internal";
      }
      if (value === "Existing Protiviti Atlas API Provisioning" && ideaCategory === "Client Delivery") {
        mappedScenario = "Atlas API Provisioning Existing - Client";
      }
      if (value === "Existing Protiviti Atlas API Provisioning" && ideaCategory === "Internal Operations") {
        mappedScenario = "Atlas API Provisioning Existing - Internal";
      }
      if (value === "Existing Protiviti Atlas API Provisioning" && ideaCategory === "Support") {
        mappedScenario = "Atlas API Provisioning Existing - Support";
      }
      if (value === "Enabler Development" && ideaCategory === "Client Delivery") {
        mappedScenario = "Enabler Development - Client";
      }
      const matchedScenario = mappedScenario && scenarioQuestions[mappedScenario] ? mappedScenario : (scenarioQuestions[value] ? value : null);
      scenario = matchedScenario;
      setSelectedScenario(matchedScenario);
    }

    const followUps = scenario && scenarioQuestions[scenario]
      ? scenarioQuestions[scenario]
      : scenarioQuestions["Generic Idea"];

    if (isFirstMessage) {
      const isScenarioClick = !!scenarioQuestions[value];
      const greeting: Message = {
        role: "assistant",
        content: isScenarioClick
          ? followUps.greeting + " I'll ask you a few questions to understand your needs."
          : followUps.greeting + ` Let me help you shape **"${value}"** into a structured ${isSupportMode ? "support request" : "submission"}.`,
      };
      const firstQuestion: Message = {
        role: "assistant",
        content: followUps.questions[0],
      };

      if (isScenarioClick) {
        const initialMessages = [userMsg, greeting, firstQuestion];
        setMessages(initialMessages);
        const draft = createDraftIdea(value, initialMessages, ideaCategory || undefined, ideaArea || value);
        setDraftIdeaId(draft.id);
        setQuestionIndex(1);
      } else {
        const initialMessages = [userMsg, greeting, firstQuestion];
        setMessages(initialMessages);
        const draft = createDraftIdea(value, initialMessages, ideaCategory || undefined, ideaArea || undefined);
        setDraftIdeaId(draft.id);
        setQuestionIndex(1);
      }
      setInput("");
      return;
    }

    // Not first message — handle either a normal answer or a reply to a smart follow-up.
    setInput("");
    setIsTyping(true);

    let updatedMessages: Message[];
    updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    // Update idea title with the first real answer (the idea description).
    const realUserMsgCount = updatedMessages.filter((m) => m.role === "user").length;
    if (realUserMsgCount === 2 && draftIdeaId) {
      const betterTitle = value.slice(0, 60) || "Untitled Idea";
      updateIdea(draftIdeaId, { title: betterTitle });
    }

    (async () => {
      // Recompute the question list against the updated answers so dynamic
      // scenarios (e.g. Design Thinking Workshop) can branch on user answers.
      const updatedUserMsgs = updatedMessages.filter((m) => m.role === "user");
      const dynamicQuestions = getQuestionsForScenario(scenario, updatedUserMsgs);

      // Advance to next question, or wrap up.
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));
      if (questionIndex < dynamicQuestions.length) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant" as const, content: dynamicQuestions[questionIndex] },
        ]);
        setQuestionIndex((i) => i + 1);
      } else {
        setShowRecommendations(false);
        setRecommendationsDismissed(true);
        setCanvasView("evaluation");
        handleProceedWithSubmission(updatedMessages);
        setConversationDone(true);
      }
      setIsTyping(false);
    })();
  };

  const handleProceedWithSubmission = (msgOverride?: Message[]) => {
    setRecommendationsDismissed(true);
    setCanvasView("evaluation");


    const briefLabel = generatedBriefLabel;
    const proceedMsg: Message = {
      role: "assistant",
      content: `Generating your **${briefLabel}** — preparing a qualitative summary for the review board...`,
    };
    const msgsToUse = msgOverride || messages;
    setMessages((prev) => [...prev, proceedMsg]);

    const targetId = draftIdeaId || undefined;
    evaluationTargetIdRef.current = targetId || null;
    generateEvaluation(targetId);
  };

  const generateEvaluation = useCallback(async (targetId?: string, refinement?: string, currentHtml?: string) => {
    setIsGeneratingEvaluation(true);
    setEvaluationReady(false);

    const previousHtml = evaluationHtmlRef.current;

    try {
      let body: Record<string, any>;
      if (refinement && currentHtml) {
        body = { refinement, currentHtml, requestType: mode };
      } else {
        const answers = extractAnswers();
        const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
        const answersText = Object.values(answers).join(" \n ");
        const triage = computeTriageRecommendation(mode, ideaCategory, ideaArea, answersText);
        body = {
          scenario: selectedScenario || "Generic Idea",
          idea: answers["Idea Description"] || messages.find((m) => m.role === "user")?.content || "",
          answers,
          recommendations: recommendations.map((r) => ({ name: r.name, category: r.category })),
          submissionDate: today,
          requestType: mode,
          triageRecommendation: triage,
        };
      }

      let data: any = null;
      let error: any = null;

      const result = await supabase.functions.invoke("generate-evaluation", { body });
      data = result.data;
      error = result.error;

      if (error) {
        try {
          const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-evaluation`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify(body),
          });
          const json = await resp.json().catch(() => ({}));
          if (resp.ok) { data = json; error = null; }
        } catch { /* keep original */ }
      }

      if (error) {
        console.error("Evaluation generation failed:", error);
        toast.error(`Failed to generate ${generatedBriefLabel}`);
        if (refinement && previousHtml) {
          setEvaluationHtml(previousHtml);
          setEvaluationReady(true);
        }
        return;
      }

      let parsedData = data;
      if (typeof data === "string") {
        try { parsedData = JSON.parse(data); } catch { parsedData = data; }
      }
      let html = typeof parsedData?.html === "string" ? parsedData.html : (typeof parsedData === "string" ? parsedData : "");
      const htmlMatch = html.match(/```html\s*([\s\S]*?)```/);
      if (htmlMatch) html = htmlMatch[1].trim();

      if (html.trim()) {

        // Append attachments section so any documents uploaded in chat are
        // accessible from within the generated brief.
        if (attachments.length > 0) {
          const items = attachments.map((a) => {
            const isImage = a.type.startsWith("image/");
            const preview = isImage
              ? `<div style="margin-top:8px;"><img src="${a.dataUrl}" alt="${a.name}" style="max-width:100%;max-height:240px;border:1px solid #e5e7eb;border-radius:6px;" /></div>`
              : "";
            return `<li style="margin-bottom:12px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:6px;background:#fafafa;list-style:none;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
                <div style="display:flex;align-items:center;gap:8px;min-width:0;">
                  <span style="font-size:18px;">📎</span>
                  <span style="font-weight:600;color:#111827;word-break:break-all;">${a.name}</span>
                  <span style="font-size:12px;color:#6b7280;">(${a.type || "file"})</span>
                </div>
                <div style="display:flex;gap:8px;">
                  <a href="${a.dataUrl}" target="_blank" rel="noopener" style="color:#ea580c;font-weight:600;text-decoration:none;font-size:13px;">View</a>
                  <a href="${a.dataUrl}" download="${a.name}" style="color:#ea580c;font-weight:600;text-decoration:none;font-size:13px;">Download</a>
                </div>
              </div>
              ${preview}
            </li>`;
          }).join("");
          const section = `<section style="margin-top:32px;padding-top:24px;border-top:2px solid #e5e7eb;">
            <h2 style="font-size:20px;font-weight:700;color:#111827;margin-bottom:12px;">Attached Documents</h2>
            <p style="color:#6b7280;margin-bottom:16px;font-size:14px;">Documents uploaded during intake. Click View to open in a new tab or Download to save a copy.</p>
            <ul style="padding:0;margin:0;">${items}</ul>
          </section>`;
          // Insert before closing body tag if present; otherwise append.
          if (/<\/body>/i.test(html)) {
            html = html.replace(/<\/body>/i, `${section}</body>`);
          } else {
            html = `${html}${section}`;
          }
        }
        setEvaluationHtml(html);
        setEvaluationReady(true);
        const readyLabel = generatedBriefLabel;
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant" as const,
            content: `Your **${readyLabel}** is ready! Review it on the right panel. You can request changes or submit for review.`,
          },
        ]);
      } else if (refinement && previousHtml) {
        setEvaluationHtml(previousHtml);
        setEvaluationReady(true);
        toast.error("Evaluation update returned empty. Previous version restored.");
      } else {
        toast.error("Evaluation generation returned empty content.");
      }
    } catch (e) {
      console.error("Evaluation generation error:", e);
      toast.error("Failed to generate evaluation. Please try again.");
      if (refinement && previousHtml) {
        setEvaluationHtml(previousHtml);
        setEvaluationReady(true);
      }
    } finally {
      setIsGeneratingEvaluation(false);
    }
  }, [messages, selectedScenario, recommendations, attachments, mode, generatedBriefLabel]);


  const handleRefinement = (text: string) => {
    if (!text.trim() || isGeneratingEvaluation) return;
    const userMsg: Message = { role: "user", content: text };
    const refineLabel = generatedBriefLabel;
    const assistantMsg: Message = { role: "assistant", content: `Got it! Updating the ${refineLabel}...` };

    if (isViewing && viewingIdea) {
      setViewingMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      const currentHtml = evaluationHtmlRef.current || viewingIdea.businessPlanHtml || "";
      evaluationTargetIdRef.current = viewingIdea.id;
      generateEvaluation(viewingIdea.id, text, currentHtml);
    } else {
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      const currentHtml = evaluationHtmlRef.current;
      const targetId = draftIdeaId || undefined;
      if (targetId) evaluationTargetIdRef.current = targetId;
      generateEvaluation(targetId, text, currentHtml);
    }
  };

  const handleSubmit = () => {
    if (draftIdeaId) {
      updateIdea(draftIdeaId, { messages, businessPlanHtml: evaluationHtml || undefined });
      const existingIdea = recentIdeas.find((i) => i.id === draftIdeaId);
      if (existingIdea) setSubmittedIdea(existingIdea);
    } else {
      const userMessages = messages.filter((m) => m.role === "user");
      const title = userMessages[0]?.content || "Untitled Idea";
      const idea = submitIdea(title, messages, undefined, evaluationHtml || undefined);
      setSubmittedIdea(idea);
    }
    setSubmitted(true);
  };

  const hasCanvasContent = evaluationHtml || isGeneratingEvaluation || showRecommendations ||
    (isViewing && viewingIdea?.businessPlanHtml);

  // Progress for the intake phase — drives the canvas progress indicator.
  // Counts every multiple-choice/answer click from the very first step (category selection)
  // through the final scenario question.
  const userMessagesForProgress = messages.filter((m) => m.role === "user" && !m.followUpReply);
  const currentQuestionCount = getQuestionsForScenario(
    selectedScenario,
    userMessagesForProgress
  ).length;
  const totalQuestions = isQuestionTotalKnown(selectedScenario, userMessagesForProgress)
    ? currentQuestionCount
    : getMaxQuestionCountForScenario(selectedScenario);
  const userMsgCount = userMessagesForProgress.length;
  let totalSteps: number;
  let answeredSteps: number;
  let showStepCount: boolean;
  if (selectedScenario && totalQuestions > 0) {
    const answeredScenarioQuestions = Math.max(userMsgCount - 1, 0);
    totalSteps = routingStepCount + totalQuestions;
    answeredSteps = Math.min(routingStepCount + answeredScenarioQuestions, totalSteps);
    showStepCount = isQuestionTotalKnown(selectedScenario, userMessagesForProgress);
  } else {
    // Pre-scenario phase: scale progress to button clicks so far, capped below 100%.
    // We don't know total steps yet, so hide the "X of Y" label.
    totalSteps = routingStepCount;
    answeredSteps = routingStepCount;
    showStepCount = false;
  }
  const progressPct = selectedScenario && totalSteps > 0
    ? Math.min(Math.round((answeredSteps / totalSteps) * 100), 100)
    : Math.min(answeredSteps * 8, 24); // 0%, ~8%, ~16% as user picks category/area
  const inQuestionPhase = !isViewing && !submitted && !evaluationHtml &&
    !isGeneratingEvaluation && !conversationDone;

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {/* ===== LEFT PANEL — Chat ===== */}
      <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
        <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
          {/* Chat Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-sidebar-border shrink-0">
            {!isViewing && !submitted && (
              <button
                onClick={handleGoBack}
                className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
                title="Go back"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-sm text-sidebar-foreground truncate">
                {isViewing ? viewingIdea.title : "Spark Intake Agent"}
              </h2>
              <p className="text-[11px] text-sidebar-foreground/60 truncate">
                {isViewing
                  ? `Assigned to ${viewingIdea.assignedTo.name}`
                  : "AI-guided idea intake & evaluation"}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            <AnimatePresence>
              {displayMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-sidebar-accent text-sidebar-foreground"
                    }`}
                  >
                    <ReactMarkdown
                      components={{
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Quick-reply choices for DTW: Innovation Team support question */}
            {(() => {
              const last = displayMessages[displayMessages.length - 1];
              if (!last || last.role !== "assistant" || isTyping || conversationDone) return null;
              if (!last.content.includes("What support do you need from our Innovation Team")) return null;
              const options = [
                { label: "Consultation", desc: "Requestor facilitates. Innovation Team provides a pre-session consult (agenda/method review, facilitation tips)." },
                { label: "Coaching", desc: "Requestor facilitates. Innovation Team provides coaching support before and during the session." },
                { label: "Facilitation", desc: "Requestor provides session objectives/agenda. Innovation Team provides a facilitator to lead the session." },
                { label: "End-to-End Facilitation", desc: "Innovation Team helps define the objectives, shape the agenda, and facilitate the session." },
              ];
              return (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2 items-start">
                  {options.map((o) => (
                    <button
                      key={o.label}
                      onClick={() => handleSend(`${o.label}: ${o.desc}`)}
                      className="max-w-[85%] text-left rounded-lg border-2 border-sidebar-foreground/20 bg-sidebar-accent text-sidebar-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm hover:shadow-md transition-all px-3 py-2.5 text-sm"
                    >
                      <span className="font-semibold block">{o.label}</span>
                      <span className="block text-xs opacity-80 mt-0.5">{o.desc}</span>
                    </button>
                  ))}
                </motion.div>
              );
            })()}

            {/* Quick-reply choices for Pursuit Enablement Support: type of pursuit support question */}
            {(() => {
              const last = displayMessages[displayMessages.length - 1];
              if (!last || last.role !== "assistant" || isTyping || conversationDone) return null;
              if (!last.content.includes("what type of pursuit support do you need")) return null;
              const options = [
                { label: "RFI/RFP response" },
                { label: "Proposal creation" },
                { label: "Demo of an existing enabler / solution" },
                { label: "Build/Prototype New Enabler" },
              ];
              return (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2 items-start w-[85%]">
                  {options.map((o) => (
                    <button
                      key={o.label}
                      onClick={() => handleSend(o.label)}
                      className="w-full text-left rounded-lg border-2 border-sidebar-foreground/20 bg-sidebar-accent text-sidebar-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm hover:shadow-md transition-all px-3 py-2.5 text-sm"
                    >
                      <span className="font-semibold block">{o.label}</span>
                    </button>
                  ))}
                </motion.div>

              );
            })()}

            {/* Quick-reply choices for live client opportunity question */}
            {(() => {
              const last = displayMessages[displayMessages.length - 1];
              if (!last || last.role !== "assistant" || isTyping || conversationDone) return null;
              if (!last.content.includes("tied to a live client opportunity")) return null;
              const options = [
                { label: "Yes — active pursuit" },
                { label: "No — prep, reuse asset, or internal readiness" },
              ];
              return (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2 items-start w-[85%]">
                  {options.map((o) => (
                    <button
                      key={o.label}
                      onClick={() => handleSend(o.label)}
                      className="w-full text-left rounded-lg border-2 border-sidebar-foreground/20 bg-sidebar-accent text-sidebar-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm hover:shadow-md transition-all px-3 py-2.5 text-sm"
                    >
                      <span className="font-semibold block">{o.label}</span>
                    </button>
                  ))}
                </motion.div>
              );
            })()}

            {/* Quick-reply choices for Pursuit Enablement Support: deliverables multi-select */}
            {(() => {
              const last = displayMessages[displayMessages.length - 1];
              if (!last || last.role !== "assistant" || isTyping || conversationDone) return null;
              if (!last.content.includes("What deliverables are needed")) return null;
              const options = [
                "Deck/slide narrative",
                "Written response (RFI/RFP answers)",
                "Prototype/POC",
                "Demo of an existing enabler/solution",
                "Other (please specify)",
              ];
              return (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2 items-start w-[85%]">
                  <div className="w-full rounded-lg border border-sidebar-border bg-sidebar-accent p-3 space-y-2">
                    {options.map((label) => {
                      const isSelected = selectedDeliverables.includes(label);
                      return (
                        <button
                          key={label}
                          onClick={() => {
                            setSelectedDeliverables((prev) =>
                              isSelected ? prev.filter((l) => l !== label) : [...prev, label]
                            );
                          }}
                          className={`w-full text-left rounded-md border px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/10 text-primary-foreground"
                              : "border-sidebar-border bg-sidebar text-sidebar-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${
                            isSelected ? "bg-primary border-primary" : "border-sidebar-foreground/40"
                          }`}>
                            {isSelected && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <span className="font-semibold block">{label}</span>
                        </button>
                      );
                    })}
                    <div className="border-t border-sidebar-border my-1" />
                    <button
                      onClick={() => {
                        setSelectedDeliverables((prev) =>
                          prev.length === options.length ? [] : options
                        );
                      }}
                      className={`w-full text-left rounded-md border px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                        selectedDeliverables.length === options.length
                          ? "border-primary bg-primary/10 text-primary-foreground"
                          : "border-sidebar-border bg-sidebar text-sidebar-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${
                        selectedDeliverables.length === options.length ? "bg-primary border-primary" : "border-sidebar-foreground/40"
                      }`}>
                        {selectedDeliverables.length === options.length && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <span className="font-semibold block">Select All</span>
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      if (selectedDeliverables.length === 0) return;
                      const combined = selectedDeliverables.join(", ");
                      handleSend(combined);
                      setSelectedDeliverables([]);
                    }}
                    disabled={selectedDeliverables.length === 0}
                    className="rounded-lg bg-primary text-primary-foreground font-semibold text-sm px-4 py-2.5 hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Submit Selection
                  </button>
                </motion.div>
              );
            })()}

            {/* Quick-reply choices for format or channel of delivery question */}
            {(() => {
              const last = displayMessages[displayMessages.length - 1];
              if (!last || last.role !== "assistant" || isTyping || conversationDone) return null;
              if (!last.content.includes("format or channel of delivery")) return null;
              const options = [
                { label: "Live meeting presentation" },
                { label: "Email delivery" },
                { label: "Portal upload" },
                { label: "Leave-behind deck only" },
              ];
              return (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2 items-start w-[85%]">
                  {options.map((o) => (
                    <button
                      key={o.label}
                      onClick={() => handleSend(o.label)}
                      className="w-full text-left rounded-lg border-2 border-sidebar-foreground/20 bg-sidebar-accent text-sidebar-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm hover:shadow-md transition-all px-3 py-2.5 text-sm"
                    >
                      <span className="font-semibold block">{o.label}</span>
                    </button>
                  ))}
                </motion.div>
              );
            })()}

            {/* Quick-reply choices for Training Conference Support: type of support question */}
            {(() => {
              const last = displayMessages[displayMessages.length - 1];
              if (!last || last.role !== "assistant" || isTyping || conversationDone) return null;
              if (!last.content.includes("what type of training or conference support do you need")) return null;
              const options = [
                { label: "Client training / enablement session" },
                { label: "Client workshop (co-creation / use cases)" },
                { label: "Conference / event session support (speaker prep)" },
                { label: "Other training-related support" },
              ];
              return (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2 items-start w-[85%]">
                  {options.map((o) => (
                    <button
                      key={o.label}
                      onClick={() => handleSend(o.label)}
                      className="w-full text-left rounded-lg border-2 border-sidebar-foreground/20 bg-sidebar-accent text-sidebar-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm hover:shadow-md transition-all px-3 py-2.5 text-sm"
                    >
                      <span className="font-semibold block">{o.label}</span>
                    </button>
                  ))}
                </motion.div>
              );
            })()}
            {/* Quick-reply choices for Agent Development - Client multiple-choice questions */}
            {(() => {
              const last = displayMessages[displayMessages.length - 1];
              if (!last || last.role !== "assistant" || isTyping || conversationDone) return null;
              const content = last.content;

              // Multi-select checkbox for industry teams
              if (content.includes("industry team(s) does this apply to")) {
                const options = [
                  "Energy & Utilities",
                  "Consumer Products & Services",
                  "Financial Services",
                  "Technology, Media & Telecommunication",
                  "Aerospace, Defense & Federal",
                  "Private Equity",
                  "Public Sector",
                  "Healthcare",
                ];
                return (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2 items-start w-[85%]">
                    <div className="w-full rounded-lg border border-sidebar-border bg-sidebar-accent p-3 space-y-2">
                      {options.map((label) => {
                        const isSelected = selectedIndustries.includes(label);
                        return (
                          <button
                            key={label}
                            onClick={() => {
                              setSelectedIndustries((prev) =>
                                isSelected ? prev.filter((l) => l !== label) : [...prev, label]
                              );
                            }}
                            className={`w-full text-left rounded-md border px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                              isSelected
                                ? "border-primary bg-primary/10 text-primary-foreground"
                                : "border-sidebar-border bg-sidebar text-sidebar-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary"
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${
                              isSelected ? "bg-primary border-primary" : "border-sidebar-foreground/40"
                            }`}>
                              {isSelected && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                            </div>
                            <span className="font-semibold block">{label}</span>
                          </button>
                        );
                      })}
                      <div className="border-t border-sidebar-border my-1" />
                      <button
                        onClick={() => {
                          setSelectedIndustries((prev) =>
                            prev.length === options.length ? [] : options
                          );
                        }}
                        className={`w-full text-left rounded-md border px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                          selectedIndustries.length === options.length
                            ? "border-primary bg-primary/10 text-primary-foreground"
                            : "border-sidebar-border bg-sidebar text-sidebar-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${
                          selectedIndustries.length === options.length ? "bg-primary border-primary" : "border-sidebar-foreground/40"
                        }`}>
                          {selectedIndustries.length === options.length && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <span className="font-semibold block">Select All</span>
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        if (selectedIndustries.length === 0) return;
                        const combined = selectedIndustries.join(", ");
                        handleSend(combined);
                        setSelectedIndustries([]);
                      }}
                      disabled={selectedIndustries.length === 0}
                      className="rounded-lg bg-primary text-primary-foreground font-semibold text-sm px-4 py-2.5 hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Submit Selection
                    </button>
                  </motion.div>
                );
              }

              const choiceSets: { match: string; options: string[] }[] = [
                {
                  match: "estimated number of end users impacted",
                  options: ["10 – 50", "51 – 500", "501 – 1000", "1001 – 5000", "Global"],
                },
                {
                  match: "anticipated revenue impact",
                  options: [
                    "No direct revenue contribution",
                    "Minor indirect revenue contribution",
                    "Some measurable revenue contribution",
                    "Enables new revenue stream",
                    "Major drivers for high-margin or recurring revenue",
                  ],
                },
                {
                  match: "efficiency gains are expected",
                  options: [
                    "Minimal measurable impact; isolated use",
                    "Small gains for a single team",
                    "Moderate cross-team gains",
                    "High impact on multiple cross-team processes",
                    "Major cross-functional gains for client and internal operations",
                  ],
                },
                {
                  match: "classify the data suggested",
                  options: [
                    "Personal Identifiable Information / Employee Data (e.g., name, SSN, email)",
                    "Confidential Client Information (e.g., financial records, customer data)",
                    "Confidential Company Information (e.g., internal reports, source code)",
                    "Non-Confidential Business Information (e.g., project plans, training docs)",
                    "Public Data (e.g., published reports, open datasets)",
                    "Other",
                  ],
                },
                {
                  match: "intended end user",
                  options: ["Client", "Protiviti"],
                },
                {
                  match: "Who is the competitor",
                  options: ["Consulting Firm", "Third Party Vendor"],
                },
                {
                  match: "Market Demand look like",
                  options: [
                    "Market Demand in the next 0–3 months",
                    "Market Demand in the next 3–12 months",
                    "Market Demand in 1–2 years",
                    "Market Demand in 2+ years",
                  ],
                },
                {
                  match: "anticipated operational efficiency savings",
                  options: [
                    "No direct savings contribution",
                    "Minor indirect savings contribution",
                    "Some measurable savings contribution",
                    "Significant savings contributions",
                    "Major savings and cost reductions",
                  ],
                },
              ];
              const set = choiceSets.find((s) => content.includes(s.match));
              if (!set) return null;
              return (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2 items-start w-[85%]">
                  {set.options.map((label) => (
                    <button
                      key={label}
                      onClick={() => handleSend(label)}
                      className="w-full text-left rounded-lg border-2 border-sidebar-foreground/20 bg-sidebar-accent text-sidebar-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm hover:shadow-md transition-all px-3 py-2.5 text-sm"
                    >
                      <span className="font-semibold block">{label}</span>
                    </button>
                  ))}
                </motion.div>
              );
            })()}

            {/* Quick-reply Yes/No for "Does this enabler use AI?" */}
            {(() => {
              const last = displayMessages[displayMessages.length - 1];
              if (!last || last.role !== "assistant" || isTyping || conversationDone) return null;
              if (!last.content.includes("Does this enabler use AI")) return null;
              const options = ["Yes", "No"];
              return (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2 items-start w-[85%]">
                  {options.map((label) => (
                    <button
                      key={label}
                      onClick={() => handleSend(label)}
                      className="w-full text-left rounded-lg border-2 border-sidebar-foreground/20 bg-sidebar-accent text-sidebar-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm hover:shadow-md transition-all px-3 py-2.5 text-sm"
                    >
                      <span className="font-semibold block">{label}</span>
                    </button>
                  ))}
                </motion.div>
              );
            })()}

            {isTyping && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="bg-sidebar-accent rounded-lg px-3 py-2 text-sm text-sidebar-foreground/60">
                  <span className="inline-block animate-pulse">●</span>
                  <span className="inline-block animate-pulse" style={{ animationDelay: "0.3s" }}> ●</span>
                  <span className="inline-block animate-pulse" style={{ animationDelay: "0.6s" }}> ●</span>
                </div>
              </motion.div>
            )}

            {/* Proceed with submission button in chat */}
            {showRecommendations && recommendations.length > 0 && !recommendationsDismissed && !submitted && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                <button
                  onClick={() => handleProceedWithSubmission()}
                  className="flex items-center gap-2 rounded-lg bg-secondary text-primary-foreground font-semibold text-sm px-4 py-2.5 hover:bg-secondary/90 transition-colors"
                >
                  <Rocket className="w-4 h-4" />
                  {isSupportMode ? "Proceed with Support Request" : "Proceed with New Submission"}
                </button>
              </motion.div>
            )}

            {/* Canvas view toggle links */}
            {(evaluationReady || (isViewing && viewingIdea?.businessPlanHtml)) && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                <div className="bg-sidebar-accent rounded-lg px-3 py-2.5 text-sm space-y-1.5">
                  <p className="text-xs font-medium text-sidebar-foreground/70 mb-1">View in canvas:</p>
                  <div className="flex flex-col gap-1">
                    {recommendations.length > 0 && (
                      <button
                        onClick={() => setCanvasView("recommendations")}
                        className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${canvasView === "recommendations" ? "text-primary-foreground bg-primary/80 px-2 py-1 rounded" : "text-sidebar-primary-foreground hover:text-primary px-2 py-1"}`}
                      >
                        <Package className="w-3.5 h-3.5" />
                        Recommendations
                      </button>
                    )}
                    <button
                      onClick={() => setCanvasView("evaluation")}
                      className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${canvasView === "evaluation" ? "text-primary-foreground bg-primary/80 px-2 py-1 rounded" : "text-sidebar-primary-foreground hover:text-primary px-2 py-1"}`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {canvasBriefLabel}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Welcome Screen — Support Mode */}
            {!isViewing && !hasStarted && !isTyping && mode === "support" && !ideaCategory && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center py-8"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-sidebar-foreground mb-1">What kind of support do you need?</h2>
                <p className="text-sidebar-foreground/60 mb-6 text-center text-xs max-w-xs">
                  Select a support path to get started.
                </p>
                <div className="grid grid-cols-1 gap-3 w-full">
                  <button
                    onClick={() => {
                      recordRoutingStep();
                      setIdeaCategory("Support");
                      setIdeaArea("Design Thinking Workshop");
                      handleSend("Design Thinking Workshop");
                    }}
                    className="flex items-center gap-3 p-4 rounded-lg border-2 border-sidebar-foreground/20 bg-sidebar-accent hover:border-primary hover:bg-sidebar-accent/80 shadow-sm hover:shadow-md transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Lightbulb className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-sidebar-foreground block">Design Thinking Workshop</span>
                      <span className="text-[11px] text-sidebar-foreground/50 leading-tight">Facilitate a workshop to frame and explore a problem</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      recordRoutingStep();
                      setIdeaCategory("Support");
                      setIdeaArea("Pursuit Enablement Support");
                      handleSend("Pursuit Enablement Support");
                    }}
                    className="flex items-center gap-3 p-4 rounded-lg border-2 border-sidebar-foreground/20 bg-sidebar-accent hover:border-primary hover:bg-sidebar-accent/80 shadow-sm hover:shadow-md transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Rocket className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-sidebar-foreground block">Pursuit Enablement Support</span>
                      <span className="text-[11px] text-sidebar-foreground/50 leading-tight">Support for an active client pursuit or proposal</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      recordRoutingStep();
                      setIdeaCategory("Support");
                      setIdeaArea("Training Conference Support");
                      handleSend("Training Conference Support");
                    }}
                    className="flex items-center gap-3 p-4 rounded-lg border-2 border-sidebar-foreground/20 bg-sidebar-accent hover:border-primary hover:bg-sidebar-accent/80 shadow-sm hover:shadow-md transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-sidebar-foreground block">Training / Conference Support</span>
                      <span className="text-[11px] text-sidebar-foreground/50 leading-tight">Support for a training event or conference session</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      recordRoutingStep();
                      setIdeaCategory("Support");
                      setIdeaArea("Protiviti Atlas API Support");
                    }}
                    className="flex items-center gap-3 p-4 rounded-lg border-2 border-sidebar-foreground/20 bg-sidebar-accent hover:border-primary hover:bg-sidebar-accent/80 shadow-sm hover:shadow-md transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <BarChart3 className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-sidebar-foreground block">Protiviti Atlas API Support</span>
                      <span className="text-[11px] text-sidebar-foreground/50 leading-tight">New and Existing Protiviti Atlas API provisioning support</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      recordRoutingStep();
                      setIdeaCategory("Support");
                      setIdeaArea("Support in Exploring Existing Tools");
                      handleSend("Support in Exploring Existing Tools");
                    }}
                    className="flex items-center gap-3 p-4 rounded-lg border-2 border-sidebar-foreground/20 bg-sidebar-accent hover:border-primary hover:bg-sidebar-accent/80 shadow-sm hover:shadow-md transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Wrench className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-sidebar-foreground block">Support in Exploring Existing Tools</span>
                      <span className="text-[11px] text-sidebar-foreground/50 leading-tight">ProGPT, Power Platforms training and demos</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      recordRoutingStep();
                      setIdeaCategory("Support");
                      setIdeaArea("Copilot Agent Publishing Support");
                      handleSend("Copilot Agent Publishing Support");
                    }}
                    className="flex items-center gap-3 p-4 rounded-lg border-2 border-sidebar-foreground/20 bg-sidebar-accent hover:border-primary hover:bg-sidebar-accent/80 shadow-sm hover:shadow-md transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Rocket className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-sidebar-foreground block">Copilot Agent Publishing Support</span>
                      <span className="text-[11px] text-sidebar-foreground/50 leading-tight">Support for publishing Copilot agents</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      recordRoutingStep();
                      setIdeaCategory("Support");
                      setIdeaArea("Support in Promoting Enablers");
                      handleSend("Support in Promoting Enablers");
                    }}
                    className="flex items-center gap-3 p-4 rounded-lg border-2 border-sidebar-foreground/20 bg-sidebar-accent hover:border-primary hover:bg-sidebar-accent/80 shadow-sm hover:shadow-md transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-sidebar-foreground block">Support in Promoting Enablers</span>
                      <span className="text-[11px] text-sidebar-foreground/50 leading-tight">Helping to promote enabler internally</span>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Welcome Screen — Step 1: Category Selection */}
            {!isViewing && !hasStarted && !isTyping && mode === "idea" && !ideaCategory && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center py-8"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-sidebar-foreground mb-1">What type of idea is this?</h2>
                <p className="text-sidebar-foreground/60 mb-6 text-center text-xs max-w-xs">
                  Select a category to get started.
                </p>
                <div className="grid grid-cols-1 gap-3 w-full">
                  <button
                    onClick={() => {
                      recordRoutingStep();
                      setIdeaCategory("Client Delivery");
                    }}
                    className="flex items-center gap-3 p-4 rounded-lg border-2 border-sidebar-foreground/20 bg-sidebar-accent hover:border-primary hover:bg-sidebar-accent/80 shadow-sm hover:shadow-md transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-sidebar-foreground block">Ideas to support client delivery</span>
                      <span className="text-[11px] text-sidebar-foreground/50 leading-tight">Solutions, tools, or innovations for client engagements</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      recordRoutingStep();
                      setIdeaCategory("Internal Operations");
                    }}
                    className="flex items-center gap-3 p-4 rounded-lg border-2 border-sidebar-foreground/20 bg-sidebar-accent hover:border-primary hover:bg-sidebar-accent/80 shadow-sm hover:shadow-md transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Shield className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-sidebar-foreground block">Ideas to transform/enhance internal operations</span>
                      <span className="text-[11px] text-sidebar-foreground/50 leading-tight">Improve internal processes, tools, or workflows</span>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Welcome Screen — Step 2: Area Selection */}
            {!isViewing && !hasStarted && !isTyping && ideaCategory && !ideaArea && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center py-8"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-sidebar-foreground mb-1">What area best aligns with your idea?</h2>
                <p className="text-sidebar-foreground/40 mb-6 text-center text-xs max-w-xs">
                   <span className="font-medium text-sidebar-foreground/50">{ideaCategory === "Client Delivery" ? "Client Delivery" : "Internal Protiviti Operations"}</span>
                 </p>
                <div className="grid grid-cols-1 gap-2 w-full">
                  {(ideaCategory === "Client Delivery" ? clientAreas : internalAreas).map(({ label, icon: Icon, description }) => {
                    const hasSubArea = !!subAreas[label];
                    return (
                      <button
                        key={label}
                        onClick={() => {
                          recordRoutingStep();
                          if (label === "Protiviti Atlas") {
                            // Skip sub-area picker — go straight to Use Case Development
                            setIdeaArea(label);
                            handleSend("Use Case Development");
                          } else if (label === "Custom Agent Development") {
                            // Skip sub-area picker — go straight to New Agent Development questions
                            setIdeaArea(label);
                            handleSend("New Agent Development");
                          } else if (hasSubArea) {
                            setIdeaArea(label);
                          } else {
                            // Terminal selection — start conversation
                            setIdeaArea(label);
                            handleSend(label);
                          }
                        }}
                        className="flex items-center gap-3 p-3 rounded-lg border-2 border-sidebar-foreground/20 bg-sidebar-accent hover:border-primary hover:bg-sidebar-accent/80 shadow-sm hover:shadow-md transition-all text-left group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                        </div>
                        <div>
                          <span className="text-xs font-medium text-sidebar-foreground block">{label}</span>
                          <span className="text-[10px] text-sidebar-foreground/50 leading-tight">{description}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => {
                    removeRoutingStep();
                    setIdeaCategory(null);
                  }}
                   className="mt-4 text-xs text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors"
                 >
                   ← Back to category selection
                </button>
              </motion.div>
            )}

            {/* Welcome Screen — Step 3: Sub-Area Selection */}
            {!isViewing && !hasStarted && !isTyping && ideaCategory && ideaArea && subAreas[ideaArea] && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center py-8"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-sidebar-foreground mb-1">
                  {ideaArea === "AI Studio" ? "Is this a..." : ideaArea === "Protiviti Atlas" ? "Is this for..." : "Is this..."}
                </h2>
                <p className="text-sidebar-foreground/40 mb-6 text-center text-xs max-w-xs">
                   <span className="font-medium text-sidebar-foreground/50">{ideaCategory}</span> → <span className="font-medium text-sidebar-foreground/50">{ideaArea}</span>
                 </p>
                <div className="grid grid-cols-1 gap-2 w-full">
                  {subAreas[ideaArea].map(({ label, icon: Icon, description }) => (
                     <button
                       key={label}
                       onClick={() => {
                          recordRoutingStep();
                         if (subAreas[label]) {
                           setIdeaArea(label);
                         } else {
                           handleSend(label);
                         }
                       }}
                      className="flex items-center gap-3 p-3 rounded-lg border-2 border-sidebar-foreground/20 bg-sidebar-accent hover:border-primary hover:bg-sidebar-accent/80 shadow-sm hover:shadow-md transition-all text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                      </div>
                      <div>
                        <span className="text-xs font-medium text-sidebar-foreground block">{label}</span>
                        <span className="text-[10px] text-sidebar-foreground/50 leading-tight">{description}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    removeRoutingStep();
                    setIdeaArea(null);
                  }}
                   className="mt-4 text-xs text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors"
                 >
                   ← Back to area selection
                </button>
              </motion.div>
            )}

            {/* Submitted confirmation */}
            {!isViewing && submitted && submittedIdea && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-4">
                <div className="rounded-lg border-2 border-accent/40 bg-sidebar-accent p-4 text-center">
                  <CheckCircle2 className="w-10 h-10 text-accent mx-auto mb-2" />
                  <h3 className="font-semibold text-sidebar-foreground text-base mb-1">{isSupportMode ? "Support Request Submitted!" : "Submitted for Review!"}</h3>
                  <p className="text-xs text-sidebar-foreground/60 mb-2">
                    {isSupportMode
                      ? "Your support request has been submitted. The team will review it and route it to the right support group."
                      : "Your idea has been submitted. Congratulations. The team will review it and assign it to either the AI studio, the innovation team, or the IT group."}
                  </p>
                  <p className="text-xs text-sidebar-foreground/60 mb-3">
                    You can track your status through the dashboard.
                  </p>
                  {selectedScenario && directTriageScenarios.includes(selectedScenario) && (
                    <div className="rounded-lg border border-accent/30 bg-accent/10 p-2 mb-3">
                      <p className="text-[11px] text-accent font-medium">
                        ⚡ This submission has been auto-routed to IT & AI Studio for direct support.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

{/* Submit and Regenerate buttons above chat */}
          {evaluationReady && !isViewing && !submitted && (
            <div className="flex gap-2 px-3 pt-2 border-t border-sidebar-border shrink-0">
              <button
                onClick={handleSubmit}
                className="flex-1 py-2 rounded-lg bg-secondary text-primary-foreground font-semibold text-sm hover:bg-secondary/90 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Submit for Review
              </button>
              <button
                onClick={() => generateEvaluation(evaluationTargetIdRef.current || draftIdeaId || undefined)}
                className="py-2 px-4 rounded-lg border border-sidebar-border text-sidebar-foreground font-medium text-sm hover:bg-sidebar-accent transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate
              </button>
            </div>
          )}

          {/* Input Bar — always visible */}
          <div className="px-3 pb-3 pt-2 border-t border-sidebar-border shrink-0">
            {(() => {
              const lastAsst = [...displayMessages].reverse().find((m) => m.role === "assistant");
              const isMdUpload =
                !isViewing &&
                !conversationDone &&
                !!lastAsst?.content?.includes("Upload MD approval:");
              const isSalesUpload =
                !isViewing &&
                !conversationDone &&
                !!lastAsst?.content?.includes("Sales Assets");
              const isUploadStep = isMdUpload || isSalesUpload;
              return isUploadStep ? (
                <div className="mb-2 flex items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-2">
                  <label className="flex-1 cursor-pointer text-xs text-sidebar-foreground/80 hover:text-sidebar-foreground transition-colors flex items-center gap-2 px-2 py-1.5">
                    <FileText className="w-4 h-4 text-primary" />
                    <span>
                      {isSalesUpload
                        ? "Click to attach sales assets (PDF, PPT, DOC, image, or video)"
                        : "Click to attach approval (image, PDF, or .msg)"}
                    </span>
                    <input
                      type="file"
                      accept={isSalesUpload ? "image/*,video/*,application/pdf,.ppt,.pptx,.doc,.docx" : "image/*,application/pdf,.msg,.eml"}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            toast.error("File too large. Please attach files under 10MB.");
                            e.target.value = "";
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => {
                            const dataUrl = reader.result as string;
                            setAttachments((prev) => [...prev, { name: file.name, type: file.type || "application/octet-stream", dataUrl }]);
                            handleSend(`${isSalesUpload ? "Attached asset" : "Attached approval"}: ${file.name}`);
                          };
                          reader.readAsDataURL(file);
                        }
                        e.target.value = "";
                      }}

                    />
                  </label>
                  <span className="text-[10px] text-sidebar-foreground/50">or type a link below</span>
                </div>
              ) : null;
            })()}
            <div className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent p-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (isViewing) handleRefinement(input);
                    else if (conversationDone && evaluationReady) handleRefinement(input);
                    else if (!conversationDone) handleSend();
                  }
                }}
                placeholder={
                  isGeneratingEvaluation
                    ? `Generating ${shortBriefLabel.toLowerCase()}...`
                    : isViewing
                    ? `Describe changes to the ${shortBriefLabel.toLowerCase()}...`
                    : conversationDone && evaluationReady
                    ? `Request changes to the ${shortBriefLabel.toLowerCase()}...`
                    : conversationDone && !evaluationReady
                    ? `Generating ${generatedBriefLabel}...`
                    : hasStarted
                    ? "Type your answer..."
                    : isSupportMode
                    ? "Describe your support request..."
                    : "Describe your idea..."
                }
                className="flex-1 bg-transparent outline-none text-sm text-sidebar-foreground placeholder:text-sidebar-foreground/40"
                disabled={isGeneratingEvaluation || (conversationDone && !evaluationReady && !isViewing)}
              />
              <button
                onClick={toggleListening}
                disabled={isGeneratingEvaluation || submitted}
                className={`p-2 rounded-lg transition-colors ${isListening ? "bg-destructive text-destructive-foreground animate-pulse" : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"}`}
                title={isListening ? "Stop listening" : "Voice input"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  if (isListening && recognitionRef.current) {
                    recognitionRef.current.stop();
                    setIsListening(false);
                  }
                  if (isViewing) handleRefinement(input);
                  else if (conversationDone && evaluationReady) handleRefinement(input);
                  else if (!conversationDone) handleSend();
                }}
                disabled={!input.trim() || isTyping || isGeneratingEvaluation}
                className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* ===== RIGHT PANEL — Canvas ===== */}
      <ResizablePanel defaultSize={65} minSize={30}>
        <div className="h-full flex flex-col bg-background overflow-hidden">
          {hasCanvasContent ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Canvas toolbar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                  {canvasView === "recommendations" ? (
                    <>
                      <Package className="w-4 h-4 text-secondary" />
                      <h3 className="font-semibold text-sm text-foreground">Existing Solutions</h3>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-sm text-foreground">{canvasBriefLabel}</h3>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {canvasView === "evaluation" && isGeneratingEvaluation && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Generating...
                    </span>
                  )}
                  {canvasView === "evaluation" && evaluationReady && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const html = evaluationHtml || viewingIdea?.businessPlanHtml || "";
                          if (html) {
                            const blob = new Blob([html], { type: "text/html" });
                            window.open(URL.createObjectURL(blob), "_blank");
                          }
                        }}
                        className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        New Tab
                      </button>
                      <button
                        onClick={async () => {
                          const html = evaluationHtml || viewingIdea?.businessPlanHtml || "";
                          if (html) {
                            const { default: html2pdf } = await import("html2pdf.js");
                            const container = document.createElement("div");
                            container.innerHTML = html;
                            document.body.appendChild(container);
                            await html2pdf().set({
                              margin: 0.5,
                              filename: `${recentIdeas.find(i => i.id === draftIdeaId)?.title || viewingIdea?.title || "evaluation-report"}.pdf`,
                              image: { type: "jpeg", quality: 0.98 },
                              html2canvas: { scale: 2 },
                              jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
                            }).from(container).save();
                            document.body.removeChild(container);
                          }
                        }}
                        className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        Download PDF
                      </button>
                    </div>
                  )}
                  {!isViewing && !submitted && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="flex items-center gap-1 text-xs font-medium text-destructive hover:text-destructive/80 transition-colors ml-2"
                    >
                      <Ban className="w-3 h-3" />
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Canvas content */}
              <div className="flex-1 relative overflow-auto">
                {canvasView === "recommendations" && (
                  <div className="p-6 space-y-4">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-foreground mb-1">Recommended Existing Solutions</h3>
                      <p className="text-sm text-muted-foreground">
                        These solutions may already address your needs. Explore them or proceed with your {isSupportMode ? "support request" : "new submission"}.
                      </p>
                    </div>

                    {recommendations.length > 0 ? (
                      <>
                        {recommendations.map((acc) => (
                          <motion.div
                            key={acc.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-lg border border-border bg-card p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-semibold text-foreground text-sm">{acc.name}</h4>
                                <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 ${
                                  acc.status === "active" ? "bg-accent/10 text-accent" :
                                  acc.status === "beta" ? "bg-secondary/10 text-secondary" :
                                  "bg-muted text-muted-foreground"
                                }`}>
                                  {acc.status.toUpperCase()} • {acc.category.replace("-", " ").toUpperCase()}
                                </span>
                              </div>
                              <button
                                onClick={() => setSelectedAccelerator(acc)}
                                className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors shrink-0"
                              >
                                Open <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{acc.description}</p>
                            <div className="flex flex-wrap gap-1">
                              {acc.tags.slice(0, 4).map((tag) => (
                                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <div className="mt-2 pt-2 border-t border-border">
                              <p className="text-[10px] text-muted-foreground font-medium mb-1">Key Use Cases:</p>
                              <ul className="text-[10px] text-muted-foreground space-y-0.5">
                                {acc.useCases.map((uc) => (
                                  <li key={uc}>• {uc}</li>
                                ))}
                              </ul>
                            </div>
                          </motion.div>
                        ))}

                      </>
                    ) : (
                      <div className="text-center py-12">
                        <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">No matching solutions found.</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Your {isSupportMode ? "support request will be reviewed by the team" : "idea will be evaluated as a new submission"}.</p>
                      </div>
                    )}

                    {/* Selected accelerator detail */}
                    {selectedAccelerator && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4"
                        onClick={() => setSelectedAccelerator(null)}
                      >
                        <motion.div
                          initial={{ scale: 0.95 }}
                          animate={{ scale: 1 }}
                          className="bg-card rounded-xl shadow-xl max-w-lg w-full p-6 relative"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => setSelectedAccelerator(null)}
                            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <h3 className="text-lg font-bold text-foreground mb-1">{selectedAccelerator.name}</h3>
                          <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mb-3 ${
                            selectedAccelerator.status === "active" ? "bg-accent/10 text-accent" :
                            selectedAccelerator.status === "beta" ? "bg-secondary/10 text-secondary" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {selectedAccelerator.status.toUpperCase()} • {selectedAccelerator.category.replace("-", " ").toUpperCase()}
                          </span>
                          <p className="text-sm text-foreground/80 mb-4">{selectedAccelerator.description}</p>
                          <div className="mb-4">
                            <p className="text-xs font-semibold text-foreground mb-2">Team: {selectedAccelerator.team}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedAccelerator.tags.map((tag) => (
                                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{tag}</span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground mb-2">Use Cases</p>
                            <ul className="space-y-1">
                              {selectedAccelerator.useCases.map((uc) => (
                                <li key={uc} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
                                  {uc}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </div>
                )}

                {canvasView === "evaluation" && (
                  <>
                    {isGeneratingEvaluation ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center space-y-4">
                          <div className="relative w-16 h-16 mx-auto">
                            <svg className="absolute inset-0 w-16 h-16 animate-spin" style={{ animationDuration: '2s' }} viewBox="0 0 64 64">
                              <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--primary) / 0.15)" strokeWidth="3" />
                              <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" strokeDasharray="176" strokeDashoffset="132" />
                            </svg>
                            <div className="absolute inset-2 rounded-full bg-primary/10 flex items-center justify-center">
                              <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">Generating {generatedBriefLabel}...</p>
                            <p className="text-xs text-muted-foreground mt-1">Summarizing your {isSupportMode ? "support request" : "submission"}</p>
                          </div>
                        </div>
                      </div>
                    ) : (evaluationHtml || (isViewing && viewingIdea?.businessPlanHtml)) ? (
                      <iframe
                        srcDoc={evaluationHtml || viewingIdea?.businessPlanHtml}
                        title={generatedBriefLabel}
                        className="w-full h-full border-0"
                        sandbox="allow-scripts allow-forms allow-modals allow-popups"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">{generatedBriefLabel} will appear here after you proceed.</p>
                      </div>
                    )}
                  </>
                )}
              </div>


              {/* Assigned member */}
              {(isViewing && viewingIdea) && (
                <div className="px-4 py-3 border-t border-border shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                      {viewingIdea?.assignedTo.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{viewingIdea?.assignedTo.name}</p>
                      <p className="text-xs text-muted-foreground">{viewingIdea?.assignedTo.role}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              {!isViewing && (ideaCategory || hasStarted) && !submitted && (
                <div className="flex justify-end px-4 py-2 border-b border-border shrink-0">
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="flex items-center gap-1 text-xs font-medium text-destructive hover:text-destructive/80 transition-colors"
                  >
                    <Ban className="w-3 h-3" />
                    {isSupportMode ? "Cancel Request" : "Cancel Submission"}
                  </button>
                </div>
              )}
              <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
                {inQuestionPhase ? (
                  (() => {
                    const radius = 52;
                    const circumference = 2 * Math.PI * radius;
                    const dashOffset = circumference - (progressPct / 100) * circumference;
                    return (
                      <div className="w-full max-w-md flex flex-col items-center">
                        {/* Circular progress */}
                        <div className="relative w-36 h-36 mb-4">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r={radius} stroke="hsl(var(--muted))" strokeWidth="8" fill="none" />
                            <circle
                              cx="60"
                              cy="60"
                              r={radius}
                              stroke="hsl(var(--primary))"
                              strokeWidth="8"
                              fill="none"
                              strokeLinecap="round"
                              strokeDasharray={circumference}
                              strokeDashoffset={dashOffset}
                              className="transition-all duration-700 ease-out"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <FileText className="w-6 h-6 text-primary mb-1" />
                            <span className="text-2xl font-semibold text-foreground tabular-nums">{progressPct}%</span>
                          </div>
                        </div>
                        <h3 className="text-base font-semibold text-foreground/80 mb-1">Canvas</h3>
                        <p className="text-xs text-muted-foreground mb-6">
                          {showStepCount
                            ? `Building your ${generatedBriefLabel} — ${answeredSteps} of ${totalSteps} steps completed`
                            : `Building your ${generatedBriefLabel}`}
                        </p>

                      </div>
                    );
                  })()
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                      <Layout className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground/60 mb-1">Canvas</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Recommendations and your {generatedBriefLabel} will appear here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </ResizablePanel>

      {/* Cancel Confirmation Modal */}
      <AlertDialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isSupportMode ? "Cancel Request?" : "Cancel Submission?"}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this {isSupportMode ? "request" : "submission"}? All progress will be lost and you'll return to the start.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelSubmission} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isSupportMode ? "Yes, Cancel Request" : "Yes, Cancel Submission"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ResizablePanelGroup>
  );
};

export default ChatInterface;
