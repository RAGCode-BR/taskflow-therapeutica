import { useMemo, useState, type ReactNode } from "react";
import { TaskTitleSearchContext } from "@/hooks/use-task-title-search";

export function TaskTitleSearchProvider({ children }: { children: ReactNode }) {
  const [titleQuery, setTitleQuery] = useState("");
  const value = useMemo(() => ({ titleQuery, setTitleQuery }), [titleQuery]);

  return (
    <TaskTitleSearchContext.Provider value={value}>{children}</TaskTitleSearchContext.Provider>
  );
}
