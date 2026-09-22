import { Button } from "@/components/ui/button";
import { useTaskStatuses } from "@/hooks/use-data";
import { Circle, Zap, CheckCircle2 } from "lucide-react";

interface Props {
  value: string[];
  onChange: (statusIds: string[]) => void;
}

export function StatusFilterBar({ value, onChange }: Props) {
  const { data: statuses = [] } = useTaskStatuses();
  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        key="all"
        size="sm"
        variant={value.length === 0 ? "default" : "outline"}
        onClick={() => onChange([])}
        className="h-8"
      >
        <Circle className="mr-1.5 h-3.5 w-3.5" />
        Todos status
      </Button>
      {statuses.map((s) => {
        const active = value.includes(s.id);
        return (
          <Button
            key={s.id}
            size="sm"
            variant={active ? "default" : "outline"}
            onClick={() => toggle(s.id)}
            className="h-8"
            style={
              active
                ? { background: s.color, borderColor: s.color, color: "#fff" }
                : { borderColor: s.color, color: s.color }
            }
          >
            {s.is_active ? (
              <Zap className="mr-1.5 h-3.5 w-3.5" />
            ) : s.is_completed ? (
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <Circle className="mr-1.5 h-3.5 w-3.5" />
            )}
            {s.name}
          </Button>
        );
      })}
    </div>
  );
}
