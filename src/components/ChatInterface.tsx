import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Plus, Sparkles, CheckCircle2, FileText, Users, MessageSquare, Lightbulb, Zap, TrendingUp, Shield, BarChart3, Workflow, Code2, Pencil, ThumbsUp, Loader2, Eye, RefreshCw, ExternalLink, Layout, Mic, MicOff } from "lucide-react";
// Accordion no longer needed in canvas — deliverables toggled via chat links
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import ReactMarkdown from "react-markdown";
import { useIdeas, RecentIdea } from "@/contexts/IdeasContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const promptSuggestions = [
  { label: "Process Optimization", icon: Workflow, description: "Streamline how your team works" },
  { label: "New Product Feature", icon: Lightbulb, description: "Propose a new capability" },
  { label: "Cost Savings", icon: TrendingUp, description: "Reduce waste and expenses" },
  { label: "Customer Experience", icon: Zap, description: "Delight users and clients" },
  { label: "Data & Analytics", icon: BarChart3, description: "Unlock insights from data" },
  { label: "Security Improvement", icon: Shield, description: "Harden systems and processes" },
];

const categoryFollowUps: Record<string, { greeting: string; questions: string[] }> = {
  "Process Optimization": {
    greeting: "Process optimization — great choice! Let's map out how to make things run smoother.",
    questions: [
      "**Which process are you looking to optimize?** Describe the current workflow or operation that feels slow, manual, or error-prone.",
      "**Who is involved in this process today?** Which teams or roles touch it, and where do the biggest bottlenecks or handoffs occur?",
      "**What does an optimized version look like?** Think about the key metric — time saved, errors reduced, throughput increased — and what 'good' looks like.",
      "Last one: **What are the business benefits?** How will this optimization create value — cost savings, revenue growth, competitive advantage, or improved employee productivity?",
    ],
  },
  "New Product Feature": {
    greeting: "A new product feature — exciting! Let's define what it should do and why it matters.",
    questions: [
      "**What problem does this feature solve for users?** Describe the pain point or unmet need it addresses.",
      "**Who is the target user?** Describe the persona — their role, how they'd discover this feature, and what they'd expect from it.",
      "**How will we know this feature is successful?** Think about adoption rate, engagement metric, or user feedback signal.",
      "Last one: **What are the business benefits?** How will this feature drive business value — increased revenue, user retention, market differentiation, or operational efficiency?",
    ],
  },
  "Cost Savings": {
    greeting: "Cost savings — always impactful! Let's figure out where the money is going and how to keep more of it.",
    questions: [
      "**Where is the cost coming from?** Describe the expense category — tooling, headcount, infrastructure, vendor spend, etc.",
      "**What's driving the cost today?** Is it inefficiency, over-provisioning, manual work, or something else?",
      "**What savings target are you aiming for?** A percentage reduction, a dollar amount, or a process change that eliminates the cost entirely?",
      "Last one: **What are the broader business benefits?** Beyond cost reduction, how does this initiative create strategic value — improved margins, scalability, or competitive positioning?",
    ],
  },
  "Customer Experience": {
    greeting: "Customer experience — the heart of every great product! Let's explore how to delight your users.",
    questions: [
      "**Which part of the customer journey needs improvement?** Is it onboarding, support, purchasing, retention, or something else?",
      "**What are customers saying today?** Any specific complaints, NPS feedback, or churn reasons that point to the problem?",
      "**What would a great experience look like?** Describe the ideal interaction — how should customers *feel* after engaging with this?",
      "Last one: **What are the business benefits?** How will improving the customer experience translate to business value — higher retention, increased NPS, revenue growth, or brand loyalty?",
    ],
  },
  "Data & Analytics": {
    greeting: "Data & analytics — let's unlock some insights! Tell me more about what you're trying to understand.",
    questions: [
      "**What question are you trying to answer with data?** Describe the business decision or insight you're after.",
      "**What data sources are available today?** Think about databases, APIs, spreadsheets, or third-party tools that hold relevant data.",
      "**Who will consume these insights?** Executives, analysts, ops teams — and how do they prefer to see data (dashboards, reports, alerts)?",
      "Last one: **What are the business benefits?** How will better data and analytics drive business value — smarter decisions, faster response times, new revenue opportunities, or risk reduction?",
    ],
  },
  "Security Improvement": {
    greeting: "Security improvement — critical work! Let's identify the vulnerabilities and plan the hardening.",
    questions: [
      "**What's the security concern?** Describe the threat, vulnerability, or compliance gap you're looking to address.",
      "**What systems or data are at risk?** Which applications, infrastructure, or data sets need protection?",
      "**What does 'secure enough' look like?** A compliance standard (SOC2, GDPR), a risk reduction target, or a specific control to implement?",
      "Last one: **What are the business benefits?** How does improving security create business value — regulatory compliance, customer trust, risk mitigation, or competitive advantage?",
    ],
  },
};

const defaultFollowUps = {
  greeting: "Thanks for sharing! Let's dig in and shape this idea.",
  questions: [
    "**What is the primary objective?** In one sentence, what should this idea accomplish when it's fully realized?",
    "**Who benefits from this and how?** Describe the people affected and the outcome they'd experience — what changes for them day-to-day?",
    "**What does success look like?** Think about the measurable outcome — a metric, a milestone, or a before/after that proves this worked.",
    "Last one: **What are the business benefits?** How will this idea create value for the organization — revenue impact, cost savings, competitive advantage, or strategic positioning?",
  ],
};

interface ChatInterfaceProps {
  viewingIdea?: RecentIdea | null;
}

const ChatInterface = ({ viewingIdea }: ChatInterfaceProps) => {
  const { submitIdea, createDraftIdea, updateIdea, recentIdeas } = useIdeas();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draftIdeaId, setDraftIdeaId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [conversationDone, setConversationDone] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedIdea, setSubmittedIdea] = useState<RecentIdea | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState("");
  const [promptApproved, setPromptApproved] = useState(false);
  const [wireframeHtml, setWireframeHtml] = useState("");
  const [businessPlanHtml, setBusinessPlanHtml] = useState("");
  const [isGeneratingWireframe, setIsGeneratingWireframe] = useState(false);
  const [isGeneratingBusinessPlan, setIsGeneratingBusinessPlan] = useState(false);
  const [wireframeReady, setWireframeReady] = useState(false);
  const [businessPlanReady, setBusinessPlanReady] = useState(false);
  const [viewingMessages, setViewingMessages] = useState<Message[]>([]);
  const [wireframeElapsed, setWireframeElapsed] = useState(0);
  const [isRefinement, setIsRefinement] = useState(false);
  const [canvasView, setCanvasView] = useState<"wireframe" | "business-plan">("wireframe");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wireframeHtmlRef = useRef(wireframeHtml);
  const generationRunRef = useRef<number | null>(null);
  const isGeneratingRef = useRef(false);
  const wireframeTargetIdRef = useRef<string | null>(null);
  wireframeHtmlRef.current = wireframeHtml;
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

  // Sync viewing messages when viewingIdea changes
  useEffect(() => {
    generationRunRef.current = null;
    isGeneratingRef.current = false;
    wireframeTargetIdRef.current = null;
    setIsGeneratingWireframe(false);
    setWireframeElapsed(0);

    if (viewingIdea) {
      setViewingMessages([...viewingIdea.messages]);
      const existingHtml = viewingIdea.wireframeHtml || "";
      setWireframeHtml(existingHtml);
      setWireframeReady(Boolean(existingHtml));
      setPromptApproved(Boolean(existingHtml));
      const existingBp = viewingIdea.businessPlanHtml || "";
      setBusinessPlanHtml(existingBp);
      setBusinessPlanReady(Boolean(existingBp));
    } else {
      setViewingMessages([]);
      setWireframeHtml("");
      setWireframeReady(false);
      setPromptApproved(false);
      setBusinessPlanHtml("");
      setBusinessPlanReady(false);
    }
  }, [viewingIdea?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [displayMessages, conversationDone, submitted, generatedPrompt, promptApproved, wireframeReady]);

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

  const resetChat = () => {
    setMessages([]);
    setInput("");
    setSelectedCategory(null);
    setQuestionIndex(0);
    setConversationDone(false);
    setSubmitted(false);
    setSubmittedIdea(null);
    setGeneratedPrompt("");
    setEditingPrompt(false);
    setEditedPrompt("");
    setPromptApproved(false);
    setWireframeHtml("");
    setIsGeneratingWireframe(false);
    setWireframeReady(false);
    setBusinessPlanHtml("");
    setIsGeneratingBusinessPlan(false);
    setBusinessPlanReady(false);
    setDraftIdeaId(null);
    wireframeTargetIdRef.current = null;
    generationRunRef.current = null;
    isGeneratingRef.current = false;
  };

  const extractAnswers = () => {
    const userMsgs = messages.filter((m) => m.role === "user");
    return {
      idea: userMsgs[0]?.content || "",
      objective: userMsgs[1]?.content || "",
      beneficiaries: userMsgs[2]?.content || "",
      success: userMsgs[3]?.content || "",
      businessBenefits: userMsgs[4]?.content || "",
    };
  };

  const generateMvpPrompt = () => {
    const a = extractAnswers();
    return `## MVP Build Prompt\n\n**Project:** ${a.idea}\n\n**Role:** You are a Senior Full-Stack Engineer. Build a working MVP for the following idea.\n\n**Primary Objective:** ${a.objective}\n\n**Target Users & Outcome:** ${a.beneficiaries}\n\n**Success Criteria:** ${a.success}\n\n**Business Benefits & Value Proposition:** ${a.businessBenefits}\n\n### Requirements\n1. Build a functional prototype that demonstrates the core value proposition described above.\n2. Focus on the primary user flow — from entry point to the key outcome.\n3. Use a modern stack (React, TypeScript, Tailwind CSS).\n4. Include realistic mock data where backend integration isn't available.\n5. Prioritize usability and clarity over feature completeness.\n\n### Deliverables\n- A working single-page or multi-page application\n- Clean, well-structured code ready for iteration\n- A brief README explaining how to run and extend the MVP`;
  };

  const handleSend = (text?: string) => {
    const value = text || input;
    if (!value.trim() || isTyping) return;

    const userMsg: Message = { role: "user", content: value };
    const isFirstMessage = messages.length === 0;

    let category = selectedCategory;
    if (isFirstMessage) {
      const matchedCategory = categoryFollowUps[value] ? value : null;
      category = matchedCategory;
      setSelectedCategory(matchedCategory);
    }

    const followUps = category && categoryFollowUps[category]
      ? categoryFollowUps[category]
      : defaultFollowUps;

    if (isFirstMessage) {
      const greeting: Message = {
        role: "assistant",
        content: followUps.greeting + ` Let me help you shape **\"${value}\"** into a structured submission.`,
      };
      const initialMessages = [userMsg, greeting];
      setMessages(initialMessages);
      const draft = createDraftIdea(value, initialMessages);
      setDraftIdeaId(draft.id);
    } else {
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
    }
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
        const prompt = generateMvpPrompt();
        setGeneratedPrompt(prompt);
        setEditedPrompt(prompt);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant" as const,
            content:
              "Excellent — I have everything I need! I've generated a **Technical MVP Prompt** based on your answers. When you approve, I'll generate both a **wireframe prototype** and a **single-page business plan** highlighting benefits, risks, and an implementation roadmap.\n\nPlease review it below — you can **edit** it or **approve** it as-is.",
          },
        ]);
        setConversationDone(true);
      }
      setIsTyping(false);
    }, 1200 + Math.random() * 800);
  };

  const streamWireframe = useCallback(async (prompt: string, refinement?: string, currentHtml?: string, retryCount = 0, runId?: number, targetId?: string) => {
    if (retryCount === 0 && isGeneratingRef.current) return;

    const activeRunId = runId ?? Date.now();
    if (retryCount === 0) {
      generationRunRef.current = activeRunId;
      isGeneratingRef.current = true;
      if (targetId) wireframeTargetIdRef.current = targetId;
      setIsGeneratingWireframe(true);
      setWireframeElapsed(0);
      setIsRefinement(!!refinement);
      if (!refinement) setWireframeHtml("");
      setWireframeReady(false);
    }

    const previousHtml = wireframeHtmlRef.current;

    try {
      const body: Record<string, string> = {};
      if (refinement && currentHtml) {
        body.refinement = refinement;
        body.currentHtml = currentHtml;
      } else {
        body.prompt = prompt;
      }

      let { data, error } = await supabase.functions.invoke("generate-wireframe", {
        body,
      });

      if (error) {
        try {
          const fallbackResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-wireframe`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify(body),
          });

          const fallbackJson = await fallbackResponse.json().catch(() => ({}));
          if (fallbackResponse.ok) {
            data = fallbackJson;
            error = null;
          } else {
            error = {
              ...error,
              context: { status: fallbackResponse.status },
              message: typeof fallbackJson?.error === "string" ? fallbackJson.error : "Failed to generate wireframe",
            } as typeof error;
          }
        } catch {
          // keep original invoke error path
        }
      }

      if (generationRunRef.current !== activeRunId) return;

      if (error) {
        const status = (error as { context?: { status?: number } })?.context?.status;
        const transient = status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;

        if (transient && retryCount < 1) {
          toast.message("Generation was interrupted. Retrying once...");
          await streamWireframe(prompt, refinement, currentHtml, retryCount + 1, activeRunId);
          return;
        }

        if (status === 429) {
          toast.error("Rate limit exceeded. Please wait a moment and try again.");
        } else if (status === 402) {
          toast.error("AI usage limit reached. Please add credits to continue.");
        } else {
          toast.error("Failed to generate wireframe");
        }

        if (refinement && previousHtml) {
          setWireframeHtml(previousHtml);
          setWireframeReady(true);
        }
        return;
      }

      let parsedData = data;
      if (typeof data === "string") {
        try { parsedData = JSON.parse(data); } catch { parsedData = data; }
      }
      const rawHtml = typeof parsedData?.html === "string" ? parsedData.html : (typeof parsedData === "string" ? parsedData : "");
      let finalHtml = rawHtml;
      const htmlMatch = finalHtml.match(/```html\s*([\s\S]*?)```/);
      if (htmlMatch) {
        finalHtml = htmlMatch[1].trim();
      } else if (finalHtml.includes("<!DOCTYPE") || finalHtml.includes("<html")) {
        const startIdx = finalHtml.indexOf("<!DOCTYPE");
        if (startIdx === -1) {
          const altStart = finalHtml.indexOf("<html");
          if (altStart > -1) finalHtml = finalHtml.slice(altStart);
        } else {
          finalHtml = finalHtml.slice(startIdx);
        }
      }

      if (generationRunRef.current !== activeRunId) return;

      if (!finalHtml.trim() && refinement && previousHtml) {
        setWireframeHtml(previousHtml);
        setWireframeReady(true);
        toast.error("Wireframe update returned empty. Previous version restored.");
      } else if (!finalHtml.trim()) {
        if (retryCount < 1) {
          toast.message("Received empty wireframe. Retrying once...");
          await streamWireframe(prompt, refinement, currentHtml, retryCount + 1, activeRunId);
          return;
        }
        toast.error("Wireframe generation returned empty content.");
      } else {
        setWireframeHtml(finalHtml);
        setWireframeReady(true);
      }
    } catch (e) {
      if (generationRunRef.current !== activeRunId) return;
      console.error("Wireframe generation failed:", e);
      if (retryCount < 1) {
        toast.message("Generation failed unexpectedly. Retrying once...");
        await streamWireframe(prompt, refinement, currentHtml, retryCount + 1, activeRunId);
        return;
      }
      toast.error("Failed to generate wireframe. Please try again.");
      if (refinement && previousHtml) {
        setWireframeHtml(previousHtml);
        setWireframeReady(true);
      }
    } finally {
      if (generationRunRef.current === activeRunId) {
        generationRunRef.current = null;
        isGeneratingRef.current = false;
        setIsGeneratingWireframe(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!isGeneratingWireframe) return;
    const interval = setInterval(() => setWireframeElapsed((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isGeneratingWireframe]);

  useEffect(() => {
    if (wireframeReady && wireframeHtml && wireframeTargetIdRef.current) {
      updateIdea(wireframeTargetIdRef.current, { wireframeHtml });
    }
  }, [wireframeReady, wireframeHtml]);

  useEffect(() => {
    if (businessPlanReady && businessPlanHtml && wireframeTargetIdRef.current) {
      updateIdea(wireframeTargetIdRef.current, { businessPlanHtml });
    }
  }, [businessPlanReady, businessPlanHtml]);

  const businessPlanHtmlRef = useRef(businessPlanHtml);
  businessPlanHtmlRef.current = businessPlanHtml;

  const generateBusinessPlan = useCallback(async (targetId?: string, refinement?: string, currentHtml?: string) => {
    setIsGeneratingBusinessPlan(true);
    setBusinessPlanReady(false);
    setCanvasView("business-plan");

    const previousHtml = businessPlanHtmlRef.current;

    try {
      let body: Record<string, string>;
      if (refinement && currentHtml) {
        body = { refinement, currentHtml };
      } else {
        const answers = extractAnswers();
        body = {
          idea: answers.idea,
          objective: answers.objective,
          beneficiaries: answers.beneficiaries,
          success: answers.success,
          businessBenefits: answers.businessBenefits,
        };
      }

      let data: any = null;
      let error: any = null;

      const result = await supabase.functions.invoke("generate-business-plan", { body });
      data = result.data;
      error = result.error;

      if (error) {
        try {
          const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-business-plan`, {
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
        } catch { /* keep original error */ }
      }

      if (error) {
        console.error("Business plan generation failed:", error);
        toast.error("Failed to generate business plan");
        if (refinement && previousHtml) {
          setBusinessPlanHtml(previousHtml);
          setBusinessPlanReady(true);
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
        setBusinessPlanHtml(html);
        setBusinessPlanReady(true);
      } else if (refinement && previousHtml) {
        setBusinessPlanHtml(previousHtml);
        setBusinessPlanReady(true);
        toast.error("Business plan update returned empty. Previous version restored.");
      } else {
        toast.error("Business plan generation returned empty content.");
      }
    } catch (e) {
      console.error("Business plan generation error:", e);
      toast.error("Failed to generate business plan. Please try again.");
      if (refinement && previousHtml) {
        setBusinessPlanHtml(previousHtml);
        setBusinessPlanReady(true);
      }
    } finally {
      setIsGeneratingBusinessPlan(false);
    }
  }, [messages]);

  const handleApprovePrompt = () => {
    setPromptApproved(true);
    setGeneratedPrompt(editedPrompt);
    setEditingPrompt(false);
    const targetId = isViewing && viewingIdea ? viewingIdea.id : draftIdeaId;
    wireframeTargetIdRef.current = targetId;
    streamWireframe(editedPrompt, undefined, undefined, 0, undefined, targetId || undefined);
    generateBusinessPlan(targetId || undefined);
  };

  const handleRefinement = (text: string) => {
    if (!text.trim() || isGeneratingWireframe || isGeneratingBusinessPlan) return;
    const userMsg: Message = { role: "user", content: text };

    const isBusinessPlanEdit = canvasView === "business-plan";
    const assistantMsg: Message = {
      role: "assistant",
      content: isBusinessPlanEdit
        ? "Got it! Updating the business plan with your changes..."
        : "Got it! Updating the wireframe with your changes...",
    };

    if (isViewing && viewingIdea) {
      setViewingMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      const targetId = viewingIdea.id;

      if (isBusinessPlanEdit) {
        const currentBpHtml = businessPlanHtmlRef.current || viewingIdea.businessPlanHtml || "";
        wireframeTargetIdRef.current = targetId;
        generateBusinessPlan(targetId, text, currentBpHtml);
      } else {
        const currentHtml = wireframeHtmlRef.current || viewingIdea.wireframeHtml || "";
        wireframeTargetIdRef.current = targetId;
        streamWireframe(generatedPrompt || "Refine this wireframe", text, currentHtml, 0, undefined, targetId);
      }
    } else {
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      const targetId = draftIdeaId || undefined;
      if (targetId) wireframeTargetIdRef.current = targetId;

      if (isBusinessPlanEdit) {
        const currentBpHtml = businessPlanHtmlRef.current;
        generateBusinessPlan(targetId, text, currentBpHtml);
      } else {
        const currentHtml = wireframeHtmlRef.current;
        streamWireframe(generatedPrompt, text, currentHtml, 0, undefined, targetId);
      }
    }
  };

  const handleSubmit = () => {
    if (draftIdeaId) {
      updateIdea(draftIdeaId, { messages, wireframeHtml: wireframeHtml || undefined, businessPlanHtml: businessPlanHtml || undefined });
      const existingIdea = recentIdeas.find((i) => i.id === draftIdeaId);
      if (existingIdea) {
        setSubmittedIdea(existingIdea);
      }
    } else {
      const userMessages = messages.filter((m) => m.role === "user");
      const title = userMessages[0]?.content || "Untitled Idea";
      const idea = submitIdea(title, messages, wireframeHtml || undefined);
      setSubmittedIdea(idea);
    }
    setSubmitted(true);
  };

  // Determine if canvas has content to show
  const hasCanvasContent = wireframeHtml || businessPlanHtml || isGeneratingWireframe || isGeneratingBusinessPlan || 
    (isViewing && viewingIdea && (viewingIdea.wireframeHtml || viewingIdea.businessPlanHtml));

  // Loading spinner component
  const WireframeLoader = ({ estimated = 35 }: { estimated?: number }) => (
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
        <p className="text-sm font-semibold text-foreground">
          {isRefinement ? "Updating wireframe..." : "Building wireframe..."}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {wireframeElapsed < 5 ? "Analyzing your requirements"
            : wireframeElapsed < 15 ? "Generating layout & components"
            : wireframeElapsed < 30 ? "Refining design details"
            : "Almost there..."}
        </p>
        {(() => {
          const remaining = Math.max(0, estimated - wireframeElapsed);
          const progress = Math.min(95, (wireframeElapsed / estimated) * 100);
          return (
            <div className="mt-3 w-48 mx-auto">
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs font-mono text-muted-foreground/60 mt-1.5">
                {remaining > 0 ? `~${remaining}s remaining` : "Finishing up..."}
              </p>
            </div>
          );
        })()}
      </div>
    </div>
  );

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
                  : "AI-guided idea interview"}
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

            {/* Deliverable links in chat */}
            {(wireframeReady || businessPlanReady || (isViewing && (viewingIdea?.wireframeHtml || viewingIdea?.businessPlanHtml))) && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                <div className="bg-sidebar-accent rounded-lg px-3 py-2.5 text-sm space-y-1.5">
                  <p className="text-xs font-medium text-sidebar-foreground/70 mb-1">View in canvas:</p>
                  <div className="flex flex-col gap-1">
                    {(wireframeReady || wireframeHtml || (isViewing && viewingIdea?.wireframeHtml)) && (
                      <button
                        onClick={() => setCanvasView("wireframe")}
                        className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${canvasView === "wireframe" ? "text-primary-foreground bg-primary/80 px-2 py-1 rounded" : "text-sidebar-primary-foreground hover:text-primary px-2 py-1"}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Wireframe Preview
                        {canvasView === "wireframe" && <span className="text-[10px] ml-1">(viewing)</span>}
                      </button>
                    )}
                    {(businessPlanReady || businessPlanHtml || (isViewing && viewingIdea?.businessPlanHtml)) && (
                      <button
                        onClick={() => setCanvasView("business-plan")}
                        className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${canvasView === "business-plan" ? "text-primary-foreground bg-primary/80 px-2 py-1 rounded" : "text-sidebar-primary-foreground hover:text-primary px-2 py-1"}`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Business Plan
                        {canvasView === "business-plan" && <span className="text-[10px] ml-1">(viewing)</span>}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Welcome Screen — shown in chat panel when empty */}
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
                <h2 className="text-lg font-bold text-sidebar-foreground mb-1">What's your next big idea?</h2>
                <p className="text-sidebar-foreground/60 mb-6 text-center text-xs max-w-xs">
                  Pick a category or type your idea directly.
                </p>
                <div className="grid grid-cols-2 gap-2 w-full">
                  {promptSuggestions.map(({ label, icon: Icon, description }) => (
                    <button
                      key={label}
                      onClick={() => handleSend(label)}
                      className="flex flex-col items-start gap-1.5 p-3 rounded-lg border border-sidebar-border bg-sidebar-accent/50 hover:border-primary/40 hover:bg-sidebar-accent transition-all text-left group"
                    >
                      <Icon className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-medium text-sidebar-foreground">{label}</span>
                      <span className="text-[10px] text-sidebar-foreground/50 leading-tight">{description}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Generated MVP Prompt Card — in chat */}
            {!isViewing && conversationDone && !submitted && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                <div className="rounded-lg border-2 border-primary/30 bg-sidebar-accent p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-sm text-sidebar-foreground">Technical MVP Prompt</h3>
                    </div>
                    {!promptApproved && (
                      <button
                        onClick={() => setEditingPrompt(!editingPrompt)}
                        className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                        {editingPrompt ? "Preview" : "Edit"}
                      </button>
                    )}
                  </div>

                  {editingPrompt && !promptApproved ? (
                    <textarea
                      value={editedPrompt}
                      onChange={(e) => setEditedPrompt(e.target.value)}
                      className="w-full h-60 p-3 rounded-lg border border-sidebar-border bg-sidebar text-xs font-mono text-sidebar-foreground resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  ) : (
                    <div className="max-h-60 overflow-y-auto rounded-lg bg-sidebar p-3">
                      <ReactMarkdown
                        components={{
                          h2: ({ children }) => <h2 className="text-sm font-bold text-sidebar-foreground mb-1">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-xs font-semibold text-sidebar-foreground mt-2 mb-1">{children}</h3>,
                          strong: ({ children }) => <strong className="font-semibold text-sidebar-foreground">{children}</strong>,
                          p: ({ children }) => <p className="text-xs text-sidebar-foreground/80 mb-1.5 last:mb-0">{children}</p>,
                          ol: ({ children }) => <ol className="text-xs text-sidebar-foreground/80 list-decimal pl-4 space-y-0.5 mb-1.5">{children}</ol>,
                          li: ({ children }) => <li>{children}</li>,
                          ul: ({ children }) => <ul className="text-xs text-sidebar-foreground/80 list-disc pl-4 space-y-0.5 mb-1.5">{children}</ul>,
                        }}
                      >
                        {promptApproved ? generatedPrompt : editedPrompt}
                      </ReactMarkdown>
                    </div>
                  )}

                  {!promptApproved ? (
                    <button
                      onClick={handleApprovePrompt}
                      className="w-full mt-3 py-2.5 rounded-lg bg-secondary text-white font-semibold text-sm hover:bg-secondary/90 transition-colors flex items-center justify-center gap-2"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Approve & Generate
                    </button>
                  ) : (
                    <div className="mt-3 flex items-center gap-2 text-xs text-accent font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Prompt approved — generating...
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Submitted confirmation in chat */}
            {!isViewing && submitted && submittedIdea && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-4">
                <div className="rounded-lg border-2 border-accent/40 bg-sidebar-accent p-4 text-center">
                  <CheckCircle2 className="w-10 h-10 text-accent mx-auto mb-2" />
                  <h3 className="font-semibold text-sidebar-foreground text-base mb-1">Idea Submitted!</h3>
                  <p className="text-xs text-sidebar-foreground/60 mb-3">
                    Your idea has been submitted and a support partner assigned.
                  </p>
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

          {/* Input Bar */}
          {(isViewing || !conversationDone || promptApproved) && (
            <div className="px-3 pb-3 pt-2 border-t border-sidebar-border shrink-0">
              <div className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent p-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (isViewing) handleRefinement(input);
                      else if (promptApproved && (wireframeReady || businessPlanReady)) handleRefinement(input);
                      else if (!conversationDone) handleSend();
                    }
                  }}
                  placeholder={
                    isViewing
                      ? canvasView === "business-plan"
                        ? "Describe changes to the business plan..."
                        : "Describe changes to the wireframe..."
                      : promptApproved && (wireframeReady || businessPlanReady)
                      ? canvasView === "business-plan"
                        ? "Describe changes to the business plan..."
                        : "Describe changes to the wireframe..."
                      : hasStarted
                      ? "Type your answer..."
                      : "Describe your idea..."
                  }
                  className="flex-1 bg-transparent outline-none text-sm text-sidebar-foreground placeholder:text-sidebar-foreground/40"
                  disabled={isGeneratingWireframe || isGeneratingBusinessPlan}
                />
                <button
                  onClick={toggleListening}
                  disabled={isGeneratingWireframe}
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
                    else if (promptApproved && (wireframeReady || businessPlanReady)) handleRefinement(input);
                    else if (!conversationDone) handleSend();
                  }}
                  disabled={!input.trim() || isTyping || isGeneratingWireframe || isGeneratingBusinessPlan}
                  className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
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
                  {canvasView === "wireframe" ? (
                    <>
                      <Eye className="w-4 h-4 text-accent" />
                      <h3 className="font-semibold text-sm text-foreground">Wireframe Preview</h3>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-sm text-foreground">Business Plan</h3>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {canvasView === "wireframe" && isGeneratingWireframe && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Generating...
                    </span>
                  )}
                  {canvasView === "business-plan" && isGeneratingBusinessPlan && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Generating...
                    </span>
                  )}
                  <button
                    onClick={() => {
                      const html = canvasView === "wireframe"
                        ? (wireframeHtml || viewingIdea?.wireframeHtml || "")
                        : (businessPlanHtml || viewingIdea?.businessPlanHtml || "");
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
                  {canvasView === "wireframe" && wireframeReady && !submitted && !isViewing && (
                    <button
                      onClick={() => streamWireframe(generatedPrompt, undefined, undefined, 0, undefined, wireframeTargetIdRef.current || draftIdeaId || undefined)}
                      className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Regenerate
                    </button>
                  )}
                </div>
              </div>

              {/* Canvas content */}
              <div className="flex-1 relative">
                {canvasView === "wireframe" && (
                  <>
                    {isGeneratingWireframe && (
                      <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                        <WireframeLoader estimated={isRefinement ? 20 : 35} />
                      </div>
                    )}
                    {(wireframeHtml || (isViewing && viewingIdea?.wireframeHtml)) ? (
                      <iframe
                        srcDoc={wireframeHtml || viewingIdea?.wireframeHtml}
                        title="Wireframe Preview"
                        className="w-full h-full border-0"
                        sandbox="allow-scripts allow-forms allow-modals allow-popups"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <WireframeLoader />
                      </div>
                    )}
                  </>
                )}
                {canvasView === "business-plan" && (
                  <>
                    {isGeneratingBusinessPlan ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center space-y-3">
                          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                          <p className="text-sm text-muted-foreground">Generating business plan...</p>
                        </div>
                      </div>
                    ) : (businessPlanHtml || (isViewing && viewingIdea?.businessPlanHtml)) ? (
                      <iframe
                        srcDoc={businessPlanHtml || viewingIdea?.businessPlanHtml}
                        title="Business Plan"
                        className="w-full h-full border-0"
                        sandbox="allow-scripts allow-forms allow-modals allow-popups"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">Business plan not yet generated.</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Submit / Actions bar */}
              {wireframeReady && !submitted && !isViewing && (
                <div className="px-4 py-3 border-t border-border shrink-0 flex gap-3">
                  <button
                    onClick={handleSubmit}
                    className="flex-1 py-2.5 rounded-lg bg-secondary text-white font-semibold text-sm hover:bg-secondary/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve & Submit
                  </button>
                  <button
                    onClick={() => streamWireframe(generatedPrompt, undefined, undefined, 0, undefined, wireframeTargetIdRef.current || draftIdeaId || undefined)}
                    className="py-2.5 px-5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </button>
                </div>
              )}

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
            /* Empty canvas placeholder */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Layout className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <h3 className="text-lg font-semibold text-foreground/60 mb-1">Canvas</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Your wireframe and business plan will appear here once generated.
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
