import React, { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
//import { useTool } from '../../../context/ToolContext';
import { GatheringData, GatherType, NodeData } from '../types';
import { useLanguage } from '../../../i18n/LanguageContext';
import { getLocalizedText, TIMED_GATHERING_MAP_ICONS, GATHERING_MAP_ICONS, getMapPercentage, EXPANSION_MAP, calculateNodeStatus, formatSeconds, getNodeItemIds, UI_ICON_URLS } from '../utils';
import { ChevronLeft } from 'lucide-react';
import { AlarmButton, ITEM_ACTION_BUTTON_BASE_CLASS, ITEM_ACTION_ICON_CLASS } from './AlarmButton';

interface MapViewProps {
    data: GatheringData;
    completedItems: Set<number>;
    bookmarkedItems: Set<number>;
    toggleBookmark: (id: number) => void;
    toggleComplete: (id: number) => void;
    hideCompleted: boolean;
    showBookmarks: boolean;
}

const MapItemCopyButton: React.FC<{ text: string; title?: string }> = ({ text, title = 'Copy Name' }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <button
            onClick={handleCopy}
            className={`${ITEM_ACTION_BUTTON_BASE_CLASS} ${copied ? 'text-green-500' : 'text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300'}`}
            title={copied ? 'Copied!' : title}
        >
            {copied ? (
                <svg className={ITEM_ACTION_ICON_CLASS} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            ) : (
                <svg className={ITEM_ACTION_ICON_CLASS} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            )}
        </button>
    );
};

const MapItemNameMarquee: React.FC<{ text: string; children?: React.ReactNode }> = ({ text, children }) => {
    const clipRef = useRef<HTMLDivElement | null>(null);
    const textRef = useRef<HTMLSpanElement | null>(null);
    const [shiftPx, setShiftPx] = useState(0);

    useLayoutEffect(() => {
        const updateOverflow = () => {
            const clip = clipRef.current;
            const label = textRef.current;
            if (!clip || !label) {
                setShiftPx(0);
                return;
            }

            const overflow = Math.max(0, label.scrollWidth - clip.clientWidth);
            setShiftPx(overflow);
        };

        updateOverflow();

        let observer: ResizeObserver | null = null;
        if (typeof ResizeObserver !== 'undefined') {
            observer = new ResizeObserver(updateOverflow);
            if (clipRef.current) observer.observe(clipRef.current);
            if (textRef.current) observer.observe(textRef.current);
        }

        window.addEventListener('resize', updateOverflow);

        return () => {
            if (observer) observer.disconnect();
            window.removeEventListener('resize', updateOverflow);
        };
    }, [text]);

    const shouldMarquee = shiftPx > 2;

    return (
        <div ref={clipRef} className="map-item-name-marquee-clip flex-1 min-w-0" title={text}>
            <span
                ref={textRef}
                className={`inline-flex items-center gap-1 whitespace-nowrap ${shouldMarquee ? 'map-item-name-marquee map-item-name-marquee--active' : ''}`}
                style={shouldMarquee ? ({ ['--marquee-shift' as string]: `${shiftPx + 12}px` } as React.CSSProperties) : undefined}
            >
                <span>{text}</span>
                {children}
            </span>
        </div>
    );
};

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
    // const { setMapModal } = useTool(); // Disabled as per user request
    const [selectedMapId, setSelectedMapId] = useState<number | null>(null);
    const [now, setNow] = useState(Date.now());
    const [hoveredNodeId, setHoveredNodeId] = useState<number | string | null>(null);
    const [lockedNodeId, setLockedNodeId] = useState<number | string | null>(null);
    const [lineCoords, setLineCoords] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
    const activeNodeId = lockedNodeId ?? hoveredNodeId;

    const containerRef = useRef<HTMLDivElement>(null);
    const markerRefs = useRef<Record<string | number, HTMLDivElement | null>>({});
    const sidebarRefs = useRef<Record<string | number, HTMLDivElement | null>>({});

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
        setLineCoords(null);
    };

    // Update current time every second for timers
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    // Update Line Coordinates and Scroll logic
    useEffect(() => {
        if (activeNodeId === null) {
            setLineCoords(null);
            return;
        }

        const sidebarItem = sidebarRefs.current[activeNodeId];
        if (sidebarItem && window.innerWidth >= 1024) {
            // Scroll the active node into view (Desktop only)
            sidebarItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }

        // Use requestAnimationFrame to update line position smoothly during potential scrolling
        let animationFrameId: number;

        const updatePosition = () => {
            const marker = markerRefs.current[activeNodeId];
            const sidebarRef = sidebarRefs.current[activeNodeId];
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
    }, [activeNodeId]);

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
            const expOrder = ['exp_2', 'exp_3', 'exp_4', 'exp_5', 'exp_6', 'exp_7'];
            const expA = expOrder.indexOf(a.expansion);
            const expB = expOrder.indexOf(b.expansion);
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
        setLineCoords(null);
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
            <div
                ref={mapSelectorRef}
                className={`w-full lg:w-72 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex-col overflow-hidden shrink-0 ${!isMapSelectorOpen ? 'hidden lg:flex' : 'flex'}`}
            >
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200">{i18n.pages.gathering_log.all_regions}</h3>
                    <div className="text-xs text-slate-500 mt-1">{i18n.pages.gathering_log.maps_available.replace('{count}', String(availableMaps.length))}</div>
                </div>

                <div className="overflow-y-auto flex-grow thin-scrollbar p-2 overscroll-contain">
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
                                                onClick={() => {
                                                    setSelectedMapId(map.id);
                                                    setIsMapSelectorOpen(false); // Close on mobile selection
                                                    if (window.innerWidth < 1024) {
                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                    }
                                                }}
                                                className={`w-full text-left px-3 py-2 rounded-lg mb-0.5 transition-all flex items-center justify-between group ${selectedMapId === map.id
                                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-700 font-bold'
                                                    : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${selectedMapId === map.id ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                                                    <span className="text-xs truncate">{map.name}</span>
                                                </div>
                                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${selectedMapId === map.id
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
                                            const isStacked = cluster.nodes.length > 1;

                                            let iconKey: GatherType = 'mining';
                                            if (node.type === 0) iconKey = 'mining';
                                            else if (node.type === 1) iconKey = 'quarrying';
                                            else if (node.type === 2) iconKey = 'logging';
                                            else if (node.type === 3) iconKey = 'harvesting';

                                            const isTimed = node.spawns && node.spawns.length > 0;
                                            const iconSet = isTimed ? TIMED_GATHERING_MAP_ICONS : GATHERING_MAP_ICONS;
                                            const iconUrl = iconSet[iconKey] || iconSet.mining;
                                            const validItems = mapNodeItems[String(node.id)] || [];
                                            const isAllCompleted = validItems.every(id => completedItems.has(id));
                                            // Mobile Tap to Hover
                                            const isActive = activeNodeId === node.id;
                                            const isLocked = lockedNodeId === node.id;
                                            // Use onClick for mobile to simulate hover/select?
                                            // For now sticking to mouseEnter/Leave but on mobile tap might need better handling if hover doesn't work well.
                                            // React's mouseEnter/Leave often works on tap for first tap.

                                            // Pulse color
                                            const pulseColor = 'bg-blue-400';

                                            return (
                                                <div
                                                    key={node.id}
                                                    ref={el => { markerRefs.current[node.id] = el; }}
                                                    onMouseEnter={() => handleNodeHoverStart(node.id)}
                                                    onMouseLeave={handleNodeHoverEnd}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleNodeLockToggle(node.id);
                                                    }}
                                                    className={`
                                                    absolute flex items-center justify-center 
                                                    w-6 h-6 -ml-3 -mt-3
                                                    md:w-8 md:h-8 md:-ml-4 md:-mt-4 
                                                    cursor-pointer transition-all duration-300 ease-out
                                                    ${isAllCompleted ? 'grayscale opacity-60' : ''}
                                                    ${isActive ? 'z-50 scale-125' : (isStacked ? 'z-10' : 'z-20')}
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
                                                        <div className={`absolute inset-0 rounded-full shadow-sm transform scale-125 ${isLocked ? 'bg-blue-200 ring-2 ring-blue-400 dark:bg-blue-900/60 dark:ring-blue-300' : 'bg-blue-100'} ${isAllCompleted ? 'opacity-30' : 'opacity-60'}`}></div>

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
                                                        ${isActive ? 'opacity-100' : 'opacity-0'}
                                                    `}>
                                                            <div className="font-bold mb-0.5">{i18n.pages.gathering_log.level_short}{node.level}</div>
                                                            {validItems.map(itemId => (
                                                                <div key={itemId} className="flex items-center gap-1 opacity-80">
                                                                    <span className={completedItems.has(itemId) ? 'text-green-400' : ''}>
                                                                        {getLocalizedText(data.items[itemId], lang)}
                                                                    </span>
                                                                    {(data.items[itemId]?.isCollectible || data.items[itemId]?.isCustomDelivery) && <span className="text-amber-400">▣</span>}
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

                            // Determine Icon type for the node header
                            let iconKey: GatherType = 'mining';
                            if (node.type === 0) iconKey = 'mining';
                            else if (node.type === 1) iconKey = 'quarrying';
                            else if (node.type === 2) iconKey = 'logging';
                            else if (node.type === 3) iconKey = 'harvesting';

                            const jobName = i18n.pages.gathering_log[iconKey]; // Should be safe with ts-ignore or type assertion if needed

                            const isAllCompleted = validNodeItems.every(id => completedItems.has(id));

                            const isActive = activeNodeId === node.id;
                            const isLocked = lockedNodeId === node.id;
                            const isTimed = node.spawns && node.spawns.length > 0;
                            const iconSet = isTimed ? TIMED_GATHERING_MAP_ICONS : GATHERING_MAP_ICONS;

                            return (
                                <div
                                    key={nodeIdx}
                                    ref={el => { sidebarRefs.current[node.id] = el; }}
                                    onMouseEnter={() => handleNodeHoverStart(node.id)}
                                    onMouseLeave={handleNodeHoverEnd}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleNodeLockToggle(node.id);
                                    }}
                                    className={`rounded-lg p-2 border transition-all duration-200 cursor-pointer ${isActive
                                        ? 'bg-blue-50 border-blue-300 shadow-md ring-1 dark:bg-blue-900/30 dark:border-blue-500 dark:ring-blue-500'
                                        : 'bg-slate-50 border-slate-100 dark:bg-slate-700/30 dark:border-slate-700/50'
                                        } ${isLocked ? 'ring-blue-400 dark:ring-blue-300' : (isActive ? 'ring-blue-200' : '')} ${isAllCompleted ? 'grayscale opacity-60' : ''}`}
                                >
                                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200 dark:border-slate-600">
                                        <img src={iconSet[iconKey]} className="w-4 h-4 object-contain" alt="" />
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Lv.{node.level} {jobName}</span>
                                        <span className="ml-auto text-[10px] font-mono text-slate-400 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                                            X:{node.x}, Y:{node.y}
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        {validNodeItems.map(itemId => {
                                            const item = data.items[itemId];
                                            if (!item) return null;
                                            const itemName = getLocalizedText(item, lang);

                                            const isBookmarked = bookmarkedItems.has(itemId);
                                            if (showBookmarks && !isBookmarked) return null;

                                            const isCompleted = completedItems.has(itemId);
                                            const collectibleType = item.collectibleType;
                                            const isCollectible = Boolean(item.isCollectible);
                                            const isCustomDelivery = item.isCustomDelivery === true;
                                            const showCollectibleIcon = isCollectible || isCustomDelivery;
                                            const isCollectionOnly = collectibleType === 'collection-only';
                                            const isHidden = (node.hiddenItems || []).includes(itemId);

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
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={() => toggleComplete(itemId)}
                                                            className="custom-checkbox w-3.5 h-3.5 rounded-sm text-blue-500 border-slate-300 focus:ring-offset-0 focus:ring-0 cursor-pointer"
                                                        />

                                                        <img
                                                            src={data.icons[itemId] ? `https://xivapi.com${data.icons[itemId]}` : UI_ICON_URLS.defaultItem}
                                                            className="w-5 h-5 rounded-sm bg-slate-200 dark:bg-slate-600"
                                                            alt=""
                                                        />
                                                        <div className={`text-xs transition-colors flex-1 min-w-0 ${isCompleted ? 'text-slate-400' : isCollectionOnly ? 'text-slate-500 dark:text-slate-400 italic' : 'text-slate-700 dark:text-slate-200 group-hover/item:text-blue-500'}`}>
                                                            <div className="flex items-stretch gap-2 min-w-0">
                                                                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                                                    <div className={`${isCompleted ? 'line-through decoration-slate-400/50' : ''}`}>
                                                                        <MapItemNameMarquee text={itemName}>
                                                                            {showCollectibleIcon && <img src={UI_ICON_URLS.collectible} className="w-4 h-4 flex-shrink-0" alt="Collectible" title={i18n.pages.gathering_log.collectible_tag} />}
                                                                        </MapItemNameMarquee>
                                                                    </div>

                                                                    {(isCustomDelivery || isCollectionOnly || isHidden) && (
                                                                        <div className="flex flex-wrap items-center gap-1">
                                                                            {isCustomDelivery && (
                                                                                <span className="inline-flex items-center gap-1 text-[10px] px-1 rounded border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 w-fit not-italic">
                                                                                    <img src={UI_ICON_URLS.customDelivery} className="w-3 h-3" alt="Custom Delivery" title={i18n.pages.gathering_log.custom_delivery_tag} />
                                                                                    {i18n.pages.gathering_log.custom_delivery_tag}
                                                                                </span>
                                                                            )}
                                                                            {isCollectionOnly && (
                                                                                <span className="text-[10px] px-1 rounded border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 w-fit not-italic">
                                                                                    {i18n.pages.gathering_log.collection_only_tag}
                                                                                </span>
                                                                            )}
                                                                            {isHidden && (
                                                                                <span className="text-[10px] px-1 rounded border border-red-300 dark:border-red-700 text-red-500 dark:text-red-300 bg-red-50 dark:bg-red-900/20 w-fit not-italic">
                                                                                    {i18n.pages.gathering_log.hidden_tag}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center gap-1 shrink-0 self-center">
                                                                    <MapItemCopyButton text={itemName} />
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); toggleBookmark(itemId); }}
                                                                        className={`${ITEM_ACTION_BUTTON_BASE_CLASS} ${bookmarkedItems.has(itemId) ? 'text-yellow-500' : 'text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                                                        title="Bookmark"
                                                                    >
                                                                        <svg className={ITEM_ACTION_ICON_CLASS} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={bookmarkedItems.has(itemId) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                                                    </button>
                                                                    {isTimed && <AlarmButton itemId={itemId} />}
                                                                </div>
                                                            </div>
                                                        </div>
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
