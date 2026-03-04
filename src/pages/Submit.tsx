import { useParams } from "react-router-dom";
import ChatInterface from "@/components/ChatInterface";
import { useIdeas } from "@/contexts/IdeasContext";

const Submit = () => {
  const { id } = useParams();
  const { recentIdeas } = useIdeas();

  const viewingIdea = id ? recentIdeas.find((i) => i.id === id) ?? null : null;

  return (
    <div className="pt-14 h-screen overflow-hidden">
      <ChatInterface viewingIdea={viewingIdea} />
    </div>
  );
};

export default Submit;
