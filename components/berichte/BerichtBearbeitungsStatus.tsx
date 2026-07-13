"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type BerichtOperation = "generieren" | "speichern" | "finalisieren";

interface BerichtBearbeitungsStatusWert {
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
  operation: BerichtOperation | null;
  beginneOperation: (operation: BerichtOperation) => boolean;
  beendeOperation: (operation: BerichtOperation) => void;
  version: string;
  setVersion: (version: string) => void;
}

const BerichtBearbeitungsStatusContext =
  createContext<BerichtBearbeitungsStatusWert | null>(null);

export function BerichtBearbeitungsStatusProvider({
  initialVersion,
  children,
}: {
  initialVersion: string;
  children: ReactNode;
}) {
  const [dirty, setDirty] = useState(false);
  const [operation, setOperation] = useState<BerichtOperation | null>(null);
  const [version, setVersion] = useState(initialVersion);
  const operationRef = useRef<BerichtOperation | null>(null);

  const beginneOperation = useCallback((naechsteOperation: BerichtOperation) => {
    if (operationRef.current !== null) return false;
    operationRef.current = naechsteOperation;
    setOperation(naechsteOperation);
    return true;
  }, []);

  const beendeOperation = useCallback((beendeteOperation: BerichtOperation) => {
    if (operationRef.current !== beendeteOperation) return;
    operationRef.current = null;
    setOperation(null);
  }, []);

  return (
    <BerichtBearbeitungsStatusContext.Provider
      value={{
        dirty,
        setDirty,
        operation,
        beginneOperation,
        beendeOperation,
        version,
        setVersion,
      }}
    >
      {children}
    </BerichtBearbeitungsStatusContext.Provider>
  );
}

export function useBerichtBearbeitungsStatus() {
  const context = useContext(BerichtBearbeitungsStatusContext);
  if (!context) {
    throw new Error("BerichtBearbeitungsStatusProvider fehlt.");
  }
  return context;
}
