import React, { useState, useMemo } from 'react';
import { GatheringData, GatherType, NodeData } from '../types';
import { useLanguage } from '../../../i18n/LanguageContext';
import { getLocalizedText, GATHERING_ICONS } from '../utils';

interface MapViewProps {
  data: GatheringData;
  currentType: GatherType;
  completedItems: Set<number>;
  toggleComplete: (id: number) => void;
  hideCompleted: boolean;
}

export const MapView: React.FC<MapViewProps> = ({
  data,
  currentType,
  completedItems,
  toggleComplete,
  hideCompleted
}) => {
  const { lang, t: i18n } = useLanguage();
  const [selectedMapId, setSelectedMapId] = useState<number | null>(null);

  // Group nodes by Map ID
  const nodesByMap = useMemo(() => {
    const grouped: Record<number, NodeData[]> = {};
    const relevantTypeIds = currentType === 'mining' || currentType === 'quarrying' ? [0, 1] : [2, 3]; // 0:Mining, 1:Quarrying, 2:Logging, 3:Harvesting

    Object.values(data.nodes).forEach(node => {
      if (!relevantTypeIds.includes(node.type)) return;

      // Filter out if all items are completed and hideCompleted is true
      if (hideCompleted) {
        const allCompleted = node.items.every(itemId => completedItems.has(itemId));
        if (allCompleted) return;
      }

      const mapId = node.map;
      if (!grouped[mapId]) grouped[mapId] = [];
      grouped[mapId].push(node);
    });

    return grouped;
  }, [data.nodes, currentType, hideCompleted, completedItems]);

  // Get list of available maps with their region names
  const availableMaps = useMemo(() => {
    const maps = Object.keys(nodesByMap).map(mapId => {
        const id = Number(mapId);
        const mapData = data.maps[id];
        const placeName = data.places[mapData?.placename_id]; // Fallback if map data missing
        const regionName = mapData ? data.places[mapData.region_id] : null;

        return {
            id,
            name: placeName ? getLocalizedText(placeName, lang) : `Map ${id}`,
            region: regionName ? getLocalizedText(regionName, lang) : 'Unknown Region',
            nodeCount: nodesByMap[id].length
        };
    }).sort((a, b) => a.region.localeCompare(b.region) || a.name.localeCompare(b.name));
    
    return maps;
  }, [nodesByMap, data.maps, data.places, lang]);

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-200px)]">
      {/* Map Selection Sidebar */}
      <div className="w-full md:w-80 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden shrink-0">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
           <h3 className="font-bold text-slate-700 dark:text-slate-200">{i18n.pages.gathering_log.all_regions}</h3>
           <div className="text-xs text-slate-500 mt-1">{availableMaps.length} Maps Available</div>
        </div>
        
        <div className="overflow-y-auto flex-grow thin-scrollbar p-2">
            {availableMaps.map(map => (
                <button
                    key={map.id}
                    onClick={() => setSelectedMapId(map.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg mb-1 transition-all flex items-center justify-between group ${
                        selectedMapId === map.id 
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-700' 
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                >
                    <div>
                        <div className="font-bold text-sm">{map.name}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wide">{map.region}</div>
                    </div>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                        selectedMapId === map.id
                        ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}>
                        {map.nodeCount}
                    </span>
                </button>
            ))}
        </div>
      </div>

      {/* Map Display & Node List */}
      <div className="flex-grow bg-slate-100 dark:bg-slate-900 rounded-xl shadow-inner border border-slate-200 dark:border-slate-700 overflow-hidden relative flex flex-col">
            {selectedMapId && data.maps[selectedMapId] ? (
                <div className="relative w-full h-full p-4 overflow-auto flex items-center justify-center">
                    <div className="relative shadow-lg rounded-lg overflow-hidden bg-slate-800" style={{ width: 'min(100%, 800px)', aspectRatio: '1/1' }}>
                        {/* Map Image */}
                        <img 
                            src={`https://xivapi.com${data.maps[selectedMapId].image}`} 
                            alt="" 
                            className="w-full h-full object-cover"
                        />
                        
                        {/* Node Markers */}
                        {nodesByMap[selectedMapId].map((node, idx) => {
                            // Coordinate conversion logic
                            // Standard FFXIV map size is 2048x2048. 
                            // Coords are 1-42 (usually).
                            // Formula: ((Coord - 1) * 50 / SizeFactor) * 2 + 1? No, simpler:
                            // The provided x,y in nodes.json seems to be the in-game coordinate.
                            // We need to know the map's size_factor.
                            const mapInfo = data.maps[selectedMapId];
                            const factor = mapInfo.size_factor / 100;
                            // Basic mapping: Game Coord X -> Percent.
                            // 0,0 is top-left? Game coords start at 1,1 top-left.
                            // Range is roughly 1 to 42.
                            // Percent X = (x - 1) * (50 / factor) / 41 * 100?
                            // Let's use a simplified constant factor for now based on standard 41-unit width.
                            // Actually, many tools use: percentage = (coord - 1) / 41 * 100
                            // Let's try this first. Correct offset might be needed.
                            
                            // Trying strict standard conversion:
                            // offset = 0 for standard maps.
                            // scale = size_factor / 100.
                            // value = (coordinate - 1) * 50 / scale
                            // But we need 0-100%. 
                            // 41 is the standard max coordinate value for a scale of 100.
                            // let percentX = ((node.x - 1) / 41) * 100;
                            // let percentY = ((node.y - 1) / 41) * 100;

                             // Re-evaluating based on common knowledge:
                             // (Val - 1) * 50 / size_factor = raw_value_on_2048_map?
                             // No, let's stick to the visual approximation for the first pass and refine if user feedback.
                             // Actually, let's use the formula: (c - 1) * 2.4-ish?
                             
                             // Let's rely on standard formula:
                             // px = (x - 1) * 50 / size_factor 
                             // Image size is 2048. 
                             // So percent = ((x - 1) * 50 / size_factor) / 20.48
                             
                             const rawX = (node.x - 1) * 50 / factor;
                             const rawY = (node.y - 1) * 50 / factor;
                             const left = rawX / 20.48;
                             const top = rawY / 20.48;

                            return (
                                <div
                                    key={idx}
                                    className="absolute w-6 h-6 -ml-3 -mt-3 group/marker z-10 hover:z-50 cursor-pointer"
                                    style={{ left: `${left}%`, top: `${top}%` }}
                                >
                                    <div className={`w-full h-full rounded-full border-2 border-white shadow-sm flex items-center justify-center transition-transform hover:scale-125 ${
                                        node.type < 2 ? 'bg-blue-500' : 'bg-green-500'
                                    }`}>
                                        <img 
                                            src={GATHERING_ICONS[currentType] || GATHERING_ICONS.mining} 
                                            className="w-4 h-4 invert brightness-200" 
                                            alt="" 
                                        />
                                    </div>
                                    
                                    {/* Tooltip */}
                                    <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 bg-slate-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap opacity-0 group-hover/marker:opacity-100 pointer-events-none transition-opacity shadow-lg z-50">
                                        <div className="font-bold mb-0.5">Lv.{node.level}</div>
                                        {node.items.map(itemId => (
                                            <div key={itemId} className="flex items-center gap-1 opacity-80">
                                                <span className={completedItems.has(itemId) ? 'text-green-400' : ''}>
                                                    {getLocalizedText(data.items[itemId], lang)}
                                                </span>
                                            </div>
                                        ))}
                                        <div className="mt-1 text-[10px] text-slate-400 font-mono">X:{node.x}, Y:{node.y}</div>
                                        
                                        {/* Arrow */}
                                        <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <div className="text-4xl mb-4 opacity-30">⬅️</div>
                    <p>Select a map from the sidebar to view nodes</p>
                </div>
            )}
      </div>
    </div>
  );
};
