"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

export interface FinalisierungVorbereitung {
  ok: boolean;
  error?: string;
}

type FinalisierungVorbereiten = () => Promise<FinalisierungVorbereitung>;

interface BerichtFinalisierungContextValue {
  registriereVorbereitung: (
    vorbereiten: FinalisierungVorbereiten,
  ) => () => void;
  vorFinalisierungVorbereiten: () => Promise<FinalisierungVorbereitung>;
}

const BerichtFinalisierungContext =
  createContext<BerichtFinalisierungContextValue | null>(null);

// Der Texteditor und der Finalisieren-Button liegen in der Detailseite weit
// auseinander. Dieser kleine Kontext stellt sicher, dass der Button vor dem
// Sperren des Berichts immer den aktuellen Editor-Zustand abfragt.
export function BerichtFinalisierungProvider({
  children,
}: {
  children: ReactNode;
}) {
  const vorbereitenRef = useRef<FinalisierungVorbereiten | null>(null);

  const registriereVorbereitung = useCallback(
    (vorbereiten: FinalisierungVorbereiten) => {
      vorbereitenRef.current = vorbereiten;
      return () => {
        if (vorbereitenRef.current === vorbereiten) {
          vorbereitenRef.current = null;
        }
      };
    },
    [],
  );

  const vorFinalisierungVorbereiten = useCallback(async () => {
    if (!vorbereitenRef.current) return { ok: true };
    return vorbereitenRef.current();
  }, []);

  const value = useMemo(
    () => ({ registriereVorbereitung, vorFinalisierungVorbereiten }),
    [registriereVorbereitung, vorFinalisierungVorbereiten],
  );

  return (
    <BerichtFinalisierungContext.Provider value={value}>
      {children}
    </BerichtFinalisierungContext.Provider>
  );
}

export function useBerichtFinalisierung() {
  const context = useContext(BerichtFinalisierungContext);
  if (!context) {
    throw new Error(
      "useBerichtFinalisierung muss innerhalb des BerichtFinalisierungProvider verwendet werden.",
    );
  }
  return context;
}
