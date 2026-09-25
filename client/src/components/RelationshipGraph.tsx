import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network, User, File, MapPin, Calendar } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";

gsap.registerPlugin(Flip);

interface GraphNode {
  id: string;
  label: string;
  type:
    | "persona"
    | "archivo"
    | "ubicacion"
    | "evento"
    | "dispositivo"
    | "entidad";
  description?: string;
  relevance?: "alta" | "media" | "baja";
}

interface GraphEdge {
  source: string;
  target: string;
  label?: string;
  type?: string;
}

interface RelationshipGraphProps {
  graph: {
    nodes: unknown[];
    edges: unknown[];
  };
}

const nodeTypeConfig: Record<
  string,
  { icon: React.ElementType; color: string; bg: string }
> = {
  persona: { icon: User, color: "#ef4444", bg: "#7f1d1d" },
  archivo: { icon: File, color: "#3b82f6", bg: "#1e3a5f" },
  ubicacion: { icon: MapPin, color: "#22c55e", bg: "#14532d" },
  evento: { icon: Calendar, color: "#f59e0b", bg: "#451a03" },
  dispositivo: { icon: Network, color: "#a855f7", bg: "#3b0764" },
  entidad: { icon: Network, color: "#06b6d4", bg: "#083344" },
};

function NodeCard({ node }: { node: GraphNode }) {
  const cfg = nodeTypeConfig[node.type] ?? nodeTypeConfig.entidad;
  const Icon = cfg.icon;
  return (
    <div
      className="flex items-start gap-2 p-3 rounded-lg border transition-colors hover:border-primary/30"
      style={{ borderColor: cfg.color + "40", backgroundColor: cfg.bg + "20" }}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: cfg.bg }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{node.label}</p>
          {node.relevance === "alta" && (
            <span className="text-[10px] px-1.5 py-0 rounded-full severity-alta">
              Alta
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground capitalize">{node.type}</p>
        {node.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {node.description}
          </p>
        )}
      </div>
    </div>
  );
}

export default function RelationshipGraph({ graph }: RelationshipGraphProps) {
  const nodes = (graph.nodes as GraphNode[]) ?? [];
  const edges = (graph.edges as GraphEdge[]) ?? [];

  const nodesByType = nodes.reduce(
    (acc, node) => {
      const type = node.type ?? "entidad";
      if (!acc[type]) acc[type] = [];
      acc[type].push(node);
      return acc;
    },
    {} as Record<string, GraphNode[]>
  );

  if (nodes.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-12 text-center">
          <Network className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            No se identificaron relaciones
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-primary">{nodes.length}</div>
            <div className="text-xs text-muted-foreground">Entidades</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-blue-400">
              {edges.length}
            </div>
            <div className="text-xs text-muted-foreground">Conexiones</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-red-400">
              {nodes.filter(n => n.relevance === "alta").length}
            </div>
            <div className="text-xs text-muted-foreground">Alta relevancia</div>
          </CardContent>
        </Card>
      </div>

      {/* Visual graph representation */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Network className="w-4 h-4 text-primary" />
            Mapa de Relaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* SVG graph */}
          <GraphSVG nodes={nodes} edges={edges} />
        </CardContent>
      </Card>

      {/* Nodes by type */}
      {Object.entries(nodesByType).map(([type, typeNodes]) => (
        <Card key={type} className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-widest capitalize">
              {type}s ({typeNodes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-2">
              {typeNodes.map(node => (
                <NodeCard key={node.id} node={node} />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Connections list */}
      {edges.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Conexiones ({edges.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {edges.map((edge, i) => {
                const sourceNode = nodes.find(n => n.id === edge.source);
                const targetNode = nodes.find(n => n.id === edge.target);
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-background rounded border border-border"
                  >
                    <span className="font-medium text-foreground truncate max-w-[120px]">
                      {sourceNode?.label ?? edge.source}
                    </span>
                    <span className="shrink-0 text-primary">→</span>
                    {edge.label && (
                      <span className="text-muted-foreground italic shrink-0">
                        {edge.label}
                      </span>
                    )}
                    <span className="shrink-0 text-primary">→</span>
                    <span className="font-medium text-foreground truncate max-w-[120px]">
                      {targetNode?.label ?? edge.target}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function GraphSVG({
  nodes,
  edges,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [positions, setPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const prevNodesRef = useRef<GraphNode[]>([]);

  // Zoom/Pan state
  let isPanning = false;
  let startPoint = { x: 0, y: 0 };

  useEffect(() => {
    if (!gRef.current) return;
    gRef.current.setAttribute(
      "transform",
      `translate(${transform.x}, ${transform.y}) scale(${transform.scale})`
    );
  }, [transform]);

  useEffect(() => {
    prevNodesRef.current = nodes;
  }, [nodes]);

  // Node enter animation (fade in + scale up)
  useEffect(() => {
    const addedNodes = nodes.filter(
      n => !prevNodesRef.current.some(p => p.id === n.id)
    );

    addedNodes.forEach(node => {
      const nodeEl = document.querySelector(`[data-node-id="${node.id}"]`);
      if (nodeEl) {
        gsap.fromTo(
          nodeEl,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.5, ease: "power2.out" }
        );
      }
    });
  }, [nodes, prevNodesRef.current]);

  // Zoom/Pan event handlers
  const handleMouseDown = (e: React.MouseEvent<SVGGElement>) => {
    isPanning = true;
    startPoint = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGGElement>) => {
    if (!isPanning) return;
    const dx = e.clientX - startPoint.x;
    const dy = e.clientY - startPoint.y;
    const newTransform = {
      x: transform.x + dx,
      y: transform.y + dy,
      scale: transform.scale
    };
    animateTransform(newTransform);
    startPoint = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isPanning = false;
  };

  const handleWheel = (e: React.WheelEvent<SVGGElement>) => {
    e.preventDefault();
    const zoomSpeed = 0.001;
    const zoomDelta = e.deltaY * zoomSpeed;
    const newScale = Math.min(
      Math.max(transform.scale - zoomDelta, 0.5),
      3
    );
    // We want to zoom towards the mouse point
    const rect = gRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    // Convert mouse point to svg coordinates
    const svgPoint = svgRef.current?.createSVGPoint();
    if (!svgPoint) return;
    svgPoint.x = mouseX;
    svgPoint.y = mouseY;
    const svgPointInverted = svgPoint.matrixTransform(
      svgRef.current?.getScreenCTM()?.inverse()
    );
    if (!svgPointInverted) return;
    // Calculate the new translate to keep the mouse point fixed
    const newX =
      transform.x +
      (mouseX / transform.scale - mouseX / newScale);
    const newY =
      transform.y +
      (mouseY / transform.scale - mouseY / newScale);
    animateTransform({
      x: newX,
      y: newY,
      scale: newScale
    });
  };

  function animateTransform(to: { x: number; y: number; scale: number }) {
    gsap.to(transform, {
      ...to,
      duration: 0.5,
      ease: "power2.out",
      onUpdate: () => {
        setTransform({ ...transform });
      }
    });
  }

  useEffect(() => {
    if (nodes.length === 0) return;
    const width = 600;
    const height = 300;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    const pos: Record<string, { x: number; y: number }> = {};
    if (nodes.length === 1) {
      pos[nodes[0].id] = { x: centerX, y: centerY };
    } else {
      nodes.forEach((node, i) => {
        const angle = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
        pos[node.id] = {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        };
      });
    }
    setPositions(pos);
  }, [nodes]);

  if (nodes.length === 0) return null;

  const width = 600;
  const height = 300;

  return (
    <div className="overflow-x-auto">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-h-64 bg-background rounded-lg border border-border"
        onWheel={handleWheel}
      >
        <g
          ref={gRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ cursor: "grab" }}
          onMouseLeave={handleMouseUp}
        >
          {/* Edges */}
          {edges.map((edge, i) => {
            const src = positions[edge.source];
            const tgt = positions[edge.target];
            if (!src || !tgt) return null;
            return (
              <g key={i}>
                <line
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke="oklch(0.25 0 0)"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
                {edge.label && (
                  <text
                    x={(src.x + tgt.x) / 2}
                    y={(src.y + tgt.y) / 2 - 4}
                    fill="oklch(0.55 0 0)"
                    fontSize="9"
                    textAnchor="middle"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map(node => {
            const pos = positions[node.id];
            if (!pos) return null;
            const cfg = nodeTypeConfig[node.type] ?? nodeTypeConfig.entidad;
            const isHighRelevance = node.relevance === "alta";

            return (
              <g
                key={node.id}
                data-node-id={node.id}
                className="node"
              >
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isHighRelevance ? 18 : 14}
                  fill={cfg.bg}
                  stroke={isHighRelevance ? cfg.color : cfg.color + "80"}
                  strokeWidth={isHighRelevance ? 2 : 1}
                />
                <text
                  x={pos.x}
                  y={pos.y + 4}
                  fill={cfg.color}
                  fontSize="10"
                  textAnchor="middle"
                  fontWeight="500"
                >
                  {node.label.slice(0, 8)}
                </text>
                <text
                  x={pos.x}
                  y={pos.y + (isHighRelevance ? 28 : 24)}
                  fill="oklch(0.55 0 0)"
                  fontSize="8"
                  textAnchor="middle"
                >
                  {node.label.length > 12
                    ? node.label.slice(0, 12) + "&#x2026;"
                    : node.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
