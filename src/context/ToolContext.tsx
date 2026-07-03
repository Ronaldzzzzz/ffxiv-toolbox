import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ToolProgress {
  current: number;
  total: number;
  currentPrimary?: number;
  currentSecondary?: number;
  totalPrimary?: number;
  totalSecondary?: number;
  currentMining?: number;
  currentQuarrying?: number;
  totalMining?: number;
  totalQuarrying?: number;
  currentLogging?: number;
  currentHarvesting?: number;
  totalLogging?: number;
  totalHarvesting?: number;
}

interface ToolInfo {
  title?: string;
  version?: string;
}

export interface MapModalData {
  isOpen: boolean;
  mapId: number;
  x: number;
  y: number;
  itemName?: string;
  type?: number;
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
  mapModal: MapModalData;
  setMapModal: (data: MapModalData) => void;
}

const ToolContext = createContext<ToolContextType | undefined>(undefined);

export const ToolProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [progress, setProgress] = useState<ToolProgress | null>(null);
  const [toolInfo, setToolInfo] = useState<ToolInfo | null>(null);
  const [headerActions, setHeaderActions] = useState<ReactNode | null>(null);
  const [centerActions, setCenterActions] = useState<ReactNode | null>(null);
  const [etTime, setEtTime] = useState<string | null>(null);
  const [highlightItem, setHighlightItem] = useState<number | null>(null);
  const [mapModal, setMapModal] = useState<MapModalData>({ isOpen: false, mapId: 0, x: 0, y: 0 });

  return (
    <ToolContext.Provider value={{
      progress, setProgress,
      toolInfo, setToolInfo,
      headerActions, setHeaderActions,
      centerActions, setCenterActions,
      etTime, setEtTime,
      highlightItem, setHighlightItem,
      mapModal, setMapModal
    }}>
      {children}
    </ToolContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components -- provider + hook co-located by design; splitting is out of scope
export const useTool = () => {
  const context = useContext(ToolContext);
  if (!context) throw new Error('useTool must be used within a ToolProvider');
  return context;
};