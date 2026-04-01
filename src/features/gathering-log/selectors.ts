import { GatherType, GatheringData, GatheringItemEntry } from './types';
import { calculateNodeStatus, NodeStatus } from './utils';

export interface CollectableBand {
  min: number;
  max: number;
  label: string;
  items: GatheringItemEntry[];
}

export interface TimedNodeWithStatus {
  id: string;
  map: number;
  x: number;
  y: number;
  level: number;
  type: number;
  items: number[];
  hiddenItems?: number[];
  spawns?: number[];
  duration?: number;
  limited?: number;
  folklore?: number;
  zoneid?: number;
  statusInfo: NodeStatus;
}

export interface TimedNodesGrouped {
  activeNodes: TimedNodeWithStatus[];
  soonNodes: TimedNodeWithStatus[];
  laterNodes: TimedNodeWithStatus[];
}

const TYPE_TO_NODE_INDEX: Record<GatherType, number> = {
  mining: 0,
  quarrying: 1,
  logging: 2,
  harvesting: 3,
};

const COLLECTABLE_LEVEL_BANDS = [
  { min: 50, max: 70, label: 'Lv.50-70' },
  { min: 71, max: 80, label: 'Lv.71-80' },
  { min: 81, max: 90, label: 'Lv.81-90' },
  { min: 91, max: 100, label: 'Lv.91-100' },
];

export function getCollectableBands(data: GatheringData, currentType: GatherType): CollectableBand[] {
  const nodeType = TYPE_TO_NODE_INDEX[currentType];
  const seen = new Set<number>();
  const all: { itemId: number; lvl: number }[] = [];

  Object.values(data.nodes).forEach(node => {
    if (node.type !== nodeType || node.map === 0) return;

    [...node.items, ...(node.hiddenItems || [])].forEach(itemId => {
      if (seen.has(itemId)) return;
      if (data.items[itemId]?.collectibleType !== 'collection-only') return;

      seen.add(itemId);
      all.push({ itemId, lvl: node.level });
    });
  });

  return COLLECTABLE_LEVEL_BANDS
    .map(band => ({
      ...band,
      items: all
        .filter(entry => entry.lvl >= band.min && entry.lvl <= band.max)
        .map(entry => ({ itemId: entry.itemId, lvl: entry.lvl, ilvl: 0, stars: 0, hidden: 0 })),
    }))
    .filter(band => band.items.length > 0);
}

export function getTimedNodesGrouped(
  data: GatheringData,
  currentType: GatherType | 'all'
): TimedNodesGrouped {
  const targetIds = currentType === 'all'
    ? [0, 1, 2, 3]
    : [TYPE_TO_NODE_INDEX[currentType]];

  const nodesWithStatus = Object.values(data.nodes)
    .filter(node => (
      targetIds.includes(node.type) &&
      node.spawns &&
      node.spawns.length > 0 &&
      node.map !== 0
    ))
    .map(node => ({
      ...node,
      statusInfo: calculateNodeStatus(node.spawns!, node.duration || 60),
    }));

  const activeNodes = nodesWithStatus
    .filter(node => node.statusInfo.status === 'active')
    .sort((a, b) => a.statusInfo.secondsRemaining - b.statusInfo.secondsRemaining);

  const soonNodes = nodesWithStatus
    .filter(node => node.statusInfo.status === 'soon')
    .sort((a, b) => a.statusInfo.secondsUntil - b.statusInfo.secondsUntil);

  const laterNodes = nodesWithStatus
    .filter(node => node.statusInfo.status === 'later')
    .sort((a, b) => a.statusInfo.secondsUntil - b.statusInfo.secondsUntil);

  return {
    activeNodes,
    soonNodes,
    laterNodes,
  };
}

export function sortNodesForMapSidebar(nodes: Array<{ spawns?: number[]; duration?: number; level: number }>): number[] {
  return nodes
    .map((node, index) => {
      if (node.spawns && node.spawns.length > 0) {
        const statusInfo = calculateNodeStatus(node.spawns, node.duration || 60);

        if (statusInfo.status === 'active') {
          return { index, group: 0, value: statusInfo.secondsRemaining };
        }
        if (statusInfo.status === 'soon') {
          return { index, group: 1, value: statusInfo.secondsUntil };
        }
        return { index, group: 2, value: statusInfo.secondsUntil };
      }

      return { index, group: 3, value: node.level };
    })
    .sort((a, b) => {
      if (a.group !== b.group) return a.group - b.group;
      return a.value - b.value;
    })
    .map(entry => entry.index);
}
