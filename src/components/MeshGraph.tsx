// Dynamic SVG mesh graph used by the simulator page.
// Automatically scales to fit any number of nodes.

interface Node {
  id: string;
  name: string;
  x: number;
  y: number;
  inRange: string[]; // ids in range
}

interface Props {
  nodes: Node[];
  hopHighlights?: { from: string; to: string }[];
  recentMessages?: Record<string, { length: number }>;
}

export function MeshGraph({
  nodes,
  hopHighlights = [],
  recentMessages = {},
}: Props) {
  const W = 700;
  const H = 320;
  const positions = Object.fromEntries(
    nodes.map((n) => [n.id, { x: n.x, y: n.y }]),
  );
  const edges: { from: string; to: string; key: string }[] = [];
  const seen = new Set<string>();
  nodes.forEach((n) => {
    n.inRange.forEach((other) => {
      const key = [n.id, other].sort().join("-");
      if (!seen.has(key) && positions[other]) {
        seen.add(key);
        edges.push({ from: n.id, to: other, key });
      }
    });
  });
  const isHighlighted = (a: string, b: string) =>
    hopHighlights.some(
      (h) => (h.from === a && h.to === b) || (h.from === b && h.to === a),
    );

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-72 w-full rounded-2xl border border-border glass-panel"
    >
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter
          id="glow-heavy"
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {edges.map((e) => {
        const a = positions[e.from];
        const b = positions[e.to];
        const hot = isHighlighted(e.from, e.to);
        return (
          <g key={e.key}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={hot ? "var(--signal)" : "var(--color-border)"}
              strokeWidth={hot ? 4 : 2}
              strokeDasharray={hot ? "0" : "6 6"}
              filter={hot ? "url(#glow)" : "none"}
              className={
                hot
                  ? "transition-all duration-300"
                  : "transition-all duration-1000"
              }
            />
            {hot && (
              <circle r="4" fill="var(--general)" filter="url(#glow-heavy)">
                <animateMotion
                  dur="0.8s"
                  repeatCount="indefinite"
                  path={`M ${a.x},${a.y} L ${b.x},${b.y}`}
                />
              </circle>
            )}
          </g>
        );
      })}
      {nodes.map((n) => {
        const count = recentMessages[n.id]?.length ?? 0;
        const r = nodes.length <= 4 ? 28 : nodes.length <= 8 ? 22 : 16;
        const rOuter = r + 4;
        const fontSize = nodes.length <= 4 ? 16 : nodes.length <= 8 ? 13 : 10;
        return (
          <g key={n.id} transform={`translate(${n.x},${n.y})`}>
            <circle
              r={rOuter}
              fill="var(--card)"
              stroke="var(--signal)"
              strokeWidth={2.5}
              filter="url(#glow)"
            />
            <circle r={r} fill="var(--background)" />
            <text
              y={fontSize / 3}
              textAnchor="middle"
              fontFamily="JetBrains Mono, monospace"
              fontSize={fontSize}
              fill="var(--signal)"
              fontWeight={800}
            >
              {n.name}
            </text>
            <text
              y={rOuter + 16}
              textAnchor="middle"
              fontFamily="JetBrains Mono, monospace"
              fontSize={10}
              fill="var(--muted-foreground)"
              fontWeight={600}
            >
              {count} msg
            </text>
          </g>
        );
      })}
    </svg>
  );
}
