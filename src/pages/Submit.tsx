import { useParams, useSearchParams } from "react-router-dom";
import ChatInterface from "@/components/ChatInterface";
import { useIdeas } from "@/contexts/IdeasContext";

const Submit = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { recentIdeas } = useIdeas();

  const viewingIdea = id ? recentIdeas.find((i) => i.id === id) ?? null : null;
  const mode = searchParams.get("mode") === "support" ? "support" : "idea";

  return (
    <div className="pt-14 h-screen overflow-hidden">
      <ChatInterface viewingIdea={viewingIdea} mode={mode} />
    </div>
  );
};

export default Submit;
