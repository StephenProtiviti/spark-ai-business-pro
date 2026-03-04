import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { Idea } from "@/data/mockIdeas";

interface FeasibilityMatrixProps {
  ideas: Idea[];
  highlightId?: string;
}

const FeasibilityMatrix = ({ ideas, highlightId }: FeasibilityMatrixProps) => {
  const data = ideas.map((idea) => ({
    x: idea.effortScore,
    y: idea.impactScore,
    name: idea.title,
    id: idea.id,
    score: idea.nexusScore,
  }));

  return (
    <div className="spark-card p-6">
      <h3 className="font-semibold text-foreground mb-1">Feasibility Matrix</h3>
      <p className="text-xs text-muted-foreground mb-4">Impact vs. Effort — top-left quadrant = sweet spot</p>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 20%, 88%)" />
          <XAxis
            type="number"
            dataKey="x"
            name="Effort"
            domain={[0, 100]}
            tick={{ fill: "hsl(210, 15%, 50%)", fontSize: 11 }}
            label={{ value: "Effort →", position: "bottom", fill: "hsl(210, 15%, 50%)", fontSize: 11 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Impact"
            domain={[0, 100]}
            tick={{ fill: "hsl(210, 15%, 50%)", fontSize: 11 }}
            label={{ value: "Impact →", angle: -90, position: "left", fill: "hsl(210, 15%, 50%)", fontSize: 11 }}
          />
          <Tooltip
            content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="spark-card p-3 text-xs">
                  <p className="font-semibold text-foreground">{d.name}</p>
                  <p className="text-muted-foreground">Impact: {d.y} · Effort: {d.x}</p>
                  <p className="text-primary font-bold">Score: {d.score}</p>
                </div>
              );
            }}
          />
          <Scatter data={data}>
            {data.map((entry) => (
              <Cell
                key={entry.id}
                fill={entry.id === highlightId ? "hsl(200, 65%, 28%)" : "hsl(30, 90%, 55%)"}
                r={entry.id === highlightId ? 10 : 7}
                stroke={entry.id === highlightId ? "hsl(200, 65%, 38%)" : "none"}
                strokeWidth={2}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-2">
        <span>🎯 Sweet Spot (Low Effort, High Impact)</span>
        <span>⚠️ Moonshots (High Effort, High Impact)</span>
      </div>
    </div>
  );
};

export default FeasibilityMatrix;
