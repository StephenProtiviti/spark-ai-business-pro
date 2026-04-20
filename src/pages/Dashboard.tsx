import { useState } from "react";
import { motion } from "framer-motion";
import { Search, TrendingUp, Lightbulb, CheckCircle2, ArrowRight, MessageSquare, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { useIdeas } from "@/contexts/IdeasContext";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Dashboard = () => {
  const { recentIdeas } = useIdeas();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>("All");

  // Derive unique types and subcategories from ideas
  const ideaTypes = Array.from(new Set(recentIdeas.map(i => i.ideaType).filter(Boolean))) as string[];
  const ideaSubcategories = Array.from(
    new Set(
      recentIdeas
        .filter(i => typeFilter === "All" || i.ideaType === typeFilter)
        .map(i => i.ideaSubcategory)
        .filter(Boolean)
    )
  ) as string[];

  const filtered = recentIdeas.filter((idea) => {
    const matchesSearch = idea.title.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (typeFilter !== "All" && idea.ideaType !== typeFilter) return false;
    if (subcategoryFilter !== "All" && idea.ideaSubcategory !== subcategoryFilter) return false;
    return true;
  });

  const stats = [
    { label: "Total Spark Ideas", value: recentIdeas.length, icon: Lightbulb },
    { label: "Client Delivery", value: recentIdeas.filter(i => i.ideaType === "Client Delivery").length, icon: CheckCircle2 },
    { label: "Internal Operations", value: recentIdeas.filter(i => i.ideaType === "Internal Operations").length, icon: Filter },
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

        {/* Search + Filters */}
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
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setSubcategoryFilter("All"); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Idea Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Types</SelectItem>
              {ideaTypes.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {ideaSubcategories.length > 0 && (
            <Select value={subcategoryFilter} onValueChange={setSubcategoryFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Subcategory" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Subcategories</SelectItem>
                {ideaSubcategories.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Ideas List */}
        {filtered.length > 0 ? (
          <div className="flex flex-col gap-4">
            {filtered.map((idea, i) => {
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
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {idea.ideaType && (
                              <Badge variant={idea.ideaType === "Client Delivery" ? "default" : "secondary"} className="text-[10px] px-2 py-0.5">
                                {idea.ideaType === "Client Delivery" ? "Client" : "Internal"}
                              </Badge>
                            )}
                            {idea.ideaSubcategory && (
                              <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                                {idea.ideaSubcategory}
                              </Badge>
                            )}
                            {!idea.ideaType && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary border border-primary/30">
                                Spark Idea
                              </span>
                            )}
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

                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 self-center" />
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
              {search || typeFilter !== "All" || subcategoryFilter !== "All" ? "No ideas match your filters." : "No ideas yet. Submit your first idea through Spark!"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
