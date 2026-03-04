export type IdeaCategory = "Process" | "Product" | "Savings";
export type IdeaStatus = "submitted" | "reviewing" | "approved" | "rejected";

export interface Idea {
  id: string;
  title: string;
  description: string;
  category: IdeaCategory;
  author: string;
  avatar: string;
  date: string;
  nexusScore: number;
  valueScore: number;
  feasibilityScore: number;
  impactScore: number;
  effortScore: number;
  status: IdeaStatus;
  optimistView: string;
  skepticView: string;
  mermaidDiagram: string;
  pressRelease: string;
  tags: string[];
}

export const mockIdeas: Idea[] = [
  {
    id: "1",
    title: "AI-Powered Customer Support Triage",
    description: "Use NLP to auto-classify incoming support tickets by urgency, sentiment, and department, reducing first-response time by 60%.",
    category: "Process",
    author: "Sarah Chen",
    avatar: "SC",
    date: "2027-01-15",
    nexusScore: 87,
    valueScore: 92,
    feasibilityScore: 82,
    impactScore: 90,
    effortScore: 35,
    status: "approved",
    optimistView: "This could save $2.4M annually in support costs while improving CSAT by 15 points. Strategic alignment with our 'AI-First Operations' initiative is perfect. First-mover advantage in our vertical.",
    skepticView: "Integration with legacy Zendesk instance poses risk. Model training requires 6 months of labeled data we may not have. Privacy concerns with PII in training data need legal review.",
    mermaidDiagram: `graph TD
    A[Incoming Ticket] --> B{NLP Classifier}
    B -->|Urgent| C[Priority Queue]
    B -->|Standard| D[Standard Queue]
    B -->|Low| E[Self-Service Bot]
    C --> F[Senior Agent]
    D --> G[Agent Pool]
    E --> H[Knowledge Base]
    F --> I[Resolution]
    G --> I
    H --> I`,
    pressRelease: "**FOR IMMEDIATE RELEASE — January 2027**\n\nNexusCorp today announced that its AI-Powered Support Triage system has reduced average first-response times from 4.2 hours to 18 minutes, achieving a 93% accuracy rate in ticket classification. The system has processed over 2 million tickets since launch, saving an estimated $2.1M in operational costs.",
    tags: ["AI/ML", "Customer Support", "Automation"],
  },
  {
    id: "2",
    title: "Carbon Footprint Dashboard",
    description: "Real-time carbon emissions tracking across all company operations with automated ESG reporting and reduction recommendations.",
    category: "Product",
    author: "James Park",
    avatar: "JP",
    date: "2027-01-12",
    nexusScore: 74,
    valueScore: 78,
    feasibilityScore: 70,
    impactScore: 75,
    effortScore: 55,
    status: "reviewing",
    optimistView: "ESG compliance is becoming mandatory. Early adoption positions us as industry leaders. Potential to spin off as a SaaS product generating $5M ARR by 2028.",
    skepticView: "Data collection from 47 global offices is complex. IoT sensor deployment alone is a $800K investment. Accuracy of Scope 3 emissions estimates is questionable.",
    mermaidDiagram: `graph LR
    A[IoT Sensors] --> B[Data Lake]
    C[ERP Data] --> B
    D[Travel Systems] --> B
    B --> E[Carbon Calculator]
    E --> F[Dashboard UI]
    E --> G[ESG Reports]
    F --> H[Exec View]
    F --> I[Department View]
    G --> J[Regulatory Filing]`,
    pressRelease: "**FOR IMMEDIATE RELEASE — March 2027**\n\nNexusCorp's Carbon Footprint Dashboard has helped the company achieve a 32% reduction in Scope 1 and 2 emissions within its first year. The platform now tracks over 150 emission sources across 47 offices worldwide.",
    tags: ["Sustainability", "ESG", "IoT"],
  },
  {
    id: "3",
    title: "Automated Invoice Processing Pipeline",
    description: "OCR + ML pipeline to extract, validate, and route invoices automatically, eliminating 80% of manual data entry in accounts payable.",
    category: "Savings",
    author: "Maria Lopez",
    avatar: "ML",
    date: "2027-01-10",
    nexusScore: 91,
    valueScore: 88,
    feasibilityScore: 94,
    impactScore: 85,
    effortScore: 20,
    status: "approved",
    optimistView: "ROI within 4 months. Direct cost saving of $1.8M/year. Reduces processing errors by 95%. Uses proven OCR technology with well-documented APIs.",
    skepticView: "Edge cases in multi-currency invoices may require manual review. Change management with AP team needs careful handling. Vendor onboarding for e-invoicing adds complexity.",
    mermaidDiagram: `graph TD
    A[Invoice Received] --> B[OCR Engine]
    B --> C{Confidence > 95%?}
    C -->|Yes| D[Auto-Validate]
    C -->|No| E[Human Review]
    D --> F[ERP Entry]
    E --> F
    F --> G[Payment Queue]
    G --> H[Approval Workflow]
    H --> I[Payment Executed]`,
    pressRelease: "**FOR IMMEDIATE RELEASE — June 2027**\n\nNexusCorp's Automated Invoice Pipeline has processed over 500,000 invoices with 98.7% accuracy, reducing the accounts payable team's manual workload by 82% and saving $1.6M in the first year alone.",
    tags: ["Finance", "Automation", "OCR"],
  },
  {
    id: "4",
    title: "Predictive Maintenance for Data Centers",
    description: "ML models analyzing sensor data to predict hardware failures 72 hours before they occur, reducing unplanned downtime by 90%.",
    category: "Process",
    author: "Alex Rivera",
    avatar: "AR",
    date: "2027-01-08",
    nexusScore: 79,
    valueScore: 85,
    feasibilityScore: 73,
    impactScore: 80,
    effortScore: 50,
    status: "reviewing",
    optimistView: "Each hour of downtime costs $300K. Even a 50% reduction in unplanned outages would save $5M annually. Competitive moat through proprietary failure prediction models.",
    skepticView: "Requires extensive sensor retrofitting on legacy hardware. Model accuracy depends on failure event data which is inherently sparse. False positive rate could cause unnecessary maintenance.",
    mermaidDiagram: `graph TD
    A[Sensor Array] --> B[Time Series DB]
    B --> C[Feature Engineering]
    C --> D[ML Model]
    D --> E{Failure Risk > 80%?}
    E -->|Yes| F[Alert + Work Order]
    E -->|No| G[Continue Monitoring]
    F --> H[Maintenance Team]
    H --> I[Preventive Action]`,
    pressRelease: "**FOR IMMEDIATE RELEASE — September 2027**\n\nNexusCorp's Predictive Maintenance system has successfully predicted 94% of hardware failures at least 48 hours in advance, reducing unplanned data center downtime by 87% and saving an estimated $4.2M.",
    tags: ["Infrastructure", "ML", "IoT"],
  },
  {
    id: "5",
    title: "Employee Skill Matching Platform",
    description: "Internal talent marketplace using AI to match employees with projects, mentors, and learning paths based on skills gaps and career goals.",
    category: "Product",
    author: "Priya Sharma",
    avatar: "PS",
    date: "2027-01-05",
    nexusScore: 68,
    valueScore: 72,
    feasibilityScore: 64,
    impactScore: 65,
    effortScore: 60,
    status: "submitted",
    optimistView: "Could reduce external hiring costs by 30% and improve retention by 20%. Builds a proprietary skills ontology that becomes more valuable over time.",
    skepticView: "Requires buy-in from all department heads. Skills data is often outdated or self-reported. Privacy concerns around tracking employee capabilities. Long adoption curve.",
    mermaidDiagram: `graph TD
    A[Employee Profile] --> B[Skills Parser]
    B --> C[Skills Graph]
    D[Project Needs] --> E[Matching Engine]
    C --> E
    E --> F[Recommendations]
    F --> G[Project Match]
    F --> H[Mentor Match]
    F --> I[Learning Path]`,
    pressRelease: "**FOR IMMEDIATE RELEASE — December 2027**\n\nNexusCorp's Skill Matching Platform has facilitated over 1,200 internal project placements, reducing time-to-staff by 65% and external recruiting spend by $3.2M.",
    tags: ["HR Tech", "AI", "Talent"],
  },
];

export const chatMessages = [
  { role: "assistant" as const, content: "Welcome to **Spark** 🚀\n\nI'm your Innovation Intake Agent. I'll help you shape your idea into a structured submission.\n\nTo get started, tell me: **What's the big idea?** Describe it in a sentence or two." },
];
