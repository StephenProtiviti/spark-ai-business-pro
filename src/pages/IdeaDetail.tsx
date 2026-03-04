import { useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ThumbsUp, AlertTriangle, Tag, MessageSquare, Eye, ExternalLink, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import NexusScoreBadge from "@/components/NexusScoreBadge";
import MermaidDiagram from "@/components/MermaidDiagram";
import FeasibilityMatrix from "@/components/FeasibilityMatrix";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { mockIdeas } from "@/data/mockIdeas";
import { useIdeas } from "@/contexts/IdeasContext";

const IdeaDetail = () => {
  const { id } = useParams();
  const { recentIdeas, setActiveIdeaId } = useIdeas();

  const mockIdea = mockIdeas.find((i) => i.id === id);
  const recentIdea = recentIdeas.find((i) => i.id === id);

  const handleOpenInNewWindow = useCallback((html: string) => {
    const blob = new Blob([html], { type: "text/html" });
    window.open(URL.createObjectURL(blob), "_blank");
  }, []);

  if (!mockIdea && !recentIdea) {
    return (
      <div className="pt-24 px-6 text-center">
        <p className="text-muted-foreground">Idea not found.</p>
        <Link to="/dashboard" className="text-primary text-sm mt-2 inline-block">← Back to Dashboard</Link>
      </div>
    );
  }

  // Render recent idea detail
  if (recentIdea) {
    const firstUserMessage = recentIdea.messages.find(m => m.role === "user")?.content || "";
    const hasWireframe = Boolean(recentIdea.wireframeHtml);
    const hasBusinessPlan = Boolean(recentIdea.businessPlanHtml);
    const hasDeliverables = hasWireframe || hasBusinessPlan;

    return (
      <div className="pt-20 pb-12 px-6">
        <div className="max-w-5xl mx-auto">
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Header */}
            <div className="flex items-start gap-6 mb-8">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary border border-primary/30">
                    Spark Idea
                  </span>
                  {hasWireframe && (
                    <span className="text-xs text-accent flex items-center gap-1">
                      <Eye className="w-3 h-3" /> Wireframe
                    </span>
                  )}
                  {hasBusinessPlan && (
                    <span className="text-xs text-primary flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Business Plan
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">{recentIdea.title}</h1>
                {firstUserMessage && (
                  <p className="text-muted-foreground">{firstUserMessage}</p>
                )}
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                      {recentIdea.assignedTo.avatar}
                    </div>
                    <span className="text-sm text-muted-foreground">{recentIdea.assignedTo.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{recentIdea.assignedTo.role}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{new Date(recentIdea.date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Deliverables Tabs */}
            {hasDeliverables && (
              <Tabs defaultValue={hasWireframe ? "wireframe" : "business-plan"} className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <TabsList>
                    {hasWireframe && (
                      <TabsTrigger value="wireframe" className="flex items-center gap-1.5">
                        <Eye className="w-4 h-4" />
                        Wireframe Preview
                      </TabsTrigger>
                    )}
                    {hasBusinessPlan && (
                      <TabsTrigger value="business-plan" className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4" />
                        Business Benefits
                      </TabsTrigger>
                    )}
                  </TabsList>
                  <Link
                    to="/submit"
                    onClick={() => setActiveIdeaId(recentIdea.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border border-border bg-card text-foreground hover:bg-muted transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Chat
                  </Link>
                </div>

                {hasWireframe && (
                  <TabsContent value="wireframe">
                    <div className="flex items-center justify-end mb-2">
                      <button
                        onClick={() => handleOpenInNewWindow(recentIdea.wireframeHtml!)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-card text-foreground hover:bg-muted transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open in New Window
                      </button>
                    </div>
                    <div className="spark-card overflow-hidden rounded-lg">
                      <iframe
                        srcDoc={recentIdea.wireframeHtml}
                        title="Wireframe Preview"
                        className="w-full border-0 rounded-lg bg-white"
                        style={{ minHeight: "600px" }}
                        sandbox="allow-scripts allow-forms allow-modals"
                      />
                    </div>
                  </TabsContent>
                )}

                {hasBusinessPlan && (
                  <TabsContent value="business-plan">
                    <div className="flex items-center justify-end mb-2">
                      <button
                        onClick={() => handleOpenInNewWindow(recentIdea.businessPlanHtml!)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-card text-foreground hover:bg-muted transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open in New Window
                      </button>
                    </div>
                    <div className="spark-card overflow-hidden rounded-lg">
                      <iframe
                        srcDoc={recentIdea.businessPlanHtml}
                        title="Business Plan"
                        className="w-full border-0 rounded-lg bg-white"
                        style={{ minHeight: "600px" }}
                        sandbox="allow-scripts allow-forms allow-modals"
                      />
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            )}

            {/* Conversation */}
            <h2 className="font-bold text-foreground text-xl mb-4">Conversation</h2>
            <div className="spark-card p-6 mb-8 max-h-[500px] overflow-y-auto">
              <div className="space-y-3">
                {recentIdea.messages.map((msg, i) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={i}
                      className={`rounded-lg px-4 py-3 text-sm border-l-4 ${
                        isUser
                          ? "border-l-primary bg-primary/10"
                          : "border-l-secondary bg-muted"
                      }`}
                    >
                      <span className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isUser ? "text-primary" : "text-secondary"}`}>
                        {isUser ? "You" : "Spark AI"}
                      </span>
                      <div className="text-foreground">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-center gap-4">
              <Link
                to="/submit"
                onClick={() => setActiveIdeaId(recentIdea.id)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                {hasWireframe ? "Edit Wireframe in Chat" : "Continue in Chat"}
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Render mock idea detail (original layout)
  const idea = mockIdea!;
  return (
    <div className="pt-20 pb-12 px-6">
      <div className="max-w-5xl mx-auto">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex items-start gap-6 mb-8">
            <NexusScoreBadge score={idea.nexusScore} size="lg" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary border border-primary/30">
                  {idea.category}
                </span>
                <span className="text-xs text-muted-foreground capitalize">• {idea.status}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">{idea.title}</h1>
              <p className="text-muted-foreground">{idea.description}</p>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    {idea.avatar}
                  </div>
                  <span className="text-sm text-muted-foreground">{idea.author}</span>
                </div>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">{idea.date}</span>
                <div className="flex gap-2 ml-2">
                  {idea.tags.map((tag) => (
                    <span key={tag} className="text-xs text-muted-foreground flex items-center gap-0.5 bg-muted px-2 py-0.5 rounded">
                      <Tag className="w-3 h-3" /> {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Twin Agent Analysis */}
          <h2 className="font-bold text-foreground text-xl mb-4">AI Twin-Agent Analysis</h2>
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="spark-card p-6 border-primary/30">
              <div className="flex items-center gap-2 mb-3">
                <ThumbsUp className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-primary">The Optimist</h3>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">{idea.optimistView}</p>
              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                <span>Value: <strong className="text-primary">{idea.valueScore}/100</strong></span>
                <span>Impact: <strong className="text-primary">{idea.impactScore}/100</strong></span>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="spark-card p-6 border-secondary/30">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-secondary" />
                <h3 className="font-semibold text-secondary">The Skeptic</h3>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">{idea.skepticView}</p>
              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                <span>Feasibility: <strong className="text-secondary">{idea.feasibilityScore}/100</strong></span>
                <span>Effort: <strong className="text-secondary">{idea.effortScore}/100</strong></span>
              </div>
            </motion.div>
          </div>

          {/* Feasibility Matrix */}
          <div className="mb-8">
            <FeasibilityMatrix ideas={mockIdeas} highlightId={idea.id} />
          </div>

          {/* System Diagram */}
          <h2 className="font-bold text-foreground text-xl mb-4">Auto-Generated System Diagram</h2>
          <div className="mb-8">
            <MermaidDiagram chart={idea.mermaidDiagram} />
          </div>

          {/* Press Release */}
          <h2 className="font-bold text-foreground text-xl mb-4">Press Release from 2027</h2>
          <div className="spark-card p-6 border-secondary/30">
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  strong: ({ children }) => <strong className="text-secondary font-semibold">{children}</strong>,
                  p: ({ children }) => <p className="text-foreground/80 mb-3 last:mb-0 leading-relaxed">{children}</p>,
                }}
              >
                {idea.pressRelease}
              </ReactMarkdown>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default IdeaDetail;
