import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Track deleted IDs so queued updates don't resurrect them
const deletedIds = new Set<string>();

// Serial queue to prevent concurrent Supabase requests that cause lock-stealing
const dbQueue: (() => Promise<void>)[] = [];
let isProcessing = false;

async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;
  while (dbQueue.length > 0) {
    const task = dbQueue.shift()!;
    try { await task(); } catch (e) { console.error("DB queue task failed:", e); }
  }
  isProcessing = false;
}

function enqueueDbOp(op: () => Promise<void>) {
  dbQueue.push(op);
  processQueue();
}

const supportTeam = [
  { name: "Alex Rivera", role: "Solutions Architect", avatar: "AR" },
  { name: "Sarah Chen", role: "Innovation Lead", avatar: "SC" },
  { name: "James Park", role: "Product Strategist", avatar: "JP" },
  { name: "Maria Lopez", role: "Technical Advisor", avatar: "ML" },
  { name: "Priya Sharma", role: "Business Analyst", avatar: "PS" },
];

export interface RecentIdea {
  id: string;
  title: string;
  assignedTo: { name: string; role: string; avatar: string };
  teamsChannel: string;
  date: string;
  messages: { role: "user" | "assistant"; content: string }[];
  wireframeHtml?: string;
  businessPlanHtml?: string;
  ideaType?: string;
  ideaSubcategory?: string;
}

interface IdeasContextType {
  recentIdeas: RecentIdea[];
  isLoading: boolean;
  activeIdeaId: string | null;
  setActiveIdeaId: (id: string | null) => void;
  submitIdea: (title: string, messages: { role: "user" | "assistant"; content: string }[], wireframeHtml?: string, businessPlanHtml?: string, ideaType?: string, ideaSubcategory?: string) => RecentIdea;
  deleteIdea: (id: string) => void;
  createDraftIdea: (title: string, messages: { role: "user" | "assistant"; content: string }[], ideaType?: string, ideaSubcategory?: string) => RecentIdea;
  updateIdea: (id: string, updates: { title?: string; messages?: { role: "user" | "assistant"; content: string }[]; wireframeHtml?: string; businessPlanHtml?: string; ideaType?: string; ideaSubcategory?: string }) => void;
}

const IdeasContext = createContext<IdeasContextType | null>(null);

export const useIdeas = () => {
  const ctx = useContext(IdeasContext);
  if (!ctx) throw new Error("useIdeas must be used within IdeasProvider");
  return ctx;
};

let nextAssignIndex = 0;

export const IdeasProvider = ({ children }: { children: ReactNode }) => {
  const [recentIdeas, setRecentIdeas] = useState<RecentIdea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIdeaId, setActiveIdeaId] = useState<string | null>(null);

  // Load ideas from database on mount
  useEffect(() => {
    const loadIdeas = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("ideas")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load ideas:", error);
        toast.error("Failed to load ideas from database");
        setIsLoading(false);
        return;
      }

      if (data) {
        const mapped: RecentIdea[] = data.map((row: any) => ({
          id: row.id,
          title: row.title,
          assignedTo: { name: row.assigned_name, role: row.assigned_role, avatar: row.assigned_avatar },
          teamsChannel: row.teams_channel,
          date: row.created_at,
          messages: row.messages as { role: "user" | "assistant"; content: string }[],
          wireframeHtml: row.wireframe_html || undefined,
          businessPlanHtml: row.business_plan_html || undefined,
          ideaType: row.idea_type || undefined,
          ideaSubcategory: row.idea_subcategory || undefined,
        }));

        // Merge remote data with any optimistic local ideas to avoid first-message drafts disappearing.
        // Filter out any ideas that were deleted locally before the fetch returned.
        setRecentIdeas((prev) => {
          const byId = new Map<string, RecentIdea>();
          mapped.forEach((idea) => {
            if (!deletedIds.has(idea.id)) byId.set(idea.id, idea);
          });
          prev.forEach((idea) => {
            if (!byId.has(idea.id) && !deletedIds.has(idea.id)) byId.set(idea.id, idea);
          });
          return Array.from(byId.values()).sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
        });
      }
      setIsLoading(false);
    };
    loadIdeas();
  }, []);

  const createDraftIdea = (title: string, messages: { role: "user" | "assistant"; content: string }[], ideaType?: string, ideaSubcategory?: string) => {
    const assigned = supportTeam[nextAssignIndex % supportTeam.length];
    nextAssignIndex++;

    const idea: RecentIdea = {
      id: crypto.randomUUID(),
      title: title.slice(0, 60) || "Untitled Idea",
      assignedTo: assigned,
      teamsChannel: `spark-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}`,
      date: new Date().toISOString(),
      messages,
      ideaType,
      ideaSubcategory,
    };

    setRecentIdeas((prev) => [idea, ...prev]);

    enqueueDbOp(async () => {
      const { error } = await supabase
        .from("ideas")
        .insert({
          id: idea.id,
          title: idea.title,
          assigned_name: assigned.name,
          assigned_role: assigned.role,
          assigned_avatar: assigned.avatar,
          teams_channel: idea.teamsChannel,
          messages: messages as any,
          idea_type: ideaType || null,
          idea_subcategory: ideaSubcategory || null,
        } as any);
      if (error) {
        console.error("Failed to save draft idea:", error.message, error.code);
        toast.error(`Failed to save idea: ${error.message}`);
      }
    });

    return idea;
  };

  const updateIdea = (id: string, updates: { title?: string; messages?: { role: "user" | "assistant"; content: string }[]; wireframeHtml?: string; businessPlanHtml?: string; ideaType?: string; ideaSubcategory?: string }) => {
    if (deletedIds.has(id)) return;

    setRecentIdeas((prev) =>
      prev.map((idea) =>
        idea.id === id
          ? {
              ...idea,
              ...(updates.title !== undefined && { title: updates.title }),
              ...(updates.messages !== undefined && { messages: updates.messages }),
              ...(updates.wireframeHtml !== undefined && { wireframeHtml: updates.wireframeHtml }),
              ...(updates.businessPlanHtml !== undefined && { businessPlanHtml: updates.businessPlanHtml }),
              ...(updates.ideaType !== undefined && { ideaType: updates.ideaType }),
              ...(updates.ideaSubcategory !== undefined && { ideaSubcategory: updates.ideaSubcategory }),
            }
          : idea
      )
    );

    const dbUpdates: Record<string, any> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.messages !== undefined) dbUpdates.messages = updates.messages;
    if (updates.wireframeHtml !== undefined) dbUpdates.wireframe_html = updates.wireframeHtml;
    if (updates.businessPlanHtml !== undefined) dbUpdates.business_plan_html = updates.businessPlanHtml;
    if (updates.ideaType !== undefined) dbUpdates.idea_type = updates.ideaType;
    if (updates.ideaSubcategory !== undefined) dbUpdates.idea_subcategory = updates.ideaSubcategory;

    if (Object.keys(dbUpdates).length > 0) {
      enqueueDbOp(async () => {
        if (deletedIds.has(id)) return;
        const maxRetries = 2;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          const { error } = await supabase
            .from("ideas")
            .update(dbUpdates as any)
            .eq("id", id);
          if (!error) return;
          const isNetworkError = error.message?.includes("Load failed") || error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError");
          if (isNetworkError && attempt < maxRetries) {
            console.warn(`Update retry ${attempt + 1} for idea ${id}`);
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }
          console.error("Failed to update idea:", error.message, error.code);
          toast.error(`Failed to save changes: ${error.message}`);
          return;
        }
      });
    }
  };

  const submitIdea = (title: string, messages: { role: "user" | "assistant"; content: string }[], wireframeHtml?: string, businessPlanHtml?: string, ideaType?: string, ideaSubcategory?: string) => {
    const assigned = supportTeam[nextAssignIndex % supportTeam.length];
    nextAssignIndex++;

    const idea: RecentIdea = {
      id: crypto.randomUUID(),
      title: title.slice(0, 60) || "Untitled Idea",
      assignedTo: assigned,
      teamsChannel: `spark-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}`,
      date: new Date().toISOString(),
      messages,
      wireframeHtml,
      businessPlanHtml,
      ideaType,
      ideaSubcategory,
    };

    setRecentIdeas((prev) => [idea, ...prev]);
    setActiveIdeaId(idea.id);

    enqueueDbOp(async () => {
      const { error } = await supabase
        .from("ideas")
        .insert({
          id: idea.id,
          title: idea.title,
          assigned_name: assigned.name,
          assigned_role: assigned.role,
          assigned_avatar: assigned.avatar,
          teams_channel: idea.teamsChannel,
          messages: messages as any,
          wireframe_html: wireframeHtml || null,
          business_plan_html: businessPlanHtml || null,
          idea_type: ideaType || null,
          idea_subcategory: ideaSubcategory || null,
        } as any);
      if (error) {
        console.error("Failed to save idea:", error.message, error.code);
        toast.error(`Failed to save idea: ${error.message}`);
      }
    });

    return idea;
  };

  const deleteIdea = (id: string) => {
    deletedIds.add(id);
    setRecentIdeas((prev) => prev.filter((i) => i.id !== id));
    if (activeIdeaId === id) setActiveIdeaId(null);
    enqueueDbOp(async () => {
      const { error } = await supabase.from("ideas").delete().eq("id", id);
      if (error) {
        console.error("Failed to delete idea:", error);
        toast.error("Failed to delete idea. Please try again.");
      }
    });
  };

  return (
    <IdeasContext.Provider value={{ recentIdeas, isLoading, activeIdeaId, setActiveIdeaId, submitIdea, deleteIdea, createDraftIdea, updateIdea }}>
      {children}
    </IdeasContext.Provider>
  );
};
