import { useState } from "react";
import { motion } from "framer-motion";
import { Search, TrendingUp, Lightbulb, CheckCircle2, ArrowRight, MessageSquare, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { useIdeas } from "@/contexts/IdeasContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = ["All Ideas", "ADO Boards", "IT", "AI Studio", "Innovation", "My Ideas"] as const;

const Dashboard = () => {
  const { recentIdeas } = useIdeas();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All Ideas");

  const filtered = recentIdeas.filter((idea) => {
    const matchesSearch = idea.title.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (category === "All Ideas") return true;
    if (category === "My Ideas") return true; // TODO: filter by authenticated user
    // Match category from the idea's teams channel or messages
    return idea.teamsChannel.toLowerCase().includes(category.toLowerCase());
  });

  const stats = [
    { label: "Total Spark Ideas", value: recentIdeas.length, icon: Lightbulb },
    { label: "Your Submitted", value: recentIdeas.length, icon: CheckCircle2 },
    { label: "Active Categories", value: new Set(recentIdeas.map(i => i.teamsChannel)).size, icon: Filter },
    { label: "This Month", value: recentIdeas.filter((i) => {
      const d = new Date(i.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length, icon: TrendingUp },
  ];

  return (
    <div className="pt-20 pb-12 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-foreground mb-1">Innovation Dashboard</h1>
          <p className="text-muted-foreground text-sm mb-8">Track and manage your Spark ideas.</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="spark-card p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-primary">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Search + Category Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ideas..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-card text-sm text-foreground outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ideas List */}
        {filtered.length > 0 ? (
          <div className="flex flex-col gap-4">
            {filtered.map((idea, i) => {
              const userMsgs = idea.messages.filter(m => m.role === "user");
              const totalWords = userMsgs.reduce((sum, m) => sum + m.content.split(/\s+/).length, 0);
              const questionCount = idea.messages.filter(m => m.role === "assistant").length;
              
              const feasibility = Math.min(100, Math.round(
                30 + (totalWords > 20 ? 20 : totalWords) + (questionCount > 3 ? 15 : 5) + (userMsgs.length * 2)
              ));
              const complexity = Math.min(100, Math.round(
                15 + (totalWords > 50 ? 35 : totalWords * 0.7) + (userMsgs.length * 5)
              ));

              const feasibilityColor = feasibility >= 70 ? "text-emerald-500" : feasibility >= 40 ? "text-amber-500" : "text-red-400";
              const complexityColor = complexity >= 70 ? "text-red-400" : complexity >= 40 ? "text-amber-500" : "text-emerald-500";

              return (
                <motion.div
                  key={idea.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <Link to={`/idea/${idea.id}`} className="block">
                    <div className="spark-card p-6 hover:border-primary/30 transition-all duration-300 group">
                      <div className="flex items-start gap-6">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary border border-primary/30">
                              Spark Idea
                            </span>
                          </div>
                          <h3 className="text-foreground font-semibold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-1 mb-1">
                            {idea.title}
                          </h3>
                          {idea.messages.length > 0 && (
                            <p className="text-muted-foreground text-sm line-clamp-1">
                              {idea.messages.find(m => m.role === "user")?.content || ""}
                            </p>
                          )}

                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                                {idea.assignedTo.avatar}
                              </div>
                              <span className="text-xs text-muted-foreground">{idea.assignedTo.name}</span>
                            </div>
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <MessageSquare className="w-3 h-3" />
                              {idea.messages.length} msgs
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(idea.date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Scores */}
                        <div className="flex items-center gap-6 shrink-0">
                          <div className="text-center">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Feasibility</p>
                            <p className={`text-2xl font-bold ${feasibilityColor}`}>{feasibility}</p>
                          </div>
                          <div className="w-px h-10 bg-border" />
                          <div className="text-center">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Complexity</p>
                            <p className={`text-2xl font-bold ${complexityColor}`}>{complexity}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <Lightbulb className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              {search || category !== "All Ideas" ? "No ideas match your filters." : "No ideas yet. Submit your first idea through Spark!"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
