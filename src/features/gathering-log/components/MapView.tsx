import React, { useState, useMemo, useEffect, useRef } from 'react';
//import { useTool } from '../../../context/ToolContext';
import { GatheringData, GatherType, NodeData } from '../types';
import { useLanguage } from '../../../i18n/LanguageContext';
import { getLocalizedText, GATHERING_ICONS, getMapPercentage, EXPANSION_MAP, calculateNodeStatus, formatSeconds} from '../utils';
//import { ChevronDown, ChevronRight } from 'lucide-react';

interface MapViewProps {
  data: GatheringData;
  completedItems: Set<number>;
  toggleComplete: (id: number) => void;
  hideCompleted: boolean;
}

export const MapView: React.FC<MapViewProps> = ({
  data,
  completedItems,
  toggleComplete,
  hideCompleted
}) => {
  const { lang, t: i18n } = useLanguage();
  // const { setMapModal } = useTool(); // Disabled as per user request
  const [selectedMapId, setSelectedMapId] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [hoveredNodeId, setHoveredNodeId] = useState<number | string | null>(null);
  const [lineCoords, setLineCoords] = useState<{x1: number, y1: number, x2: number, y2: number} | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const markerRefs = useRef<Record<string | number, HTMLDivElement | null>>({});
  const sidebarRefs = useRef<Record<string | number, HTMLDivElement | null>>({});

  // Update current time every second for timers
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Update Line Coordinates and Scroll logic
  useEffect(() => {
    if (hoveredNodeId === null) {
        setLineCoords(null);
        return;
    }

    const sidebarItem = sidebarRefs.current[hoveredNodeId];
    if (sidebarItem) {
        // Scroll into view when hovered
        sidebarItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    // Use requestAnimationFrame to update line position smoothly during potential scrolling
    let animationFrameId: number;

    const updatePosition = () => {
        const marker = markerRefs.current[hoveredNodeId];
        const sidebarRef = sidebarRefs.current[hoveredNodeId];
        const container = containerRef.current;

        if (marker && sidebarRef && container) {
            const markerRect = marker.getBoundingClientRect();
            const sidebarRect = sidebarRef.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            // Calculate relative coordinates
            // Start: Center of marker
            const x1 = markerRect.left + markerRect.width / 2 - containerRect.left;
            const y1 = markerRect.top + markerRect.height / 2 - containerRect.top;

            // End: Left-Center of sidebar item
            const x2 = sidebarRect.left - containerRect.left;
            const y2 = sidebarRect.top + sidebarRect.height / 2 - containerRect.top;

            setLineCoords({ x1, y1, x2, y2 });
        } else {
            setLineCoords(null);
        }

        animationFrameId = requestAnimationFrame(updatePosition);
    };

    updatePosition();
    
    return () => cancelAnimationFrame(animationFrameId);
  }, [hoveredNodeId]);

  // Group nodes by Map ID
  const nodesByMap = useMemo(() => {
    const grouped: Record<number, NodeData[]> = {};
    // Include all gathering types: Mining(0), Quarrying(1), Harvesting(2), Logging(3)
    const allTypeIds = [0, 1, 2, 3];

    Object.values(data.nodes).forEach(node => {
      // Filter out invalid types just in case, but allow all standard types
      if (!allTypeIds.includes(node.type)) return;

      // Filter out nodes that have no valid items
      const validItems = node.items.filter(id => data.items[id]);
      if (validItems.length === 0) return;

      // Filter out if all items are completed and hideCompleted is true
      if (hideCompleted) {
        const allCompleted = validItems.every(itemId => completedItems.has(itemId));
        if (allCompleted) return;
      }

      const mapId = node.map;
      if (!grouped[mapId]) grouped[mapId] = [];
      grouped[mapId].push(node);
    });

    return grouped;
  }, [data.nodes, hideCompleted, completedItems]);

  // Get list of available maps with their region names
  const availableMaps = useMemo(() => {
    const maps = Object.keys(nodesByMap).map(mapId => {
        const id = Number(mapId);
        const mapData = data.maps[id];
        const placeName = data.places[mapData?.placename_id]; // Fallback if map data missing
        const regionName = mapData ? data.places[mapData.region_id] : null;
        const regionId = mapData ? mapData.region_id : 0;
        const placeId = mapData ? mapData.placename_id : 0;
        const expansion = EXPANSION_MAP[regionId] || EXPANSION_MAP[placeId] || 'exp_2';

        return {
            id,
            name: placeName ? getLocalizedText(placeName, lang) : `Map ${id}`,
            region: regionName ? getLocalizedText(regionName, lang) : i18n.pages.gathering_log.unknown_region,
            nodeCount: (nodesByMap[id] || []).filter(n => {
                const valid = n.items.filter(i => data.items[i]);
                return !valid.every(i => completedItems.has(i));
            }).length,
            expansion,
            regionId,
            placeId
        };
    }).filter(m => data.maps[m.id]).sort((a, b) => {
        const expOrder = ['exp_2', 'exp_3', 'exp_4', 'exp_5', 'exp_6', 'exp_7'];
        const expA = expOrder.indexOf(a.expansion);
        const expB = expOrder.indexOf(b.expansion);
        if (expA !== expB) return expA - expB;
        if (a.regionId !== b.regionId) return a.regionId - b.regionId;
        return a.placeId - b.placeId;
    });
    
    return maps;
  }, [nodesByMap, data.maps, data.places, lang]);

  // Calculate clusters for rendering
  const nodeClusters = useMemo(() => {
    if (!selectedMapId || !nodesByMap[selectedMapId]) return [];

    const nodes = nodesByMap[selectedMapId];
    const mapInfo = data.maps[selectedMapId];
    const sizeFactor = mapInfo?.size_factor || 100;
    
    // Group overlapping nodes
    const clusters: Array<{
        left: number;
        top: number;
        nodes: Array<{ node: NodeData, offsetX: number, offsetY: number }>;
    }> = [];
    
    const threshold = 1.6; // Coordinate distance threshold
    const processed = new Set<string | number>();

    nodes.forEach(node => {
        const validItems = node.items.filter(id => data.items[id]);
        if (validItems.length === 0) return;
        
        if (processed.has(node.id)) return;

        const currentCluster = [node];
        processed.add(node.id);

        nodes.forEach(otherNode => {
            if (node.id === otherNode.id || processed.has(otherNode.id)) return;
            const otherValid = otherNode.items.filter(id => data.items[id]);
            if (otherValid.length === 0) return;

            const dist = Math.sqrt(Math.pow(node.x - otherNode.x, 2) + Math.pow(node.y - otherNode.y, 2));
            if (dist < threshold) {
                currentCluster.push(otherNode);
                processed.add(otherNode.id);
            }
        });

        const centerX = getMapPercentage(node.x, sizeFactor);
        const centerY = getMapPercentage(node.y, sizeFactor);

        const clusterData = {
            left: centerX,
            top: centerY,
            nodes: [] as Array<{ node: NodeData, offsetX: number, offsetY: number }>
        };

        if (currentCluster.length === 1) {
            clusterData.nodes.push({ node: currentCluster[0], offsetX: 0, offsetY: 0 });
        } else {
            // Horizontal expansion pattern
            // Center the items: (index - (total-1)/2) * gap
            const gap = 32; // Pixels gap
            const total = currentCluster.length;
            
            currentCluster.forEach((n, i) => {
                // Alternating left/right from center? Or straight line? 
                // A straight line is clearer for "left/right expansion".
                const offsetX = (i - (total - 1) / 2) * gap;
                
                // Optional: Simple vertical stagger to avoid label overlap if too many?
                // For now, straight horizontal line as requested.
                const offsetY = 0; 
                
                clusterData.nodes.push({
                    node: n,
                    offsetX,
                    offsetY
                });
            });
        }
        clusters.push(clusterData);
    });

    return clusters;
  }, [selectedMapId, nodesByMap, data.maps, data.items]);

  return (
    <div ref={containerRef} className="flex flex-col md:flex-row gap-3 h-[calc(100vh-300px)] relative">
      {/* Connection Line Overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-50 overflow-visible">
          {lineCoords && (
              <line 
                x1={lineCoords.x1} 
                y1={lineCoords.y1} 
                x2={lineCoords.x2} 
                y2={lineCoords.y2} 
                stroke="#60A5FA" 
                strokeWidth="2" 
                strokeDasharray="6 4"
                className="drop-shadow-sm opacity-80"
              />
          )}
          {lineCoords && (
              <>
                  <circle cx={lineCoords.x1} cy={lineCoords.y1} r="3" fill="#60A5FA" />
                  <circle cx={lineCoords.x2} cy={lineCoords.y2} r="3" fill="#60A5FA" />
              </>
          )}
      </svg>

      {/* Map Selection Sidebar */}
      <div className="w-full md:w-72 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden shrink-0">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
           <h3 className="font-bold text-slate-700 dark:text-slate-200">{i18n.pages.gathering_log.all_regions}</h3>
           <div className="text-xs text-slate-500 mt-1">{i18n.pages.gathering_log.maps_available.replace('{count}', String(availableMaps.length))}</div>
        </div>
        
        <div className="overflow-y-auto flex-grow thin-scrollbar p-2">
            {/* Group Maps by Expansion and Region for Rendering */}
            {(() => {
                const groupedMaps: Record<string, Record<number, typeof availableMaps>> = {};
                const expOrder = ['exp_2', 'exp_3', 'exp_4', 'exp_5', 'exp_6', 'exp_7'];
                const EXPANSION_COLORS: Record<string, string> = {
                    'exp_2': '#666666',
                    'exp_3': '#4C7EE8',
                    'exp_4': '#A22A3E',
                    'exp_5': '#2E1D4A',
                    'exp_6': '#3D4E99',
                    'exp_7': '#9B853F',
                };
                
                availableMaps.forEach(map => {
                    const exp = map.expansion;
                    const rid = map.regionId;
                    if (!groupedMaps[exp]) groupedMaps[exp] = {};
                    if (!groupedMaps[exp][rid]) groupedMaps[exp][rid] = [];
                    groupedMaps[exp][rid].push(map);
                });

                return expOrder.filter(exp => groupedMaps[exp]).map(expKey => (
                    <div key={expKey} className="mb-2">
                        {/* Expansion Header */}
                        <div 
                            className="w-full text-left text-xs font-extrabold mt-2 mb-1 px-3 py-1.5 rounded shadow-sm text-white flex items-center justify-between"
                            style={{ backgroundColor: EXPANSION_COLORS[expKey] }}
                        >
                            <span>{i18n.common.expansions[expKey as keyof typeof i18n.common.expansions]}</span>
                        </div>

                        {/* Regions */}
                        {Object.entries(groupedMaps[expKey]).map(([rid, maps]) => (
                            <div key={rid} className="mb-2 pl-1">
                                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1 mb-1 px-2">
                                    {getLocalizedText(data.places[Number(rid)], lang)}
                                </div>
                                
                                {/* Maps */}
                                {maps.map(map => (
                                    <button
                                        key={map.id}
                                        onClick={() => setSelectedMapId(map.id)}
                                        className={`w-full text-left px-3 py-2 rounded-lg mb-0.5 transition-all flex items-center justify-between group ${
                                            selectedMapId === map.id 
                                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-700 font-bold' 
                                            : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <span className={`w-1.5 h-1.5 rounded-full ${selectedMapId === map.id ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                                            <span className="text-xs truncate">{map.name}</span>
                                        </div>
                                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                                            selectedMapId === map.id
                                            ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                                        }`}>
                                            {map.nodeCount}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                ));
            })()}
        </div>
      </div>

      {/* Map Display & Node List */}
      <div className="flex-grow bg-slate-100 dark:bg-slate-900 rounded-xl shadow-inner border border-slate-200 dark:border-slate-700 overflow-hidden relative flex flex-col">
            {selectedMapId && data.maps[selectedMapId] ? (
                <div className="relative w-full h-full p-4 overflow-auto flex items-center justify-center">
                    <div className="relative shadow-lg rounded-lg overflow-hidden bg-slate-800" style={{ width: 'min(100%, 580px)', aspectRatio: '1/1' }}>
                        {/* Map Image */}
                        {(() => {
                             const map = data.maps[selectedMapId];
                             const mapImage = map.image 
                                ? (map.image.includes('xivapi.com') ? map.image : `https://xivapi.com${map.image.startsWith('/') ? '' : '/'}${map.image}`) 
                                : `https://xivapi.com/m/${selectedMapId}/${selectedMapId}.00.jpg`;
                             
                             return (
                                <img 
                                    src={mapImage} 
                                    alt="" 
                                    className="w-full h-full object-cover"
                                />
                             );
                        })()}
                        
                        {/* Aetherytes */}
                        {selectedMapId && data.aetherytes && data.aetherytes
                            .filter(a => a.map === selectedMapId)
                            .map(aetheryte => {
                                const mapInfo = data.maps[selectedMapId];
                                const sizeFactor = mapInfo?.size_factor || 100;
                                const left = getMapPercentage(aetheryte.x, sizeFactor);
                                const top = getMapPercentage(aetheryte.y, sizeFactor);
                                
                                // Icon selection based on type
                                // type 0: i/060000/060453_hr1.png (Large/Main)
                                // type 1: i/060000/060430_hr1.png (Small/Sub)
                                const iconUrl = aetheryte.type === 0 
                                    ? 'https://xivapi.com/i/060000/060453_hr1.png'
                                    : 'https://xivapi.com/i/060000/060430_hr1.png';

                                return (
                                    <div
                                        key={`aetheryte-${aetheryte.id}`}
                                        className="absolute w-8 h-8 -ml-4 -mt-4 flex items-center justify-center z-10 pointer-events-none"
                                        style={{ left: `${left}%`, top: `${top}%` }}
                                    >
                                        <img 
                                            src={iconUrl}
                                            className="w-full h-full object-contain drop-shadow"
                                            alt="" // Decorative
                                        />
                                        {/* Optional: Add name tooltip if needed in future */}
                                    </div>
                                );
                            })
                        }

                        {/* Node Clusters */}
                        {nodeClusters.map((cluster, cIdx) => (
                            <div 
                                key={cIdx} 
                                className="absolute w-0 h-0 group/cluster flex justify-center items-center"
                                style={{ left: `${cluster.left}%`, top: `${cluster.top}%` }}
                            >
                                {cluster.nodes.map((item) => {
                                    const node = item.node;
                                    const isStacked = cluster.nodes.length > 1;

                                    let iconKey: GatherType = 'mining';
                                    if (node.type === 0) iconKey = 'mining';
                                    else if (node.type === 1) iconKey = 'quarrying';
                                    else if (node.type === 2) iconKey = 'harvesting';
                                    else if (node.type === 3) iconKey = 'logging';

                                    const iconUrl = GATHERING_ICONS[iconKey] || GATHERING_ICONS.mining;
                                    const validItems = node.items.filter(id => data.items[id]);
                                    const isAllCompleted = validItems.every(id => completedItems.has(id));
                                    const isHovered = hoveredNodeId === node.id;

                                    // Pulse color
                                    const pulseColor = 'bg-blue-400';

                                    return (
                                        <div
                                            key={node.id}
                                            ref={el => { markerRefs.current[node.id] = el; }}
                                            onMouseEnter={() => setHoveredNodeId(node.id)}
                                            onMouseLeave={() => setHoveredNodeId(null)}
                                            className={`
                                                absolute flex items-center justify-center 
                                                w-8 h-8 -ml-4 -mt-4 
                                                cursor-pointer transition-all duration-300 ease-out
                                                ${isAllCompleted ? 'grayscale opacity-60' : ''}
                                                ${isHovered ? 'z-50 scale-125' : (isStacked ? 'z-10' : 'z-20')}
                                            `}
                                            style={{
                                                transform: isStacked ? undefined : 'none',
                                            }}
                                        >
                                            {/* Wrapper for hover transform - only if stacked */}
                                            <div 
                                                className={`w-full h-full flex items-center justify-center transition-transform duration-300 ease-out ${isStacked ? 'group-hover/cluster:translate-x-[var(--tx)] group-hover/cluster:translate-y-[var(--ty)]' : ''}`}
                                                style={isStacked ? { '--tx': `${item.offsetX}px`, '--ty': `${item.offsetY}px` } as any : {}}
                                            >
                                                {/* Background Circle */}
                                                <div className={`absolute inset-0 bg-blue-100 rounded-full shadow-sm transform scale-125 ${isAllCompleted ? 'opacity-30' : 'opacity-60'}`}></div>

                                                {/* Pulse */}
                                                {!isAllCompleted && (
                                                    <>
                                                        <div className={`absolute inset-0 rounded-full opacity-60 animate-ping ${pulseColor}`}></div>
                                                        <div className={`absolute inset-1 rounded-full opacity-40 animate-pulse ${pulseColor} blur-[2px]`}></div>
                                                    </>
                                                )}

                                                <img 
                                                    src={iconUrl}
                                                    className="relative z-10 w-full h-full object-contain drop-shadow hover:scale-110"
                                                    alt="" 
                                                />
                                                
                                                {/* Tooltip */}
                                                <div className={`
                                                    absolute left-1/2 bottom-full mb-2 -translate-x-1/2 bg-slate-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap 
                                                    pointer-events-none shadow-lg z-50
                                                    opacity-0 transition-opacity
                                                    ${isHovered ? 'opacity-100' : 'opacity-0'}
                                                `}>
                                                    <div className="font-bold mb-0.5">{i18n.pages.gathering_log.level_short}{node.level}</div>
                                                    {node.items.filter(id => data.items[id]).map(itemId => (
                                                        <div key={itemId} className="flex items-center gap-1 opacity-80">
                                                            <span className={completedItems.has(itemId) ? 'text-green-400' : ''}>
                                                                {getLocalizedText(data.items[itemId], lang)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    <div className="mt-1 text-[10px] text-slate-400 font-mono">X:{node.x}, Y:{node.y}</div>
                                                    <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <div className="text-4xl mb-4 opacity-30">⬅️</div>
                    <p>{i18n.pages.gathering_log.map_select_prompt}</p>
                </div>
            )}
      </div>
      
      {/* Right Sidebar: Item List for Selected Map */}
      <div className="w-full md:w-72 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden shrink-0">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
             <h3 className="font-bold text-slate-700 dark:text-slate-200">
                {selectedMapId && data.maps[selectedMapId] ? i18n.pages.gathering_log.items_list : '-'}
             </h3>
             {selectedMapId && nodesByMap[selectedMapId] && (
                 <div className="text-xs text-slate-500 mt-1">
                     {i18n.pages.gathering_log.nodes_incomplete.replace('{count}', String(nodesByMap[selectedMapId].filter(n => {
                         const valid = n.items.filter(i => data.items[i]);
                         return !valid.every(i => completedItems.has(i));
                     }).length))}
                 </div>
             )}
          </div>
          
          <div className="overflow-y-auto flex-grow thin-scrollbar p-3 space-y-3">
              {selectedMapId && nodesByMap[selectedMapId] ? (
                  nodesByMap[selectedMapId].map((node, nodeIdx) => {
                      // Filter valid items first
                      const validNodeItems = node.items.filter(id => data.items[id]);
                      if (validNodeItems.length === 0) return null;

                      // Determine Icon type for the node header
                      let iconKey: GatherType = 'mining';
                      if (node.type === 0) iconKey = 'mining';
                      else if (node.type === 1) iconKey = 'quarrying';
                      else if (node.type === 2) iconKey = 'harvesting';
                      else if (node.type === 3) iconKey = 'logging';
                      
                      const jobName = i18n.pages.gathering_log[iconKey]; // Should be safe with ts-ignore or type assertion if needed
                      
                      const isAllCompleted = validNodeItems.every(id => completedItems.has(id));

                      const isHovered = hoveredNodeId === node.id;

                      return (
                          <div 
                            key={nodeIdx} 
                            ref={el => { sidebarRefs.current[node.id] = el; }}
                            onMouseEnter={() => setHoveredNodeId(node.id)}
                            onMouseLeave={() => setHoveredNodeId(null)}
                            className={`rounded-lg p-2 border transition-all duration-200 ${
                                isHovered 
                                ? 'bg-blue-50 border-blue-300 shadow-md ring-1 ring-blue-200 dark:bg-blue-900/30 dark:border-blue-500 dark:ring-blue-500' 
                                : 'bg-slate-50 border-slate-100 dark:bg-slate-700/30 dark:border-slate-700/50'
                            } ${isAllCompleted ? 'grayscale opacity-60' : ''}`}
                          >
                              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200 dark:border-slate-600">
                                  <img src={GATHERING_ICONS[iconKey]} className="w-4 h-4 object-contain" alt="" />
                                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Lv.{node.level} {jobName}</span>
                                  <span className="ml-auto text-[10px] font-mono text-slate-400 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                                      X:{node.x}, Y:{node.y}
                                  </span>
                              </div>
                              <div className="space-y-1">
                                  {node.items.map(itemId => {
                                      const item = data.items[itemId];
                                      if (!item) return null;
                                      const isCompleted = completedItems.has(itemId);
                                      
                                      // Timer Logic (ONLY for items in a timed node)
                                      let timerElement = null;
                                      if (node.spawns && node.spawns.length > 0) {
                                          const status = calculateNodeStatus(node.spawns, node.duration || 60);
                                          
                                          const isActive = status.status === 'active';
                                          const isSoon = status.status === 'soon';
                                          const isLater = status.status === 'later';
                                          
                                          if (isActive || isSoon || isLater) {
                                              const remainingMs = status.endRealTimestamp - now;
                                              const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
                                              const timeLabel = formatSeconds(seconds);
                                              
                                              // Progress Bar Calculation
                                              let progressPercent = 0;
                                              if (isActive && status.durationRealMs > 0) {
                                                  progressPercent = Math.max(0, (1 - (now - status.startRealTimestamp) / status.durationRealMs)) * 100;
                                              }

                                              let barColor = 'bg-slate-300 dark:bg-slate-600';
                                              let textColor = 'text-slate-500 dark:text-slate-400';
                                              
                                              if (isActive) {
                                                  barColor = 'bg-green-500';
                                                  textColor = 'text-green-600 dark:text-green-400';
                                              } else if (isSoon) {
                                                  barColor = 'bg-amber-500';
                                                  textColor = 'text-amber-600 dark:text-amber-400';
                                              }
                                              
                                              const label = isActive ? `${i18n.pages.gathering_log.active} ${timeLabel}` : `${i18n.pages.gathering_log.wait} ${formatSeconds(status.secondsUntil)}`;

                                              timerElement = (
                                                  <div className="mt-1 w-full">
                                                      <div className={`text-[10px] font-mono font-bold flex justify-between ${textColor}`}>
                                                          <span>{label}</span>
                                                          {isActive && <span>{Math.round(progressPercent)}%</span>}
                                                      </div>
                                                      {isActive && (
                                                          <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden mt-0.5">
                                                              <div 
                                                                  className={`h-full ${barColor} transition-all duration-1000 ease-linear rounded-full`} 
                                                                  style={{ width: `${progressPercent}%` }}
                                                              />
                                                          </div>
                                                      )}
                                                  </div>
                                              );
                                          }
                                      }

                                      return (
                                          <div key={itemId} className="flex flex-col gap-1 group/item">
                                              <div className="flex items-center gap-2">
                                                  <input
                                                      type="checkbox"
                                                      checked={isCompleted}
                                                      onChange={() => toggleComplete(itemId)}
                                                      className="custom-checkbox w-3.5 h-3.5 rounded-sm text-blue-500 border-slate-300 focus:ring-offset-0 focus:ring-0 cursor-pointer"
                                                  />
                                                  <img 
                                                    src={data.icons[itemId] ? `https://xivapi.com${data.icons[itemId]}` : 'https://xivapi.com/i/066000/066313_hr1.png'} 
                                                    className="w-5 h-5 rounded-sm bg-slate-200 dark:bg-slate-600"
                                                    alt=""
                                                  />
                                                  <span className={`text-xs truncate transition-colors ${isCompleted ? 'text-slate-400 line-through decoration-slate-400/50' : 'text-slate-700 dark:text-slate-200 group-hover/item:text-blue-500'}`} title={getLocalizedText(item, lang)}>
                                                      {getLocalizedText(item, lang)}
                                                  </span>
                                              </div>
                                              {timerElement}
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                      );
                  })
              ) : (
                  <div className="text-center text-slate-400 py-8 text-xs italic">
                      {i18n.pages.gathering_log.items_select_prompt}
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};
