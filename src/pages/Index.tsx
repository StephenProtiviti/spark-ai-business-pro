import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageSquare, FileText, BarChart3, ChevronRight, ArrowRight, Sparkles, Zap, Users, Lightbulb, MoreVertical, Pencil, Trash2 } from "lucide-react";
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
    title: "Scored Evaluation Report",
    description: "Your idea is evaluated across strategic alignment, feasibility, innovation, and impact. A scored report is generated for the review board to make informed decisions.",
    image: stepWireframe,
    alt: "Evaluation report with scores and charts",
  },
];

const stats = [
  { value: "5", label: "Intake Scenarios", icon: Sparkles },
  { value: "AI", label: "Smart Recommendations", icon: Zap },
  { value: "Scored", label: "Evaluation Reports", icon: BarChart3 },
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
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        <img
          src={heroImage}
          alt="Team collaborating on innovative ideas"
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/60" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center max-w-3xl mx-auto px-6"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="mb-8"
          >
            <img src={sparkLogo} alt="Spark" className="h-24 sm:h-32 mx-auto rounded-lg" />
          </motion.div>

          <h1 className="text-3xl sm:text-4xl font-bold mb-6 leading-tight text-white">
            The AI-Driven Idea Engine
          </h1>
          <p className="text-white/80 mb-10 max-w-xl mx-auto">
            Submit ideas through an adaptive AI intake. Get matched to existing accelerators,
            and receive scored evaluation reports for review board decisions.
          </p>

          <Link
            to="/submit"
            className="group inline-flex items-center gap-2 px-12 py-4 rounded-lg bg-secondary text-white font-semibold text-lg hover:bg-secondary/90 transition-all shadow-lg shadow-secondary/30"
          >
            Submit an Idea
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </section>

      {/* Projects Section */}
      <section className="bg-[hsl(var(--spark-navy))] py-10 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Your Ideas</h2>
            <p className="text-white/50 text-sm">Pick up where you left off.</p>
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
                        <div className="rounded-xl border border-secondary/40 bg-white/5 p-5 aspect-square flex flex-col">
                          {idea.wireframeHtml ? (
                            <div className="w-full flex-1 mb-3 rounded-md overflow-hidden bg-white/10 border border-white/5">
                              <iframe
                                srcDoc={idea.wireframeHtml}
                                title="Wireframe preview"
                                className="w-full h-full pointer-events-none scale-[0.25] origin-top-left"
                                style={{ width: '400%', height: '400%' }}
                                sandbox=""
                              />
                            </div>
                          ) : (
                            <div className="w-full flex-1 mb-3 rounded-md bg-white/5 border border-white/5 flex items-center justify-center">
                              <Lightbulb className="w-6 h-6 text-white/20" />
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
                        <div className="rounded-xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 hover:border-white/20 transition-all aspect-square flex flex-col">
                          {idea.wireframeHtml ? (
                            <div className="w-full flex-1 mb-3 rounded-md overflow-hidden bg-white/10 border border-white/5">
                              <iframe
                                srcDoc={idea.wireframeHtml}
                                title="Wireframe preview"
                                className="w-full h-full pointer-events-none scale-[0.25] origin-top-left"
                                style={{ width: '400%', height: '400%' }}
                                sandbox=""
                              />
                            </div>
                          ) : (
                            <div className="w-full flex-1 mb-3 rounded-md bg-white/5 border border-white/5 flex items-center justify-center">
                              <Lightbulb className="w-6 h-6 text-white/20" />
                            </div>
                          )}
                          <h3 className="text-white font-semibold text-sm leading-tight group-hover:text-secondary transition-colors line-clamp-2 mb-2">
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

      {/* How It Works — alternating rows */}
      <section className="py-24 px-6 bg-background">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <p className="text-secondary font-semibold text-sm uppercase tracking-widest mb-2">The Process</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">How Spark Works</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
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
                  className={`flex flex-col ${isEven ? "md:flex-row" : "md:flex-row-reverse"} items-center gap-12`}
                >
                  {/* Image */}
                  <div className="flex-1 flex justify-center">
                    <div className="relative">
                      <div className="absolute -inset-4 bg-primary/5 rounded-2xl -rotate-3" />
                      <img
                        src={step.image}
                        alt={step.alt}
                        className="relative w-64 sm:w-80 rounded-xl shadow-lg"
                        loading="lazy"
                      />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 max-w-md">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-4xl font-bold text-primary/15 font-mono-display">{step.num}</span>
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <step.icon className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-3">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-20 px-6 bg-[hsl(var(--spark-navy))]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Ready to bring your idea to life?
          </h2>
          <p className="text-white/60 mb-8 max-w-md mx-auto">
            Start with a conversation. Spark handles the rest — from brief to wireframe.
          </p>
          <Link
            to="/submit"
            className="group inline-flex items-center gap-2 px-10 py-4 rounded-lg bg-secondary text-white font-semibold text-base hover:bg-secondary/90 transition-all shadow-lg shadow-secondary/30"
          >
            Get Started
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </section>
    </div>
  );
};

export default Index;
