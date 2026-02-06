import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ToolProgress {
  current: number;
  total: number;
}

interface ToolInfo {
  title?: string;
  version?: string;
}

interface ToolContextType {
  progress: ToolProgress | null;
  setProgress: (progress: ToolProgress | null) => void;
  toolInfo: ToolInfo | null;
  setToolInfo: (info: ToolInfo | null) => void;
  headerActions: ReactNode | null;
  setHeaderActions: (actions: ReactNode | null) => void;
  centerActions: ReactNode | null;
  setCenterActions: (actions: ReactNode | null) => void;
  etTime: string | null;
  setEtTime: (time: string | null) => void;
  highlightItem: number | null;
  setHighlightItem: (id: number | null) => void;
}

const ToolContext = createContext<ToolContextType | undefined>(undefined);

export const ToolProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [progress, setProgress] = useState<ToolProgress | null>(null);
  const [toolInfo, setToolInfo] = useState<ToolInfo | null>(null);
  const [headerActions, setHeaderActions] = useState<ReactNode | null>(null);
  const [centerActions, setCenterActions] = useState<ReactNode | null>(null);
  const [etTime, setEtTime] = useState<string | null>(null);
  const [highlightItem, setHighlightItem] = useState<number | null>(null);

  return (
    <ToolContext.Provider value={{ 
      progress, setProgress, 
      toolInfo, setToolInfo,
      headerActions, setHeaderActions,
      centerActions, setCenterActions,
      etTime, setEtTime,
      highlightItem, setHighlightItem
    }}>
      {children}
    </ToolContext.Provider>
  );
};

export const useTool = () => {
  const context = useContext(ToolContext);
  if (!context) throw new Error('useTool must be used within a ToolProvider');
  return context;
};