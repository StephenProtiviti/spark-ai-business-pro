export interface Accelerator {
  id: string;
  name: string;
  description: string;
  category: "agent" | "enabler" | "automation" | "ai-studio" | "platform";
  tags: string[];
  status: "active" | "beta" | "pilot";
  team: string;
  useCases: string[];
}

export const mockAccelerators: Accelerator[] = [
  {
    id: "acc-1",
    name: "ClientInsight Agent",
    description: "An AI agent that analyzes client interactions across email, calls, and CRM to surface actionable insights and next-best-actions for account managers.",
    category: "agent",
    tags: ["client delivery", "AI", "CRM", "copilot"],
    status: "active",
    team: "Client Solutions",
    useCases: ["Client engagement scoring", "Meeting prep automation", "Opportunity identification"],
  },
  {
    id: "acc-2",
    name: "DocuFlow Automator",
    description: "Workflow automation solution that extracts, validates, and routes documents using OCR and ML, reducing manual processing by 80%.",
    category: "automation",
    tags: ["document processing", "OCR", "workflow", "process automation"],
    status: "active",
    team: "Operations Excellence",
    useCases: ["Invoice processing", "Contract review", "Compliance document routing"],
  },
  {
    id: "acc-3",
    name: "Atlas Integration Toolkit",
    description: "Pre-built connectors and templates for the Atlas platform, enabling rapid enabler development with standardized patterns and governance.",
    category: "enabler",
    tags: ["Atlas", "platform", "integration", "enabler development"],
    status: "active",
    team: "Platform Engineering",
    useCases: ["API integration", "Data pipeline setup", "Atlas key provisioning"],
  },
  {
    id: "acc-4",
    name: "ConversationCraft",
    description: "A copilot-enabled agent builder for creating conversational AI experiences — supports both internal ops chatbots and client-facing assistants.",
    category: "agent",
    tags: ["copilot", "chatbot", "conversational AI", "internal ops"],
    status: "active",
    team: "AI Studio",
    useCases: ["IT help desk automation", "Client FAQ bot", "HR policy assistant"],
  },
  {
    id: "acc-5",
    name: "ProcessMiner",
    description: "Process mining and automation discovery tool that identifies bottlenecks, manual steps, and automation opportunities across business workflows.",
    category: "automation",
    tags: ["process mining", "workflow", "automation discovery", "efficiency"],
    status: "beta",
    team: "Digital Transformation",
    useCases: ["Process optimization", "Automation candidate identification", "Efficiency benchmarking"],
  },
  {
    id: "acc-6",
    name: "AI Showcase Gallery",
    description: "A curated gallery platform for showcasing AI proof-of-concepts with interactive demos, client visit scheduling, and feedback collection.",
    category: "ai-studio",
    tags: ["AI", "POC", "showcase", "client visits", "demo"],
    status: "active",
    team: "AI Studio",
    useCases: ["POC demonstrations", "Client visit coordination", "Innovation portfolio display"],
  },
  {
    id: "acc-7",
    name: "SmartDeploy Pipeline",
    description: "CI/CD pipeline templates and deployment orchestration for publishing agents and enablers to production with built-in testing and rollback.",
    category: "platform",
    tags: ["deployment", "CI/CD", "publishing", "agent deployment"],
    status: "active",
    team: "DevOps",
    useCases: ["Agent publishing", "Enabler deployment", "Automated testing"],
  },
  {
    id: "acc-8",
    name: "DataLens Analytics",
    description: "Self-service analytics enabler built on Atlas that provides drag-and-drop dashboards, automated reporting, and data storytelling capabilities.",
    category: "enabler",
    tags: ["analytics", "Atlas", "dashboards", "data", "reporting"],
    status: "active",
    team: "Data & Analytics",
    useCases: ["Executive dashboards", "Operational reporting", "Data exploration"],
  },
  {
    id: "acc-9",
    name: "TaskPilot Agent",
    description: "An internal operations agent that automates routine tasks — ticket triage, approval routing, status updates — freeing teams to focus on high-value work.",
    category: "agent",
    tags: ["internal ops", "task automation", "ticket triage", "approvals"],
    status: "active",
    team: "Enterprise Services",
    useCases: ["IT ticket triage", "Approval workflows", "Status report generation"],
  },
  {
    id: "acc-10",
    name: "ComplianceGuard",
    description: "Automated compliance monitoring enabler that scans policies, flags risks, and generates audit-ready reports across regulatory frameworks.",
    category: "enabler",
    tags: ["compliance", "risk", "audit", "regulatory", "governance"],
    status: "pilot",
    team: "Risk & Compliance",
    useCases: ["Policy compliance checks", "Audit preparation", "Regulatory reporting"],
  },
  {
    id: "acc-11",
    name: "MarketPulse",
    description: "Marketing analytics and campaign automation platform for promoting enablers internally and externally with audience targeting and engagement tracking.",
    category: "platform",
    tags: ["marketing", "promotion", "enabler listing", "campaign", "internal marketing"],
    status: "beta",
    team: "Marketing & Communications",
    useCases: ["Enabler promotion", "Internal awareness campaigns", "Usage tracking"],
  },
  {
    id: "acc-12",
    name: "RapidPOC Builder",
    description: "AI Studio's rapid prototyping framework for building AI proof-of-concepts in days — includes templates, sample data, and presentation-ready outputs.",
    category: "ai-studio",
    tags: ["POC", "prototyping", "AI", "rapid development", "AI Studio"],
    status: "active",
    team: "AI Studio",
    useCases: ["POC development", "Client demo preparation", "Innovation sprints"],
  },
];

/** Simple keyword-matching recommendation engine */
export function getRecommendations(ideaText: string, scenario: string, maxResults = 3): Accelerator[] {
  const text = `${ideaText} ${scenario}`.toLowerCase();
  const words = text.split(/\s+/).filter((w) => w.length > 2);

  const scored = mockAccelerators.map((acc) => {
    const searchable = `${acc.name} ${acc.description} ${acc.tags.join(" ")} ${acc.useCases.join(" ")} ${acc.category}`.toLowerCase();
    let score = 0;
    for (const word of words) {
      if (searchable.includes(word)) score++;
    }
    // Boost by category match
    const categoryMap: Record<string, string[]> = {
      "AI Studio Support": ["ai-studio", "agent"],
      "Agent Development": ["agent"],
      "Enabler Development": ["enabler", "platform"],
      "Automation Support": ["automation"],
      "Generic Idea": ["enabler", "agent", "automation"],
    };
    const boostedCategories = categoryMap[scenario] || [];
    if (boostedCategories.includes(acc.category)) score += 3;
    return { acc, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((s) => s.acc);
}
