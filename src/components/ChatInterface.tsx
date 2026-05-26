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
}

// ── Decision Tree Areas ──
const clientAreas = [
  { label: "AI Studio", icon: Cpu, description: "AI showcases, workshops, and prototypes" },
  { label: "Custom Agent", icon: Bot, description: "Custom agent development and publishing" },
  { label: "Enabler Development", icon: Wrench, description: "Using Atlas and other enabling technologies" },
  { label: "Copilot Agent Publishing Support", icon: Rocket, description: "Support for publishing Copilot agents" },
  { label: "Support in Promoting Enablers", icon: Package, description: "Help promoting and publishing enablers" },
  { label: "Other", icon: Sparkles, description: "Other client delivery ideas" },
];

const internalAreas = [
  { label: "Protiviti Atlas", icon: BarChart3, description: "Atlas platform use cases and API provisioning" },
  { label: "Custom Agent", icon: Bot, description: "Custom agent development and publishing" },
  { label: "Support in Exploring Existing Tools", icon: Wrench, description: "ProGPT, Power Platforms for engagement delivery acceleration" },
  { label: "Copilot Agent Publishing Support", icon: Rocket, description: "Support for publishing Copilot agents" },
  { label: "Support in Promoting Enablers", icon: Package, description: "Help promoting and publishing enablers" },
  { label: "Other", icon: Sparkles, description: "Other internal operations ideas" },
];

const subAreas: Record<string, { label: string; icon: any; description: string }[]> = {
  "AI Studio": [
    { label: "Client Workshop", icon: TrendingUp, description: "Schedule or run a client workshop" },
    { label: "Prototype Development", icon: Wrench, description: "Build a proof of concept or prototype" },
    { label: "Idea for an AI Showcase", icon: Sparkles, description: "Submit an idea for the AI Showcase" },
  ],
  "Protiviti Atlas": [
    { label: "Use Case Development", icon: Lightbulb, description: "Develop a new use case on Atlas" },
    { label: "New Protiviti Atlas API Provisioning", icon: Rocket, description: "Provision a new Atlas API" },
    { label: "Existing Protiviti Atlas API Provisioning", icon: Workflow, description: "Provision an existing Atlas API" },
  ],
  "Custom Agent": [
    { label: "New Agent Development", icon: Bot, description: "Build a new custom agent" },
    { label: "Support in Promoting & Publishing Enablers", icon: Package, description: "Help promote and publish enablers" },
  ],
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
  "Idea for an AI Showcase": "AI Studio - AI Showcase",
  "Use Case Development": "Atlas Use Case Development",
  "New Protiviti Atlas API Provisioning": "Enabler Development",
  "Existing Protiviti Atlas API Provisioning": "Enabler Development",
  "New Agent Development": "Agent Development",
  "Support in Promoting & Publishing Enablers": "Enabler Development",
  "Explore Existing Tools (ProGPT & Power Automate)": "Generic Idea",
  "Support in Promoting Enablers": "Enabler Development",
  "Enabler Development": "Enabler Development",
  "Copilot Agent Publishing Support": "Enabler Development",
  "Design Thinking Workshop": "Design Thinking Workshop",
  "Pursuit Enablement Support": "Pursuit Enablement Support",
  "Support in Exploring Existing Tools": "Generic Idea",
  "Client use case / enabler": "Atlas API Provisioning - Client",
  "Experimentation / Learning / Internal Use": "Atlas API Provisioning - Internal",
  "Training Conference Support": "Training Conference Support",
  "Other": "Generic Idea",
};

// ── Scenario-Specific Follow-Up Questions ──
const scenarioQuestions: Record<string, { greeting: string; questions: string[] }> = {
  "Design Thinking Workshop": {
    greeting: "Design Thinking Workshop support — let's capture the details so we can shape the right session for you.",
    questions: [
      "To start, **what type of training support do you need?** (Client training/enablement session, Client workshop for co-creation/use cases, Conference/event session support for speaker prep, or Other training-related support)",
      "**What's the primary goal or outcome?** (e.g., increase AI skills, enable Copilot adoption, explore use cases, prep leaders to deliver workshop)",
      "**How would you like the support delivered?** (Build the content/materials for you, Co-create content with you, Review/QA and improve existing materials, Co-present, or Other — please specify)",
      "**What's your preferred date(s), timeline, and duration?**",
      "**What session format works best?** (Virtual, In-person, or Hybrid) — if In-person or Hybrid, please also share the **location** (city / office / client site).",
      "**Who's the primary point of contact** for coordination?",
      "**Who is the MD Sponsor** for this effort?",
      "If this is a **client training or workshop**, please share the **client name**, any **C-Suite alignment**, and any **relevant background** on what's happened already. (If not client-facing, just say N/A)",
      "If this is **conference/event session support**, please share the **event name + date**, **session type** (panel, keynote, breakout, or workshop), **speaker(s)**, **what you need help with**, and whether you have **existing slides/materials** to start from. (If not applicable, say N/A)",
      "Last one: **Anything else we should know?** Constraints, audience size, or additional context.",
    ],
  },
  "Training Conference Support": {
    greeting: "Training Conference Support — we'll capture the details for your conference or training event. (More questions coming soon.)",
    questions: [
      "To start, **briefly describe the training or conference support you need.** Include the event, audience, and what kind of help you're looking for.",
    ],
  },
  "Pursuit Enablement Support": {
    greeting: "Pursuit Enablement Support — let's capture the details so we can mobilize the right help for your opportunity.",
    questions: [
      "To start, **what type of pursuit support do you need?** Select all that apply: RFI/RFP response, Proposal creation, Demo of an existing enabler/solution, Build/Prototype new enabler.",
      "If you selected a demo, **which Tech Delivery Enablers or Solutions** should be demoed? (e.g., AI Showcase, AI showcase and enablers, Technology Delivery Enablers — list all that apply, or say N/A)",
      "**Is this request tied to a live client opportunity with a due date?** (Yes — active pursuit / No — prep, reuse asset, or internal readiness)",
      "**What is the client delivery or presentation date and time?**",
      "**What problem are they trying to solve, and what are the key client questions or asks?**",
      "**What deliverables are needed?** Select all that apply: Deck/slide narrative, Written response (RFI/RFP answers), Prototype/POC, Demo of an existing enabler/solution, Other (please specify).",
      "**What's the format or channel of delivery?** (Live meeting presentation, Email delivery, Portal upload, or Leave-behind deck only)",
      "**Who is the target audience?** (Executive/Board/Audit Committee, Business leadership, IT/Security/Data/Engineering, or Mixed audience)",
      "**Who should be involved or consulted?** Please share names of the people who need to be looped in.",
      "Last one: **Where should the working materials live?** Please share the SharePoint folder link.",
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
      "To start, **what's the name of your enabler/idea?** A short working title is perfect.",
      "**What enabler are you looking to build?** Describe the capability or tool in 1-2 sentences.",
      "**Problem Statement:** What need does your idea fulfill? Describe the gap or pain point it addresses.",
      "**Proposed Solution:** What are your expected outcomes from this idea? How will it solve the problem?",
      "**Idea Description:** Walk me through how your idea works in a bit more detail.",
      "**Will this be built on Atlas or another platform/technology?** Specify the platform and any key dependencies.",
      "**What existing tools or processes does this replace or enhance?** Describe the current state.",
      "**What C-Suite Solution Team(s) does this apply to?** (e.g., CFO, CIO, CRO, CHRO, COO — you can list multiple)",
      "**What industry team(s) does this apply to?** (e.g., Financial Services, Healthcare, Consumer Products)",
      "**MD Sponsor:** Who is the MD championing this idea internally?",
      "**Who is the intended end user of your idea?** (e.g., client executives, internal teams, specific personas)",
      "**What is the anticipated revenue impact of this use case?**",
      "**What efficiency gains are expected from this use case?**",
      "**Who is the competitor?** (Consulting Firms, Third Party Vendors, or both) — and **name(s)** to be aware of.",
      "**Current Market Demand:** How would you describe the demand for this in the market today?",
      "**What is the estimated number of end users impacted by this use case?** (10–50, 51–500, 501–1,000, 1,001–5,000, or Global)",
      "**Support Type:** What kind of support are you looking for to develop this?",
      "**How will you measure adoption and success?** Number of users, integrations, or business outcomes.",
      "Last one: **Do you have Client Validation for this idea?** If yes, please share the **name of the client**.",
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
      "To start, **what's the name of your idea?** A short working title is perfect.",
      "**Problem Statement:** What need does your idea fulfill? Describe the gap or pain point it addresses.",
      "**Proposed Solution:** What are the expected outcomes from this idea? How will it solve the problem?",
      "**Idea Description:** Walk me through how your idea works in a bit more detail.",
      "**MD Sponsor:** Who is the MD championing this idea internally?",
      "**Who is the intended end user of your idea?** (e.g., client executives, internal teams, specific personas)",
      "**What C-Suite Solution Team(s) does this apply to?** (e.g., CFO, CIO, CRO, CHRO, COO — you can list multiple)",
      "**What industry team(s) does this apply to?** (e.g., Financial Services, Healthcare, Consumer Products)",
      "**Who is the competitor?** Are we up against Consulting Firms, Third Party Vendors, or both?",
      "**Name of the competitor(s)** — who specifically should we be aware of?",
      "**What is the estimated number of end users impacted by this use case?** (10–50, 51–500, 501–1,000, 1,001–5,000, or Global)",
      "Last one: **Do you have Client Validation for this idea?** If yes, please share the **name of the client**.",
    ],
  },
  "Internal Other": {
    greeting: "Great — let's capture your internal operations idea! I'll walk you through a few questions to gather everything we need for the review board.",
    questions: [
      "To start, **what's the name of your idea?** A short working title is perfect.",
      "**Problem Statement:** What need does your idea fulfill? Describe the gap or pain point it addresses.",
      "**Proposed Solution:** What are the expected outcomes from this idea? How will it solve the problem?",
      "**Idea Description:** Walk me through how your idea works in a bit more detail.",
      "**MD Sponsor:** Who is the MD championing this idea internally?",
      "**Who is the intended end user of your idea?** (e.g., specific internal teams, functions, or roles)",
      "**What type of support are you looking for?** (e.g., Idea Refinement, Design Thinking, Proto Recognition, POC, Development, Technical Resources — you can list multiple)",
      "Last one: **What is the estimated number of end users impacted by this use case?** (10–50, 51–500, 501–1,000, 1,001–5,000, or Global)",
    ],
  },
  "Atlas Use Case Development": {
    greeting: "Use Case Development on Protiviti Atlas — let's capture the details so we can scope and prioritize this properly.",
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
      "**What is the anticipated operational efficiency savings expected from this use case?**",
      "**Who is the competitor?** (e.g., Consulting Firms, Third Party Vendors, or both)",
      "**Name of the competitor(s)** — who specifically should we be aware of?",
      "**Current Market Demand:** How would you describe the demand for this in the market today?",
      "**What is the estimated number of end users impacted by this use case?** (10–50, 51–500, 501–1,000, 1,001–5,000, or Global)",
      "**Support Type:** What kind of support are you looking for to develop this use case?",
      "Last one: **Do you have Client Validation for this idea?** If yes, please share the **name of the client**.",
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
      "**Project & sponsor details:** share the **Project ID/Code**, the **MD sponsor** championing this project, and **MD approval status** (Yes/No — if Yes, attach or share a link).",
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
      "**MD approval:** Yes / No — if Yes, please **attach or share a link to the MD approval**.",
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
  "Agent Development - Client": {
    greeting: "New Agent Development for Client Delivery — let's scope out what you're building!",
    questions: [
      "To start, **what's the Idea Title?** A short working title is perfect.",
      "**Overview of the Idea:** Give me a quick summary of what this agent is and what it does.",
      "**Problem Statement:** What needs will this Agent fulfill and what value can it create?",
      "**What are the expected outcomes of this idea?**",
      "**What is the current approach of performing the task** the agent will take on?",
      "**What data or knowledge base will this agent rely on** to generate its responses?",
      "**What infrastructure or technology would you like to suggest for building this Agent?** (e.g., Copilot Studio, Atlas, OpenAI, Claude, Other — feel free to mention more than one)",
      "**Specify the MD / Business Point of Contact** for this agent.",
      "**Who are the target users for the agent?** (e.g., client executives, internal teams, specific personas)",
      "**What is the estimated number of end users impacted by this use case?** (10–50, 51–500, 501–1,000, 1,001–5,000, or Global)",
      "**What is the anticipated revenue impact of this use case?**",
      "**How would you classify the data suggested for this agent?** (e.g., public, internal, confidential, regulated)",
      "**What efficiency gains are expected from this use case?**",
      "Last one: **What are the anticipated operational efficiency savings expected from this use case?**",
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

// Triage mapping — which scenarios go directly to IT/AI Studio
const directTriageScenarios = ["AI Studio Support", "AI Studio - Client Workshop", "AI Studio - AI Showcase"];

interface ChatInterfaceProps {
  viewingIdea?: RecentIdea | null;
  mode?: "idea" | "support";
}

const ChatInterface = ({ viewingIdea, mode = "idea" }: ChatInterfaceProps) => {
  const navigate = useNavigate();
  const { submitIdea, createDraftIdea, updateIdea, recentIdeas } = useIdeas();
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
  const hasStarted = messages.length > 0;

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
    setAwaitingDifferentiationAnswer(false);
    evaluationTargetIdRef.current = null;
  };

  const handleGoBack = () => {
    if (hasStarted && !conversationDone) {
      // During Q&A: remove last user msg + last assistant question to go back one step
      const lastUserIdx = messages.map((m, i) => ({ role: m.role, i })).filter(m => m.role === "user").pop()?.i;
      if (lastUserIdx !== undefined && lastUserIdx > 0) {
        // Remove messages from lastUserIdx onward, and the assistant question before it
        const assistantBefore = messages.slice(0, lastUserIdx).map((m, i) => ({ role: m.role, i })).filter(m => m.role === "assistant").pop()?.i;
        const cutPoint = assistantBefore !== undefined ? assistantBefore : lastUserIdx;
        setMessages(messages.slice(0, cutPoint));
        setQuestionIndex(Math.max(0, questionIndex - 1));
      } else {
        // Only one user message — go back to selection
        setMessages([]);
        setQuestionIndex(0);
        setSelectedScenario(null);
        setConversationDone(false);
      }
    } else if (ideaArea && subAreas[ideaArea]) {
      // In sub-area selection — go back to area
      setIdeaArea(null);
    } else if (ideaArea) {
      setIdeaArea(null);
    } else if (ideaCategory) {
      // In area selection — go back to category
      setIdeaCategory(null);
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
    const userMsgs = messages.filter((m) => m.role === "user");
    const scenario = selectedScenario || "Generic Idea";
    const qs = scenarioQuestions[scenario]?.questions || [];
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
        setMessages((prev) => [
          ...prev,
          { role: "assistant" as const, content: "Thanks for explaining what makes your idea unique! Generating your idea to review for submission now..." },
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
      if (value === "Other" && ideaCategory === "Client Delivery") {
        mappedScenario = "Client Other";
      }
      if (value === "Other" && ideaCategory === "Internal Operations") {
        mappedScenario = "Internal Other";
      }
      if (value === "Use Case Development" && ideaCategory === "Client Delivery") {
        mappedScenario = "Atlas Use Case Development - Client";
      }
      if (value === "New Agent Development" && ideaCategory === "Client Delivery") {
        mappedScenario = "Agent Development - Client";
      }
      if (value === "New Agent Development" && ideaCategory === "Internal Operations") {
        mappedScenario = "Agent Development - Internal";
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
        mappedScenario = "Atlas API Provisioning Existing - Client";
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
          : followUps.greeting + ` Let me help you shape **"${value}"** into a structured submission.`,
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

    // Not first message — add answer and ask next question
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsTyping(true);

    // Update idea title with the first real answer (the idea description)
    const userMsgCount = updatedMessages.filter(m => m.role === "user").length;
    if (userMsgCount === 2 && draftIdeaId) {
      // Second user message is the first real answer — use as title
      const betterTitle = value.slice(0, 60) || "Untitled Idea";
      updateIdea(draftIdeaId, { title: betterTitle });
    }

    setTimeout(() => {
      if (questionIndex < followUps.questions.length) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant" as const, content: followUps.questions[questionIndex] },
        ]);
        setQuestionIndex((i) => i + 1);
      } else {
        // All questions answered — go straight to evaluation report
        setShowRecommendations(false);
        setRecommendationsDismissed(true);
        setCanvasView("evaluation");
        handleProceedWithSubmission(updatedMessages);
        setConversationDone(true);
      }
      setIsTyping(false);
    }, 1000 + Math.random() * 600);
  };

  const handleProceedWithSubmission = (msgOverride?: Message[]) => {
    setRecommendationsDismissed(true);
    setCanvasView("evaluation");


    const proceedMsg: Message = {
      role: "assistant",
      content: "Generating your **Idea Evaluation Report** — this will include scores, risk analysis, and a recommendation for the review board...",
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
        body = { refinement, currentHtml };
      } else {
        const answers = extractAnswers();
        body = {
          scenario: selectedScenario || "Generic Idea",
          idea: answers["Idea Description"] || messages.find((m) => m.role === "user")?.content || "",
          answers,
          recommendations: recommendations.map((r) => ({ name: r.name, category: r.category })),
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
        toast.error("Failed to generate evaluation report");
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
        setEvaluationHtml(html);
        setEvaluationReady(true);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant" as const,
            content: "Your **Evaluation Report** is ready! Review it on the right panel. You can request changes or submit for review.",
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
  }, [messages, selectedScenario, recommendations]);

  const handleRefinement = (text: string) => {
    if (!text.trim() || isGeneratingEvaluation) return;
    const userMsg: Message = { role: "user", content: text };
    const assistantMsg: Message = { role: "assistant", content: "Got it! Updating the evaluation report..." };

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
                  Proceed with New Submission
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
                      Evaluation Report
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
                      setIdeaCategory("Support");
                      setIdeaArea("Design Thinking Workshop");
                      handleSend("Design Thinking Workshop");
                    }}
                    className="flex items-center gap-3 p-4 rounded-lg border border-sidebar-border bg-sidebar-accent/50 hover:border-primary/40 hover:bg-sidebar-accent transition-all text-left group"
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
                      setIdeaCategory("Support");
                      setIdeaArea("Pursuit Enablement Support");
                      handleSend("Pursuit Enablement Support");
                    }}
                    className="flex items-center gap-3 p-4 rounded-lg border border-sidebar-border bg-sidebar-accent/50 hover:border-primary/40 hover:bg-sidebar-accent transition-all text-left group"
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
                      setIdeaCategory("Support");
                      setIdeaArea("Training Conference Support");
                      handleSend("Training Conference Support");
                    }}
                    className="flex items-center gap-3 p-4 rounded-lg border border-sidebar-border bg-sidebar-accent/50 hover:border-primary/40 hover:bg-sidebar-accent transition-all text-left group"
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
                      setIdeaCategory("Support");
                      setIdeaArea("Protiviti Atlas API Support");
                    }}
                    className="flex items-center gap-3 p-4 rounded-lg border border-sidebar-border bg-sidebar-accent/50 hover:border-primary/40 hover:bg-sidebar-accent transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <BarChart3 className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-sidebar-foreground block">Protiviti Atlas API Support</span>
                      <span className="text-[11px] text-sidebar-foreground/50 leading-tight">New Protiviti Atlas API provisioning support</span>
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
                    onClick={() => setIdeaCategory("Client Delivery")}
                    className="flex items-center gap-3 p-4 rounded-lg border border-sidebar-border bg-sidebar-accent/50 hover:border-primary/40 hover:bg-sidebar-accent transition-all text-left group"
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
                    onClick={() => setIdeaCategory("Internal Operations")}
                    className="flex items-center gap-3 p-4 rounded-lg border border-sidebar-border bg-sidebar-accent/50 hover:border-primary/40 hover:bg-sidebar-accent transition-all text-left group"
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
                          if (label === "Protiviti Atlas") {
                            // Skip sub-area picker — go straight to Use Case Development
                            setIdeaArea(label);
                            handleSend("Use Case Development");
                          } else if (hasSubArea) {
                            setIdeaArea(label);
                          } else {
                            // Terminal selection — start conversation
                            setIdeaArea(label);
                            handleSend(label);
                          }
                        }}
                        className="flex items-center gap-3 p-3 rounded-lg border border-sidebar-border bg-sidebar-accent/50 hover:border-primary/40 hover:bg-sidebar-accent transition-all text-left group"
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
                  onClick={() => setIdeaCategory(null)}
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
                         if (subAreas[label]) {
                           setIdeaArea(label);
                         } else {
                           handleSend(label);
                         }
                       }}
                      className="flex items-center gap-3 p-3 rounded-lg border border-sidebar-border bg-sidebar-accent/50 hover:border-primary/40 hover:bg-sidebar-accent transition-all text-left group"
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
                  onClick={() => setIdeaArea(null)}
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
                  <h3 className="font-semibold text-sidebar-foreground text-base mb-1">Submitted for Review!</h3>
                  <p className="text-xs text-sidebar-foreground/60 mb-3">
                    Your idea has been submitted with an evaluation report. The review board will assess it.
                  </p>
                  {selectedScenario && directTriageScenarios.includes(selectedScenario) && (
                    <div className="rounded-lg border border-accent/30 bg-accent/10 p-2 mb-3">
                      <p className="text-[11px] text-accent font-medium">
                        ⚡ This submission has been auto-routed to IT & AI Studio for direct support.
                      </p>
                    </div>
                  )}
                  <div className="rounded-lg border border-sidebar-border bg-sidebar p-3 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sidebar-foreground text-xs">Teams Channel</span>
                    </div>
                    <p className="text-[11px] text-sidebar-foreground/60">
                      <span className="font-mono bg-sidebar-accent px-1.5 py-0.5 rounded">#{submittedIdea.teamsChannel}</span>
                      <span className="ml-1.5">— {submittedIdea.assignedTo.name}</span>
                    </p>
                  </div>
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
                    ? "Generating evaluation..."
                    : isViewing
                    ? "Describe changes to the evaluation..."
                    : conversationDone && evaluationReady
                    ? "Request changes to the evaluation..."
                    : conversationDone && !evaluationReady
                    ? "Generating evaluation report..."
                    : hasStarted
                    ? "Type your answer..."
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
                      <h3 className="font-semibold text-sm text-foreground">Evaluation Report</h3>
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
                        These solutions may already address your needs. Explore them or proceed with your new submission.
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
                        <p className="text-xs text-muted-foreground/60 mt-1">Your idea will be evaluated as a new submission.</p>
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
                            <p className="text-sm font-semibold text-foreground">Generating evaluation report...</p>
                            <p className="text-xs text-muted-foreground mt-1">Scoring and analyzing your submission</p>
                          </div>
                        </div>
                      </div>
                    ) : (evaluationHtml || (isViewing && viewingIdea?.businessPlanHtml)) ? (
                      <iframe
                        srcDoc={evaluationHtml || viewingIdea?.businessPlanHtml}
                        title="Evaluation Report"
                        className="w-full h-full border-0"
                        sandbox="allow-scripts allow-forms allow-modals allow-popups"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">Evaluation report will appear here after you proceed.</p>
                      </div>
                    )}
                  </>
                )}
              </div>


              {/* Assigned member */}
              {((submittedIdea && submitted) || (isViewing && viewingIdea)) && (
                <div className="px-4 py-3 border-t border-border shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                      {(submittedIdea || viewingIdea)?.assignedTo.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{(submittedIdea || viewingIdea)?.assignedTo.name}</p>
                      <p className="text-xs text-muted-foreground">{(submittedIdea || viewingIdea)?.assignedTo.role}</p>
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
                    Cancel Submission
                  </button>
                </div>
              )}
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <Layout className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground/60 mb-1">Canvas</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Recommendations and your evaluation report will appear here.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </ResizablePanel>

      {/* Cancel Confirmation Modal */}
      <AlertDialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Submission?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this submission? All progress will be lost and you'll return to the start.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelSubmission} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, Cancel Submission
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ResizablePanelGroup>
  );
};

export default ChatInterface;
