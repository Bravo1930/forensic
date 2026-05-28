import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Calendar,
  Clock,
  MapPin,
  Search,
  User,
} from "lucide-react";
import { useMemo, useState } from "react";

interface TimelineEvent {
  id?: string;
  date: string;
  title: string;
  description: string;
  type: string;
  evidenceRef?: string;
  evidenceId?: number;
  persons?: string[];
  locations?: string[];
  relevance?: "alta" | "media" | "baja";
  significance?: "alta" | "media" | "baja";
}

interface TimelineViewProps {
  events: TimelineEvent[];
}

const typeConfig: Record<string, { label: string; color: string; bg: string }> =
  {
    comunicacion: {
      label: "Comunicación",
      color: "text-blue-400",
      bg: "bg-blue-900/20 border-blue-800/50",
    },
    acceso: {
      label: "Acceso",
      color: "text-yellow-400",
      bg: "bg-yellow-900/20 border-yellow-800/50",
    },
    modificacion: {
      label: "Modificación",
      color: "text-orange-400",
      bg: "bg-orange-900/20 border-orange-800/50",
    },
    eliminacion: {
      label: "Eliminación",
      color: "text-red-400",
      bg: "bg-red-900/20 border-red-800/50",
    },
    creacion: {
      label: "Creación",
      color: "text-green-400",
      bg: "bg-green-900/20 border-green-800/50",
    },
    transaccion: {
      label: "Transacción",
      color: "text-purple-400",
      bg: "bg-purple-900/20 border-purple-800/50",
    },
    ubicacion: {
      label: "Ubicación",
      color: "text-cyan-400",
      bg: "bg-cyan-900/20 border-cyan-800/50",
    },
    evento: {
      label: "Evento",
      color: "text-muted-foreground",
      bg: "bg-muted/20 border-border",
    },
  };

const relevanceConfig = {
  alta: { label: "Alta", className: "severity-alta" },
  media: { label: "Media", className: "severity-media" },
  baja: { label: "Baja", className: "severity-baja" },
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export default function TimelineView({ events }: TimelineViewProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [relevanceFilter, setRelevanceFilter] = useState("todos");

  const filtered = useMemo(() => {
    return events
      .filter(e => {
        const relevance = e.relevance ?? e.significance ?? "media";
        const matchSearch =
          !search ||
          e.title.toLowerCase().includes(search.toLowerCase()) ||
          e.description.toLowerCase().includes(search.toLowerCase()) ||
          (e.persons ?? []).some(p =>
            p.toLowerCase().includes(search.toLowerCase())
          );
        const matchType = typeFilter === "todos" || e.type === typeFilter;
        const matchRelevance =
          relevanceFilter === "todos" || relevance === relevanceFilter;
        return matchSearch && matchType && matchRelevance;
      })
      .sort((a, b) => {
        try {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        } catch {
          return 0;
        }
      });
  }, [events, search, typeFilter, relevanceFilter]);

  const types = Array.from(new Set(events.map(e => e.type)));

  if (events.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-12 text-center">
          <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            No hay eventos en el timeline
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Timeline de Eventos ({filtered.length} de {events.length})
        </CardTitle>
        <div className="flex gap-2 flex-wrap mt-2">
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar eventos..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-background border-border"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36 h-8 text-xs bg-background border-border">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              {types.map(t => (
                <SelectItem key={t} value={t}>
                  {typeConfig[t]?.label ?? t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={relevanceFilter} onValueChange={setRelevanceFilter}>
            <SelectTrigger className="w-36 h-8 text-xs bg-background border-border">
              <SelectValue placeholder="Relevancia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Toda relevancia</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Media</SelectItem>
              <SelectItem value="baja">Baja</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4 pl-10">
            {filtered.map((event, idx) => {
              const relevance =
                event.relevance ?? event.significance ?? "media";
              const typeCfg = typeConfig[event.type] ?? typeConfig.evento;
              const relevanceCfg =
                relevanceConfig[relevance as keyof typeof relevanceConfig];

              return (
                <div key={event.id ?? idx} className="relative">
                  {/* Timeline dot */}
                  <div
                    className={`absolute -left-[2.35rem] top-3 w-3 h-3 rounded-full border-2 border-background ${
                      relevance === "alta"
                        ? "bg-primary"
                        : relevance === "media"
                          ? "bg-yellow-500"
                          : "bg-muted-foreground"
                    }`}
                  />

                  <div className="p-3 bg-background rounded-lg border border-border hover:border-primary/20 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-medium">{event.title}</h4>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 h-4 ${typeCfg.bg} ${typeCfg.color} border`}
                        >
                          {typeCfg.label}
                        </Badge>
                        {relevance === "alta" && (
                          <AlertTriangle className="w-3.5 h-3.5 text-primary" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatDate(event.date)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {event.description}
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                      {event.persons && event.persons.length > 0 && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {event.persons.join(", ")}
                          </span>
                        </div>
                      )}
                      {event.locations && event.locations.length > 0 && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {event.locations.join(", ")}
                          </span>
                        </div>
                      )}
                      {event.evidenceRef && (
                        <span className="text-xs text-primary/70">
                          Ref: {event.evidenceRef}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
