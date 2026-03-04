import { useState } from "react";
import { Plus, Lightbulb, Trash2, Pencil, Check, X, Loader2 } from "lucide-react";
import { useIdeas } from "@/contexts/IdeasContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SparkSidebarProps {
  onNewIdea: () => void;
}

const SparkSidebar = ({ onNewIdea }: SparkSidebarProps) => {
  const { recentIdeas, isLoading, activeIdeaId, setActiveIdeaId, deleteIdea, updateIdea } = useIdeas();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const startRename = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditValue(currentTitle);
  };

  const confirmRename = (id: string) => {
    if (editValue.trim()) {
      updateIdea(id, { title: editValue.trim() });
    }
    setEditingId(null);
  };

  const cancelRename = () => {
    setEditingId(null);
  };

  const handleDelete = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    setDeleteTarget({ id, title });
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteIdea(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <aside className="w-64 h-[calc(100vh-3.5rem)] sticky top-14 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
      {/* New Idea */}
      <div className="p-4 border-b border-sidebar-border">
        <button
          onClick={onNewIdea}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-white text-sm font-semibold hover:bg-secondary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Idea</span>
        </button>
      </div>

      {/* Recent Ideas */}
      <div className="flex-1 p-4 overflow-y-auto">
        <p className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60 mb-3">
          Recent Ideas
        </p>
        <div className="space-y-1">
          {isLoading ? (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-sidebar-foreground/40">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading ideas...
            </div>
          ) : recentIdeas.length === 0 ? (
            <p className="text-xs text-sidebar-foreground/40 px-3 py-2">No ideas submitted yet</p>
          ) : null}
          {recentIdeas.map((idea) => (
            <div
              key={idea.id}
              onClick={() => {
                if (editingId !== idea.id) setActiveIdeaId(idea.id);
              }}
              className={`flex items-center justify-between px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer group ${
                activeIdeaId === idea.id ? "bg-sidebar-accent" : ""
              }`}
            >
              {editingId === idea.id ? (
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") confirmRename(idea.id);
                      if (e.key === "Escape") cancelRename();
                    }}
                    autoFocus
                    className="flex-1 min-w-0 text-sm bg-sidebar-accent border border-sidebar-border rounded px-1 py-0.5 outline-none text-sidebar-foreground"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button onClick={(e) => { e.stopPropagation(); confirmRename(idea.id); }} className="p-0.5 text-accent hover:text-accent/80">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); cancelRename(); }} className="p-0.5 text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 min-w-0">
                    <Lightbulb className="w-4 h-4 shrink-0 text-sidebar-foreground/50" />
                    <span className="text-sm truncate">{idea.title}</span>
                  </div>
                  <div className="hidden group-hover:flex items-center gap-0.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); startRename(idea.id, idea.title); }}
                      className="p-1 rounded hover:bg-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
                      title="Rename"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, idea.id, idea.title)}
                      className="p-1 rounded hover:bg-destructive/20 text-sidebar-foreground/50 hover:text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Idea</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
};

export default SparkSidebar;
