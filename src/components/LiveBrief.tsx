import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, Loader2, FileText, Sparkles, Tag } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Progress } from "@/components/ui/progress";

interface LiveBriefProps {
  scenario: string | null;
  ideaTitle: string;
  ideaDescription: string;
  questions: string[];
  answers: string[]; // aligned by index with questions
  isTyping: boolean;
}

// Strip markdown bold/italic and the "Last one: " prefix from a question label
const cleanLabel = (q: string) =>
  q.replace(/\*\*/g, "").replace(/^Last one:\s*/i, "").trim();

// Derive a short section title from a question (first sentence / before colon, capped)
const sectionTitle = (q: string) => {
  const clean = cleanLabel(q);
  const firstSentence = clean.split(/[?:.]/)[0].trim();
  // Strip leading interrogatives for a noun-like heading
  const trimmed = firstSentence
    .replace(/^(what(?:'s| is| are)?|how(?:'s| is| are| many| much)?|who(?:'s| is| are)?|when(?:'s| is| are)?|where(?:'s| is| are)?|why(?:'s| is| are)?|which|can you|please|specify|last one:?)\s+/i, "")
    .trim();
  const title = trimmed.length > 0 ? trimmed : firstSentence;
  // Title-case the first letter
  return title.charAt(0).toUpperCase() + title.slice(1);
};

const LiveBrief = ({ scenario, ideaTitle, ideaDescription, questions, answers, isTyping }: LiveBriefProps) => {
  const total = questions.length + 1; // +1 for idea description
  const answered = (ideaDescription ? 1 : 0) + answers.filter((a) => a && a.trim().length > 0).length;
  const pct = Math.round((answered / total) * 100);

  // Index of the question currently being asked (first unanswered)
  const activeIdx = answers.findIndex((a) => !a || !a.trim().length);

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-background via-background to-muted/30">
      <div className="max-w-3xl mx-auto px-8 py-8">
        {/* Document header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 pb-6 border-b border-border"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-3">
            <FileText className="w-3.5 h-3.5" />
            Innovation Idea Brief
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground normal-case tracking-normal">
              <Sparkles className="w-3 h-3" />
              Live preview — building as you answer
            </span>
          </div>
          <AnimatePresence mode="wait">
            <motion.h1
              key={ideaTitle || "untitled"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-3xl font-bold text-foreground leading-tight mb-2"
            >
              {ideaTitle || (
                <span className="text-muted-foreground/60 italic font-normal">
                  Your idea title will appear here…
                </span>
              )}
            </motion.h1>
          </AnimatePresence>
          {scenario && (
            <div className="flex items-center gap-2 mt-3">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                <Tag className="w-3 h-3" />
                {scenario}
              </span>
              <span className="text-xs text-muted-foreground">
                Draft started {new Date().toLocaleDateString()}
              </span>
            </div>
          )}

          {/* Progress */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span className="font-medium">
                {answered} of {total} sections captured
              </span>
              <span className="font-semibold text-primary">{pct}%</span>
            </div>
            <Progress value={pct} className="h-1.5" />
          </div>
        </motion.div>

        {/* Executive summary / Idea description */}
        <BriefSection
          index={0}
          title="Submission Overview"
          status={ideaDescription ? "captured" : "active"}
        >
          {ideaDescription ? (
            <div className="prose prose-sm max-w-none text-foreground/80">
              <ReactMarkdown>{ideaDescription}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Waiting for your idea description…
            </p>
          )}
        </BriefSection>

        {/* Q&A sections */}
        {questions.map((q, i) => {
          const a = answers[i] || "";
          const hasAnswer = a.trim().length > 0;
          const isActive = !hasAnswer && i === activeIdx;
          const status: SectionStatus = hasAnswer ? "captured" : isActive ? "active" : "pending";

          return (
            <BriefSection
              key={i}
              index={i + 1}
              title={sectionTitle(q)}
              fullQuestion={cleanLabel(q)}
              status={status}
              isTyping={isActive && isTyping}
            >
              {hasAnswer ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="prose prose-sm max-w-none text-foreground/80"
                >
                  <ReactMarkdown>{a}</ReactMarkdown>
                </motion.div>
              ) : isActive ? (
                <p className="text-sm text-primary/80 italic flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Awaiting your response in chat…
                </p>
              ) : (
                <p className="text-sm text-muted-foreground/60 italic">Not yet captured</p>
              )}
            </BriefSection>
          );
        })}

        {/* Footer note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 p-4 rounded-lg bg-muted/50 border border-dashed border-border"
        >
          <p className="text-xs text-muted-foreground leading-relaxed">
            <Sparkles className="w-3 h-3 inline mr-1 text-primary" />
            Once all sections are captured, this draft will be transformed into a polished,
            executive-ready Innovation Idea Brief with pros, cons, tangible metrics, and triage routing.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

type SectionStatus = "captured" | "active" | "pending";

const BriefSection = ({
  index,
  title,
  fullQuestion,
  status,
  isTyping,
  children,
}: {
  index: number;
  title: string;
  fullQuestion?: string;
  status: SectionStatus;
  isTyping?: boolean;
  children: React.ReactNode;
}) => {
  const statusStyles = {
    captured: "border-l-primary bg-card",
    active: "border-l-primary/60 bg-primary/5 ring-1 ring-primary/20",
    pending: "border-l-border bg-muted/20",
  }[status];

  const StatusIcon =
    status === "captured" ? CheckCircle2 : status === "active" ? Loader2 : Circle;

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3) }}
      className={`relative mb-4 pl-5 pr-5 py-4 rounded-r-lg border-l-4 ${statusStyles} transition-colors`}
    >
      <div className="flex items-start gap-3 mb-2">
        <StatusIcon
          className={`w-4 h-4 mt-0.5 shrink-0 ${
            status === "captured"
              ? "text-primary"
              : status === "active"
              ? "text-primary animate-spin"
              : "text-muted-foreground/40"
          }`}
        />
        <div className="flex-1 min-w-0">
          <h2
            className={`text-sm font-bold uppercase tracking-wide ${
              status === "pending" ? "text-muted-foreground/60" : "text-foreground"
            }`}
          >
            {title}
          </h2>
          {fullQuestion && status !== "pending" && (
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
              {fullQuestion}
            </p>
          )}
        </div>
        {isTyping && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary animate-pulse">
            Live
          </span>
        )}
      </div>
      <div className="pl-7">{children}</div>
    </motion.section>
  );
};

export default LiveBrief;
