import { createContext, useContext } from "react";

export type TaskTitleSearchContextValue = {
  titleQuery: string;
  setTitleQuery: (value: string) => void;
};

export const TaskTitleSearchContext = createContext<TaskTitleSearchContextValue | null>(null);

export function useTaskTitleSearch() {
  const context = useContext(TaskTitleSearchContext);
  if (!context) throw new Error("useTaskTitleSearch must be used inside TaskTitleSearchProvider");
  return context;
}
