import { useEffect, useRef, useState } from "react";

interface MermaidDiagramProps {
  chart: string;
}

const MermaidDiagram = ({ chart }: MermaidDiagramProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const renderChart = async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          themeVariables: {
            primaryColor: "hsl(200, 65%, 90%)",
            primaryTextColor: "hsl(210, 30%, 15%)",
            primaryBorderColor: "hsl(200, 65%, 28%)",
            lineColor: "hsl(30, 90%, 55%)",
            secondaryColor: "hsl(210, 20%, 94%)",
            tertiaryColor: "hsl(0, 0%, 98%)",
            background: "hsl(0, 0%, 100%)",
            mainBkg: "hsl(200, 65%, 95%)",
            nodeBorder: "hsl(200, 65%, 28%)",
            titleColor: "hsl(210, 30%, 15%)",
          },
          flowchart: { curve: "basis" },
        });

        const id = `mermaid-${Date.now()}`;
        const { svg: renderedSvg } = await mermaid.render(id, chart);
        if (!cancelled) {
          setSvg(renderedSvg);
          setLoaded(true);
        }
      } catch (err) {
        console.error("Mermaid render error:", err);
      }
    };

    renderChart();
    return () => { cancelled = true; };
  }, [chart]);

  if (!loaded) {
    return (
      <div className="spark-card p-8 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Rendering diagram...</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="spark-card p-6 overflow-x-auto [&_svg]:max-w-full [&_svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default MermaidDiagram;
