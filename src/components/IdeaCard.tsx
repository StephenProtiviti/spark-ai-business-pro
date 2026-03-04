import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Tag } from "lucide-react";
import NexusScoreBadge from "./NexusScoreBadge";
import type { Idea } from "@/data/mockIdeas";

const categoryColors: Record<string, string> = {
  Process: "bg-primary/10 text-primary border border-primary/30",
  Product: "bg-accent/10 text-accent border border-accent/30",
  Savings: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30",
};

const statusColors: Record<string, string> = {
  submitted: "text-muted-foreground",
  reviewing: "text-secondary",
  approved: "text-primary",
  rejected: "text-destructive",
};

const IdeaCard = ({ idea }: { idea: Idea }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <Link to={`/idea/${idea.id}`} className="block">
        <div className="spark-card p-6 hover:border-primary/30 transition-all duration-300 group">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[idea.category]}`}>
                  {idea.category}
                </span>
                <span className={`text-xs font-medium capitalize ${statusColors[idea.status]}`}>
                  • {idea.status}
                </span>
              </div>
              <h3 className="text-foreground font-semibold text-lg leading-tight group-hover:text-primary transition-colors">
                {idea.title}
              </h3>
            </div>
            <NexusScoreBadge score={idea.nexusScore} size="sm" />
          </div>

          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{idea.description}</p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                {idea.avatar}
              </div>
              <span className="text-xs text-muted-foreground">{idea.author}</span>
            </div>
            <div className="flex items-center gap-1">
              {idea.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="text-xs text-muted-foreground flex items-center gap-0.5">
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            View Analysis <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default IdeaCard;
