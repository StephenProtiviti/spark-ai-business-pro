interface NexusScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

const NexusScoreBadge = ({ score, size = "md" }: NexusScoreBadgeProps) => {
  const getColor = () => {
    if (score >= 80) return "text-primary border-primary";
    if (score >= 60) return "text-secondary border-secondary";
    return "text-muted-foreground border-muted-foreground";
  };

  const sizeClasses = {
    sm: "w-10 h-10 text-sm",
    md: "w-14 h-14 text-lg",
    lg: "w-20 h-20 text-2xl",
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full border-2 flex items-center justify-center font-bold ${getColor()}`}
    >
      {score}
    </div>
  );
};

export default NexusScoreBadge;
