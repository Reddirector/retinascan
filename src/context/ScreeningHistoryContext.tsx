import { createContext, useContext, useMemo, useState } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ScreeningResult {
  id: number;
  filename: string;
  matchedKey: string;
  drStage: number;
  drLabel: string;
  referable: boolean;
  confidence: number;
  gradcamImage: string;
  explanation: string;
  completedAt: number;
}

interface ScreeningHistoryValue {
  history: ScreeningResult[];
  addResult: (result: Omit<ScreeningResult, "id" | "completedAt">) => void;
}

const ScreeningHistoryContext = createContext<ScreeningHistoryValue | null>(
  null,
);

export function ScreeningHistoryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [history, setHistory] = useState<ScreeningResult[]>([]);

  const value = useMemo<ScreeningHistoryValue>(
    () => ({
      history,
      addResult: (result) => {
        setHistory((prev) => [
          { ...result, id: prev.length + 1, completedAt: Date.now() },
          ...prev,
        ]);
      },
    }),
    [history],
  );

  return (
    <ScreeningHistoryContext.Provider value={value}>
      {children}
    </ScreeningHistoryContext.Provider>
  );
}

export function useScreeningHistory(): ScreeningHistoryValue {
  const ctx = useContext(ScreeningHistoryContext);
  if (!ctx) {
    throw new Error(
      "useScreeningHistory must be used within ScreeningHistoryProvider",
    );
  }
  return ctx;
}
