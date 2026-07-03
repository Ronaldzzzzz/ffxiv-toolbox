import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCollectableBands, getTimedNodesGrouped, groupMapsByExpansion, sortNodesForMapSidebar } from './selectors';
import { GatheringData, NodeData } from './types';

// 4,200,000 real ms = one Eorzea day → system time pinned to ET 00:00
const REAL_MS_PER_EORZEA_DAY = 4_200_000;

function makeNode(overrides: Partial<NodeData> & { id: string }): NodeData {
  return {
    map: 1,
    x: 10,
    y: 10,
    level: 60,
    type: 0,
    items: [],
    ...overrides,
  };
}

function makeData(nodes: NodeData[], items: GatheringData['items'] = {}): GatheringData {
  const nodeMap: Record<string, NodeData> = {};
  nodes.forEach(node => { nodeMap[node.id] = node; });
  return { nodes: nodeMap, items } as unknown as GatheringData;
}

describe('getTimedNodesGrouped', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(REAL_MS_PER_EORZEA_DAY); // ET 00:00
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const data = makeData([
    makeNode({ id: 'active', spawns: [0], duration: 60, items: [1] }),
    makeNode({ id: 'soon', spawns: [1], duration: 60, items: [2] }),
    makeNode({ id: 'later', spawns: [12], duration: 60, items: [3] }),
    makeNode({ id: 'no-map', spawns: [0], duration: 60, map: 0, items: [4] }),
    makeNode({ id: 'untimed', items: [5] }),
    makeNode({ id: 'other-type', type: 2, spawns: [0], duration: 60, items: [6] }),
  ]);

  it('groups nodes into active / soon / later and skips untimed or unmapped nodes', () => {
    const result = getTimedNodesGrouped(data, 'all');
    expect(result.activeNodes.map(n => n.id)).toEqual(['active', 'other-type']);
    expect(result.soonNodes.map(n => n.id)).toEqual(['soon']);
    expect(result.laterNodes.map(n => n.id)).toEqual(['later']);
  });

  it('filters by gather type when not "all"', () => {
    const result = getTimedNodesGrouped(data, 'logging'); // node type 2
    expect(result.activeNodes.map(n => n.id)).toEqual(['other-type']);
    expect(result.soonNodes).toHaveLength(0);
    expect(result.laterNodes).toHaveLength(0);
  });

  it('attaches status info to each node', () => {
    const result = getTimedNodesGrouped(data, 'all');
    expect(result.activeNodes[0].statusInfo.status).toBe('active');
    expect(result.soonNodes[0].statusInfo.secondsUntil).toBe(175);
  });
});

describe('getCollectableBands', () => {
  const items = {
    100: { en: 'A', ja: 'A', tw: 'A', collectibleType: 'collection-only' },
    101: { en: 'B', ja: 'B', tw: 'B', collectibleType: 'general' },
    102: { en: 'C', ja: 'C', tw: 'C', collectibleType: 'collection-only' },
    103: { en: 'D', ja: 'D', tw: 'D', collectibleType: 'collection-only' },
  } as unknown as GatheringData['items'];

  const data = makeData([
    makeNode({ id: 'n1', level: 60, items: [100, 101] }),
    makeNode({ id: 'n2', level: 85, items: [102] }),
    makeNode({ id: 'n3', level: 45, items: [103] }), // below the lowest band
    makeNode({ id: 'n4', level: 60, type: 2, items: [100] }), // wrong gather type
  ], items);

  it('buckets collection-only items into level bands for the requested type', () => {
    const bands = getCollectableBands(data, 'mining');
    expect(bands.map(b => b.label)).toEqual(['Lv.50-70', 'Lv.81-90']);
    expect(bands[0].items.map(i => i.itemId)).toEqual([100]);
    expect(bands[1].items.map(i => i.itemId)).toEqual([102]);
  });

  it('returns no bands when no collectable items match', () => {
    expect(getCollectableBands(data, 'harvesting')).toEqual([]);
  });
});

describe('groupMapsByExpansion', () => {
  it('groups by expansion in release order, then by ascending region id', () => {
    const maps = [
      { id: 10, expansion: 'exp_3', regionId: 25 },
      { id: 11, expansion: 'exp_2', regionId: 23 },
      { id: 12, expansion: 'exp_2', regionId: 22 },
      { id: 13, expansion: 'exp_2', regionId: 23 },
      { id: 14, expansion: 'exp_7', regionId: 4500 },
    ];

    const groups = groupMapsByExpansion(maps);
    expect(groups.map(g => g.expansion)).toEqual(['exp_2', 'exp_3', 'exp_7']);
    expect(groups[0].regions.map(r => r.regionId)).toEqual([22, 23]);
    // Map order within a region follows input order
    expect(groups[0].regions[1].maps.map(m => m.id)).toEqual([11, 13]);
  });

  it('returns an empty array for no maps', () => {
    expect(groupMapsByExpansion([])).toEqual([]);
  });
});

describe('sortNodesForMapSidebar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(REAL_MS_PER_EORZEA_DAY); // ET 00:00
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('orders active → soon → later → untimed (untimed by level)', () => {
    const order = sortNodesForMapSidebar([
      { level: 50 },                            // 0: untimed
      { spawns: [12], duration: 60, level: 1 }, // 1: later
      { spawns: [0], duration: 60, level: 1 },  // 2: active
      { level: 10 },                            // 3: untimed, lower level first
      { spawns: [1], duration: 60, level: 1 },  // 4: soon
    ]);
    expect(order).toEqual([2, 4, 1, 3, 0]);
  });
});
