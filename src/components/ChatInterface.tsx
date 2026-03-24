import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, CheckCircle2, FileText, MessageSquare, Lightbulb, Zap, TrendingUp, Shield, BarChart3, Workflow, Pencil, ThumbsUp, Loader2, Eye, RefreshCw, ExternalLink, Layout, Mic, MicOff, Bot, Wrench, Cpu, Rocket, Package, ArrowRight, X, Download } from "lucide-react";
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

// ── Intake Scenarios ──
const intakeScenarios = [
  { label: "Agent Development", icon: Bot, description: "Internal ops, client delivery, or Copilot agents" },
  { label: "Enabler Development", icon: Package, description: "Build tools, capabilities, or platforms" },
  { label: "Automation Support", icon: Workflow, description: "Workflow or process automation" },
  { label: "Generic Idea", icon: Lightbulb, description: "Other innovation ideas" },
];

// ── Scenario-Specific Follow-Up Questions ──
const scenarioQuestions: Record<string, { greeting: string; questions: string[] }> = {
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
  "Agent Development": {
    greeting: "Agent development — let's scope out what you're building!",
    questions: [
      "**What is the agent's purpose?** Describe what it should do in 1-2 sentences.",
      "**Who will use this agent?** Is this for internal operations, to accelerate client delivery, or both?",
      "**Will this agent use Copilot?** If yes, describe the Copilot integration points. If no, what will drive its intelligence?",
      "**What systems or data does the agent need to interact with?** (e.g., CRM, ticketing systems, knowledge bases, APIs)",
      "Last one: **What's the expected impact?** Time saved, tickets deflected, revenue influenced — quantify if possible.",
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
};

// Triage mapping — which scenarios go directly to IT/AI Studio
const directTriageScenarios = ["AI Studio Support"];

interface ChatInterfaceProps {
  viewingIdea?: RecentIdea | null;
}

const ChatInterface = ({ viewingIdea }: ChatInterfaceProps) => {
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
    if (!isViewing && draftIdeaId) {
      updateIdea(draftIdeaId, { messages });
    }
  }, [isViewing, draftIdeaId, messages]);

  useEffect(() => {
    if (isViewing && viewingIdea?.id) {
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
    evaluationTargetIdRef.current = null;
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

    const userMsg: Message = { role: "user", content: value };
    const isFirstMessage = messages.length === 0;

    let scenario = selectedScenario;
    if (isFirstMessage) {
      const matchedScenario = scenarioQuestions[value] ? value : null;
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
        // Scenario was clicked — show greeting + first question, wait for idea
        const initialMessages = [userMsg, greeting, firstQuestion];
        setMessages(initialMessages);
        const draft = createDraftIdea(value, initialMessages);
        setDraftIdeaId(draft.id);
        setQuestionIndex(1);
      } else {
        // Free-text idea — show greeting + first question
        const initialMessages = [userMsg, greeting, firstQuestion];
        setMessages(initialMessages);
        const draft = createDraftIdea(value, initialMessages);
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

    setTimeout(() => {
      if (questionIndex < followUps.questions.length) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant" as const, content: followUps.questions[questionIndex] },
        ]);
        setQuestionIndex((i) => i + 1);
      } else {
        // All questions answered — show recommendations
        const answers = extractAnswers();
        const ideaText = Object.values(answers).join(" ");
        const recs = getRecommendations(ideaText, scenario || "Generic Idea");
        setRecommendations(recs);
        setShowRecommendations(true);
        setCanvasView("recommendations");

        if (recs.length > 0) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant" as const,
              content: `I've found **${recs.length} existing solution${recs.length > 1 ? "s" : ""}** that might match your needs. Take a look at the recommendations panel on the right.\n\nYou can **open a recommended solution** to explore it, or **proceed with your submission** to generate a full evaluation report for the review board.`,
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant" as const,
              content: "I didn't find any closely matching existing solutions. Let me generate a full **Evaluation Report** for the review board to assess your idea.",
            },
          ]);
          // Auto-proceed to evaluation
          handleProceedWithSubmission(updatedMessages);
        }
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
          <div className="flex items-center gap-3 px-4 py-3 border-b border-sidebar-border shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="min-w-0">
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

            {/* Welcome Screen */}
            {!isViewing && !hasStarted && !isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center py-8"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-sidebar-foreground mb-1">How can we help?</h2>
                <p className="text-sidebar-foreground/60 mb-6 text-center text-xs max-w-xs">
                  Select your scenario or describe your idea directly.
                </p>
                <div className="grid grid-cols-1 gap-2 w-full">
                  {intakeScenarios.map(({ label, icon: Icon, description }) => (
                    <button
                      key={label}
                      onClick={() => handleSend(label)}
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
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default ChatInterface;
