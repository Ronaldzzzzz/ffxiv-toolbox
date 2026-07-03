import React, { useState, useMemo, useEffect, useRef } from 'react';
//import { useTool } from '../../../context/ToolContext';
import { GatheringData, NodeData } from '../types';
import { useLanguage } from '../../../i18n/LanguageContext';
import { getLocalizedText, getMapPercentage, EXPANSION_MAP, EXPANSION_ORDER, getNodeItemIds, UI_ICON_URLS } from '../utils';
import { sortNodesForMapSidebar } from '../selectors';
import { ChevronLeft } from 'lucide-react';
import { useAlarm } from '../hooks/useAlarm';
import { useNowTick } from '../hooks/useNowTick';
import { useTrackedItemSet } from '../hooks/useTrackedItemSet';
import { MapNodeMarker } from './map/MapNodeMarker';
import { MapSelectorSidebar } from './map/MapSelectorSidebar';
import { MapSidebarNodeCard } from './map/MapSidebarNodeCard';
import { useNodeConnectionLine } from './map/useNodeConnectionLine';

interface MapViewProps {
    data: GatheringData;
    completedItems: Set<number>;
    bookmarkedItems: Set<number>;
    toggleBookmark: (id: number) => void;
    toggleComplete: (id: number) => void;
    hideCompleted: boolean;
    showBookmarks: boolean;
}

export const MapView: React.FC<MapViewProps> = ({
    data,
    completedItems,
    bookmarkedItems,
    toggleBookmark,
    toggleComplete,
    hideCompleted,
    showBookmarks
}) => {
    const { lang, t: i18n } = useLanguage();
    const { trackedItems, toggleTrackedItem } = useAlarm();
    // const { setMapModal } = useTool(); // Disabled as per user request
    const [selectedMapId, setSelectedMapId] = useState<number | null>(null);
    // Current time every second for timers
    const now = useNowTick(1000);
    const [hoveredNodeId, setHoveredNodeId] = useState<number | string | null>(null);
    const [lockedNodeId, setLockedNodeId] = useState<number | string | null>(null);
    const activeNodeId = lockedNodeId ?? hoveredNodeId;
    const trackedItemSet = useTrackedItemSet(trackedItems);

    const containerRef = useRef<HTMLDivElement>(null);
    const markerRefs = useRef<Record<string | number, HTMLDivElement | null>>({});
    const sidebarRefs = useRef<Record<string | number, HTMLDivElement | null>>({});

    // Dashed connection line between the active marker and its sidebar card
    const { lineCoords, clearLineCoords } = useNodeConnectionLine(activeNodeId, containerRef, markerRefs, sidebarRefs);

    const mapItemWhitelist = useMemo(() => {
        const whitelist = new Set<number>();

        data.pages.forEach(typePages => {
            typePages.forEach(page => {
                page.items.forEach(item => {
                    whitelist.add(item.itemId);
                });
            });
        });

        Object.entries(data.items).forEach(([id, item]) => {
            if (item?.collectibleType === 'collection-only') {
                whitelist.add(Number(id));
            }
        });

        return whitelist;
    }, [data.pages, data.items]);

    const mapNodeItems = useMemo(() => {
        const itemsByNodeId: Record<string, number[]> = {};

        Object.values(data.nodes).forEach(node => {
            itemsByNodeId[String(node.id)] = getNodeItemIds(node).filter(itemId => (
                mapItemWhitelist.has(itemId) && Boolean(data.items[itemId])
            ));
        });

        return itemsByNodeId;
    }, [data.nodes, data.items, mapItemWhitelist]);

    const handleNodeHoverStart = (nodeId: number | string) => {
        if (lockedNodeId !== null) return;
        setHoveredNodeId(nodeId);
    };

    const handleNodeHoverEnd = () => {
        if (lockedNodeId !== null) return;
        setHoveredNodeId(null);
    };

    const handleNodeLockToggle = (nodeId: number | string) => {
        setHoveredNodeId(nodeId);
        setLockedNodeId(prev => prev === nodeId ? null : nodeId);
    };

    const clearNodeLock = () => {
        setLockedNodeId(null);
        setHoveredNodeId(null);
        clearLineCoords();
    };

    // Group nodes by Map ID
    const nodesByMap = useMemo(() => {
        const grouped: Record<number, NodeData[]> = {};
        // Include all gathering types: Mining(0), Quarrying(1), Logging(2), Harvesting(3)
        const allTypeIds = [0, 1, 2, 3];

        Object.values(data.nodes).forEach(node => {
            // Filter out invalid types just in case, but allow all standard types
            if (!allTypeIds.includes(node.type)) return;

            const validItems = mapNodeItems[String(node.id)] || [];
            if (validItems.length === 0) return;

            // Filter out if all items are completed and hideCompleted is true
            if (hideCompleted) {
                const allCompleted = validItems.every(itemId => completedItems.has(itemId));
                if (allCompleted) return;
            }

            // Filter out if no items are bookmarked and showBookmarks is true
            if (showBookmarks) {
                const hasBookmark = validItems.some(itemId => bookmarkedItems.has(itemId));
                if (!hasBookmark) return;
            }

            const mapId = node.map;
            if (!grouped[mapId]) grouped[mapId] = [];
            grouped[mapId].push(node);
        });

        Object.keys(grouped).forEach(mapId => {
            const nodes = grouped[Number(mapId)] || [];
            const sortedIndexes = sortNodesForMapSidebar(nodes);
            grouped[Number(mapId)] = sortedIndexes.map(index => nodes[index]);
        });

        return grouped;
    }, [data.nodes, hideCompleted, completedItems, showBookmarks, bookmarkedItems, mapNodeItems]);

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
                    const valid = mapNodeItems[String(n.id)] || [];
                    return !valid.every(i => completedItems.has(i));
                }).length,
                expansion,
                regionId,
                placeId
            };
        }).filter(m => data.maps[m.id]).sort((a, b) => {
            const expA = EXPANSION_ORDER.indexOf(a.expansion);
            const expB = EXPANSION_ORDER.indexOf(b.expansion);
            if (expA !== expB) return expA - expB;
            if (a.regionId !== b.regionId) return a.regionId - b.regionId;
            return a.placeId - b.placeId;
        });

        return maps;
    }, [nodesByMap, data.maps, data.places, lang, mapNodeItems, completedItems, i18n.pages.gathering_log.unknown_region]);

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
            const validItems = mapNodeItems[String(node.id)] || [];
            if (validItems.length === 0) return;

            if (processed.has(node.id)) return;

            const currentCluster = [node];
            processed.add(node.id);

            nodes.forEach(otherNode => {
                if (node.id === otherNode.id || processed.has(otherNode.id)) return;
                const otherValid = mapNodeItems[String(otherNode.id)] || [];
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
    }, [selectedMapId, nodesByMap, data.maps, mapNodeItems]);

    // Mobile: Auto-collapse map selector when map is selected
    const [isMapSelectorOpen, setIsMapSelectorOpen] = useState(true);

    useEffect(() => {
        setHoveredNodeId(null);
        setLockedNodeId(null);
        clearLineCoords();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when map selection changes
    }, [selectedMapId, isMapSelectorOpen]);

    // Ref to scroll map selector to top when opened
    const mapSelectorRef = useRef<HTMLDivElement>(null);

    // Removed auto-scroll effect as it causes unwanted scrolling on mobile when switching views
    /*
    useEffect(() => {
      if (isMapSelectorOpen && mapSelectorRef.current && window.innerWidth < 768) {
          mapSelectorRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, [isMapSelectorOpen]);
    */

    return (
        <div ref={containerRef} onClick={clearNodeLock} className="flex flex-col lg:flex-row gap-3 min-h-[500px] lg:h-[calc(100vh-140px)] relative">
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
            <MapSelectorSidebar
                availableMaps={availableMaps}
                selectedMapId={selectedMapId}
                isOpen={isMapSelectorOpen}
                data={data}
                sidebarRef={mapSelectorRef}
                onSelectMap={(mapId) => {
                    setSelectedMapId(mapId);
                    setIsMapSelectorOpen(false); // Close on mobile selection
                    if (window.innerWidth < 1024) {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                }}
            />

            {/* Map Display & Node List */}
            <div className={`flex-grow bg-slate-100 dark:bg-slate-900 rounded-xl shadow-inner border border-slate-200 dark:border-slate-700 overflow-hidden relative flex flex-col ${isMapSelectorOpen ? 'hidden lg:flex' : 'flex'}`}>
                {selectedMapId && data.maps[selectedMapId] ? (
                    <>
                        {/* Mobile Only: Back to Map List Button */}
                        <div className="lg:hidden p-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                            <button
                                onClick={() => setIsMapSelectorOpen(true)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                            >
                                <ChevronLeft size={16} />
                                <span>{i18n.pages.gathering_log.all_regions}</span>
                            </button>
                            <div className="text-xs font-bold text-slate-500 truncate">
                                {getLocalizedText(data.places[data.maps[selectedMapId].placename_id], lang)}
                            </div>
                        </div>

                        <div className="relative w-full h-full p-4 overflow-auto flex items-center justify-center">
                            <div className="relative shadow-lg rounded-lg overflow-hidden bg-slate-800 overscroll-contain" style={{ width: 'min(100%, 580px)', aspectRatio: '1/1' }}>
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
                                            ? UI_ICON_URLS.aetheryteMain
                                            : UI_ICON_URLS.aetheryteSub;

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
                                            return (
                                                <MapNodeMarker
                                                    key={node.id}
                                                    node={node}
                                                    offsetX={item.offsetX}
                                                    offsetY={item.offsetY}
                                                    isStacked={cluster.nodes.length > 1}
                                                    validItems={mapNodeItems[String(node.id)] || []}
                                                    data={data}
                                                    completedItems={completedItems}
                                                    isActive={activeNodeId === node.id}
                                                    isLocked={lockedNodeId === node.id}
                                                    onHoverStart={() => handleNodeHoverStart(node.id)}
                                                    onHoverEnd={handleNodeHoverEnd}
                                                    onLockToggle={() => handleNodeLockToggle(node.id)}
                                                    markerRef={el => { markerRefs.current[node.id] = el; }}
                                                />
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
                        <div className="text-4xl mb-4 opacity-30">⬅️</div>
                        <p>{i18n.pages.gathering_log.map_select_prompt}</p>
                        <button
                            onClick={() => setIsMapSelectorOpen(true)}
                            className="mt-4 lg:hidden px-4 py-2 bg-blue-100 text-blue-600 rounded-lg font-bold"
                        >
                            {i18n.pages.gathering_log.all_regions}
                        </button>
                    </div>
                )}
            </div>

            {/* Right Sidebar: Item List for Selected Map */}
            <div className={`w-full lg:w-72 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden shrink-0 ${isMapSelectorOpen ? 'hidden lg:flex' : 'flex'}`}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200">
                        {selectedMapId && data.maps[selectedMapId] ? i18n.pages.gathering_log.items_list : '-'}
                    </h3>
                    {selectedMapId && nodesByMap[selectedMapId] && (
                        <div className="text-xs text-slate-500 mt-1">
                            {i18n.pages.gathering_log.nodes_incomplete.replace('{count}', String(nodesByMap[selectedMapId].filter(n => {
                                const valid = mapNodeItems[String(n.id)] || [];
                                return !valid.every(i => completedItems.has(i));
                            }).length))}
                        </div>
                    )}
                </div>

                <div className="overflow-y-auto flex-grow thin-scrollbar p-3 space-y-3 overscroll-contain">
                    {selectedMapId && nodesByMap[selectedMapId] ? (
                        nodesByMap[selectedMapId].map((node, nodeIdx) => {
                            // Filter valid items first
                            let validNodeItems = mapNodeItems[String(node.id)] || [];
                            if (showBookmarks) {
                                validNodeItems = validNodeItems.filter(id => bookmarkedItems.has(id));
                            }
                            if (validNodeItems.length === 0) return null;

                            return (
                                <MapSidebarNodeCard
                                    key={nodeIdx}
                                    node={node}
                                    validNodeItems={validNodeItems}
                                    data={data}
                                    now={now}
                                    isActive={activeNodeId === node.id}
                                    isLocked={lockedNodeId === node.id}
                                    completedItems={completedItems}
                                    bookmarkedItems={bookmarkedItems}
                                    showBookmarks={showBookmarks}
                                    toggleComplete={toggleComplete}
                                    toggleBookmark={toggleBookmark}
                                    trackedItemSet={trackedItemSet}
                                    toggleTrackedItem={toggleTrackedItem}
                                    onHoverStart={() => handleNodeHoverStart(node.id)}
                                    onHoverEnd={handleNodeHoverEnd}
                                    onLockToggle={() => handleNodeLockToggle(node.id)}
                                    cardRef={el => { sidebarRefs.current[node.id] = el; }}
                                />
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
