import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageSquare, FileText, BarChart3, ChevronRight, ArrowRight, Sparkles, Zap, Users, MoreVertical, Pencil, Trash2 } from "lucide-react";
import sparkLogo from "@/assets/spark-logo.png";
import heroImage from "@/assets/hero-innovation.jpg";
import stepInterview from "@/assets/step-interview.jpg";
import stepBrief from "@/assets/step-brief.jpg";
import stepWireframe from "@/assets/step-wireframe.jpg";
import { useIdeas } from "@/contexts/IdeasContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const steps = [
  {
    num: "01",
    icon: MessageSquare,
    title: "AI-Guided Intake",
    description: "Select your scenario — from AI Studio requests to automation support — and answer tailored questions. Spark's AI adapts its follow-ups based on your responses to capture every detail.",
    image: stepInterview,
    alt: "AI chatbot intake conversation",
  },
  {
    num: "02",
    icon: FileText,
    title: "Smart Recommendations",
    description: "Before you submit, Spark surfaces existing accelerators and tools that match your idea. Reuse what's already built, or proceed with a new submission if nothing fits.",
    image: stepBrief,
    alt: "Recommendation cards with matching solutions",
  },
  {
    num: "03",
    icon: BarChart3,
    title: "Review & Selection",
    description: "Your idea is reviewed by the leadership team for strategic fit, feasibility, and impact. Promising ideas are selected to move forward into development, turning concepts into real solutions.",
    image: stepWireframe,
    alt: "Leadership team reviewing and selecting ideas for development",
  },
];

const stats = [
  { value: "5", label: "Intake Scenarios", icon: Sparkles },
  { value: "AI", label: "Smart Recommendations", icon: Zap },
  { value: "Brief", label: "Innovation Idea Briefs", icon: BarChart3 },
  { value: "Team", label: "Review Board Ready", icon: Users },
];

const Index = () => {
  const { recentIdeas, deleteIdea, updateIdea } = useIdeas();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const handleDelete = (id: string) => {
    deleteIdea(id);
    setDeleteTarget(null);
    toast.success("Idea deleted successfully");
  };

  const handleRename = (id: string) => {
    if (renameValue.trim()) {
      updateIdea(id, { title: renameValue.trim() });
      toast.success("Idea renamed successfully");
    }
    setRenamingId(null);
  };

  return (
    <div className="min-h-screen pt-14">
      {/* Hero */}
      <section className="relative bg-[hsl(var(--spark-navy))] text-white pt-32 pb-56 overflow-hidden">
        {/* Hero image as soft backdrop */}
        <img
          src={heroImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-55"
        />
        {/* Readability + scroll-darken gradient: lighter at top so people show through, deep navy at bottom for smooth transition into the cards section */}
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--spark-navy))]/30 via-[hsl(var(--spark-navy))]/75 to-[#04070F]" />
        {/* Subtle vignette so headline copy stays readable over faces */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--spark-navy)/0.55)_70%)]" />

        {/* Teal flowing particle motif */}
        <div className="absolute inset-0 opacity-50 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="teal-glow-a" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(var(--spark-teal))" stopOpacity="0.35" />
                <stop offset="100%" stopColor="hsl(var(--spark-navy))" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="teal-glow-b" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(var(--spark-teal))" stopOpacity="0.25" />
                <stop offset="100%" stopColor="hsl(var(--spark-navy))" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="280" cy="320" r="280" fill="url(#teal-glow-a)" />
            <circle cx="980" cy="520" r="340" fill="url(#teal-glow-b)" />
            <path d="M-100 480 Q 300 280 600 480 T 1300 480" stroke="hsl(var(--spark-teal))" strokeWidth="0.6" fill="none" opacity="0.5" />
            <path d="M-100 540 Q 320 340 640 540 T 1300 540" stroke="hsl(var(--spark-teal))" strokeWidth="0.6" fill="none" opacity="0.35" />
            <path d="M-100 600 Q 280 420 580 600 T 1300 600" stroke="hsl(var(--spark-teal))" strokeWidth="0.6" fill="none" opacity="0.2" />
          </svg>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-5xl mx-auto px-6 text-center"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-10 flex justify-center"
          >
            <div className="relative">
              {/* Outer wide ambient teal glow */}
              <div
                aria-hidden="true"
                className="absolute inset-0 -m-32 rounded-full blur-3xl opacity-90 animate-pulse"
                style={{
                  background:
                    "radial-gradient(closest-side, hsl(var(--spark-teal) / 0.9), hsl(var(--spark-teal) / 0.4) 45%, transparent 75%)",
                }}
              />
              {/* Inner hot orange core */}
              <div
                aria-hidden="true"
                className="absolute inset-0 -m-16 rounded-full blur-2xl opacity-80"
                style={{
                  background:
                    "radial-gradient(closest-side, hsl(var(--spark-orange) / 0.75), hsl(var(--spark-orange) / 0.25) 55%, transparent 80%)",
                }}
              />
              <img
                src={sparkLogo}
                alt="Spark"
                className="relative h-16 sm:h-20 w-auto drop-shadow-[0_0_45px_hsl(var(--spark-teal)/0.9)] [filter:drop-shadow(0_0_20px_hsl(var(--spark-orange)/0.7))_drop-shadow(0_0_60px_hsl(var(--spark-teal)/0.8))]"
              />
            </div>
          </motion.div>

          <p className="text-[hsl(var(--spark-teal))] font-semibold uppercase tracking-[0.25em] text-xs mb-6">
            Protiviti Innovation Hub
          </p>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extralight tracking-tight mb-8 leading-[1.05] text-white">
            Accelerate innovation <br />
            <span className="font-normal">at Protiviti.</span>
          </h1>
          <p className="text-lg sm:text-xl font-light text-white/70 max-w-2xl mx-auto mb-12 leading-relaxed">
            Spark is Protiviti's AI-guided intake hub. Submit a new idea for the innovation board to review, or request hands-on support for existing Protiviti tools like Atlas, ProGPT, Copilot agents, and Power Platform — all through a single conversational experience.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/submit"
              className="group inline-flex items-center gap-2 px-10 py-4 bg-secondary text-white font-semibold text-base hover:bg-secondary/90 transition-all shadow-lg shadow-secondary/20 hover:-translate-y-0.5"
            >
              Submit an Idea
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/submit?mode=support"
              className="group inline-flex items-center gap-2 px-10 py-4 border border-white/30 text-white font-medium text-base hover:bg-white/10 hover:border-white/60 transition-all"
            >
              Request Support
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </motion.div>

        {/* Angled transition into navy projects band */}
        <div
          className="absolute bottom-0 left-0 w-full h-24 bg-[hsl(var(--spark-navy))]"
          style={{ clipPath: "polygon(0 100%, 100% 100%, 100% 0)" }}
        />
      </section>

      {/* Projects Section */}
      <section className="bg-[hsl(var(--spark-navy))] py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10 flex items-end justify-between flex-wrap gap-4">
            <div>
              <p className="text-[hsl(var(--spark-teal))] font-semibold uppercase tracking-[0.25em] text-xs mb-3">
                Innovation Pipeline
              </p>
              <h2 className="text-3xl sm:text-4xl font-extralight text-white">Your Ideas</h2>
              <p className="text-white/50 text-sm mt-2">Pick up where you left off.</p>
            </div>
            {recentIdeas.length > 6 && (
              <Link to="/dashboard" className="text-white font-semibold border-b-2 border-secondary pb-1 hover:text-secondary transition-colors text-sm">
                View All Spark Ideas
              </Link>
            )}
          </div>

          {recentIdeas.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentIdeas.slice(0, 6).map((idea, i) => (
                <motion.div
                  key={idea.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="relative">
                    {renamingId === idea.id ? (
                      <div className="block">
                        <div className="relative border-l-2 border-l-white/80 border-y border-r border-white/10 bg-white/[0.04] p-5 aspect-square flex flex-col ring-1 ring-secondary/40">
                          <div className="absolute top-0 right-0 h-0.5 w-10 bg-secondary" />
                          {(idea.businessPlanHtml || idea.wireframeHtml) ? (
                            <div className="w-full flex-1 mb-3 overflow-hidden bg-white border border-white/5">
                              <iframe
                                srcDoc={idea.businessPlanHtml || idea.wireframeHtml}
                                title="Document preview"
                                className="w-full h-full pointer-events-none scale-[0.25] origin-top-left"
                                style={{ width: '400%', height: '400%' }}
                                sandbox=""
                              />
                            </div>
                          ) : (
                            <div className="w-full flex-1 mb-3 bg-white/5 border border-white/5 flex items-center justify-center">
                              <FileText className="w-6 h-6 text-white/20" />
                            </div>
                          )}
                          <div className="mb-2">
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRename(idea.id);
                                if (e.key === "Escape") setRenamingId(null);
                              }}
                              onBlur={() => handleRename(idea.id)}
                              className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm outline-none focus:border-secondary"
                            />
                          </div>
                          <div className="flex items-center gap-2 text-white/40 text-[11px] mt-auto">
                            <span>{idea.assignedTo.name}</span>
                            <span>·</span>
                            <span>{new Date(idea.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Link to={`/submit/${idea.id}`} className="block group">
                        <div className="relative border-l-2 border-l-white/80 border-y border-r border-white/10 bg-white/[0.04] p-5 hover:bg-white/[0.08] hover:border-l-secondary transition-all aspect-square flex flex-col">
                          <div className="absolute top-0 right-0 h-0.5 w-0 bg-secondary group-hover:w-16 transition-all duration-300" />
                          {(idea.businessPlanHtml || idea.wireframeHtml) ? (
                            <div className="w-full flex-1 mb-3 overflow-hidden bg-white border border-white/5">
                              <iframe
                                srcDoc={idea.businessPlanHtml || idea.wireframeHtml}
                                title="Document preview"
                                className="w-full h-full pointer-events-none scale-[0.25] origin-top-left"
                                style={{ width: '400%', height: '400%' }}
                                sandbox=""
                              />
                            </div>
                          ) : (
                            <div className="w-full flex-1 mb-3 bg-white/5 border border-white/5 flex items-center justify-center">
                              <FileText className="w-6 h-6 text-white/20" />
                            </div>
                          )}
                          <h3 className="text-white font-semibold text-sm leading-tight group-hover:text-[hsl(var(--spark-teal))] transition-colors line-clamp-2 mb-2">
                            {idea.title}
                          </h3>
                          <div className="flex items-center gap-2 text-white/40 text-[11px] mt-auto">
                            <span>{idea.assignedTo.name}</span>
                            <span>·</span>
                            <span>{new Date(idea.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </Link>
                    )}

                    {/* Kebab menu */}
                    <div className="absolute top-2 right-2 z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded-md bg-black/40 hover:bg-black/60 text-white/60 hover:text-white transition-colors" onClick={(e) => e.preventDefault()}>
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => { setRenamingId(idea.id); setRenameValue(idea.title); }}>
                            <Pencil className="w-4 h-4 mr-2" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(idea.id)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-white/40 text-sm">No projects yet. Start your first one!</p>
            </div>
          )}

          {recentIdeas.length > 6 && (
            <div className="text-center mt-6">
              <Link to="/dashboard" className="text-sm text-white/60 hover:text-white transition-colors">
                View all projects →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this idea?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The idea and all associated data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteTarget && handleDelete(deleteTarget)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* How It Works — alternating editorial rows */}
      <section className="py-28 px-6 bg-[hsl(210_20%_97%)] border-y border-slate-200">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <p className="text-[hsl(var(--spark-teal))] font-semibold uppercase tracking-[0.25em] text-xs mb-4">
              The Process
            </p>
            <h2 className="text-4xl sm:text-5xl font-extralight text-[hsl(var(--spark-navy))] mb-4">
              How Spark Works
            </h2>
            <p className="text-muted-foreground font-light max-w-lg mx-auto">
              From spark to strategy in three intelligent steps — no templates, no guesswork.
            </p>
          </motion.div>

          <div className="space-y-24">
            {steps.map((step, i) => {
              const isEven = i % 2 === 0;
              return (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.6 }}
                  className={`flex flex-col ${isEven ? "md:flex-row" : "md:flex-row-reverse"} items-center gap-16`}
                >
                  {/* Image */}
                  <div className="flex-1 flex justify-center">
                    <div className="relative">
                      <img
                        src={step.image}
                        alt={step.alt}
                        className="relative w-72 sm:w-96 shadow-2xl"
                        loading="lazy"
                      />
                      <div className="absolute -bottom-4 -right-4 w-24 h-24 border-l-2 border-b-2 border-[hsl(var(--spark-teal))]" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 max-w-md">
                    <span className="block text-7xl sm:text-8xl font-extralight text-[hsl(var(--spark-teal))]/20 leading-none mb-4 font-mono-display">
                      {step.num}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-light text-[hsl(var(--spark-navy))] mb-4">
                      {step.title}
                    </h3>
                    <p className="text-slate-600 font-light leading-relaxed">{step.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA — navy with angled top */}
      <section className="relative py-32 px-6 bg-[hsl(var(--spark-navy))] overflow-hidden">
        <div
          className="absolute top-0 left-0 w-full h-24 bg-[hsl(210_20%_97%)]"
          style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10 max-w-3xl mx-auto text-center pt-12"
        >
          <h2 className="text-3xl sm:text-5xl font-extralight text-white mb-6 leading-tight">
            Ready to bring your ideas <span className="font-normal">to life?</span>
          </h2>
          <p className="text-white/60 font-light mb-12 max-w-md mx-auto">
            Submit a new idea for the innovation board, or request hands-on support for existing Protiviti tools.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/submit"
              className="group inline-flex items-center gap-2 px-10 py-4 bg-secondary text-white font-semibold text-base hover:bg-secondary/90 transition-all shadow-lg shadow-secondary/20 hover:-translate-y-0.5"
            >
              Submit an Idea
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/submit?mode=support"
              className="group inline-flex items-center gap-2 px-10 py-4 border border-white/30 text-white font-medium text-base hover:bg-white/10 hover:border-white/60 transition-all"
            >
              Request Support
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default Index;
