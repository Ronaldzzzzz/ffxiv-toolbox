import React from 'react';
import { GatheringData, GatherType, NodeData } from '../../types';
import { getLocalizedText, TIMED_GATHERING_MAP_ICONS, GATHERING_MAP_ICONS, UI_ICON_URLS } from '../../utils';
import { useLanguage } from '../../../../i18n/LanguageContext';

interface MapNodeMarkerProps {
    node: NodeData;
    offsetX: number;
    offsetY: number;
    isStacked: boolean;
    /** Item ids of this node that pass the whitelist filters */
    validItems: number[];
    data: GatheringData;
    completedItems: Set<number>;
    isActive: boolean;
    isLocked: boolean;
    onHoverStart: () => void;
    onHoverEnd: () => void;
    onLockToggle: () => void;
    markerRef: (el: HTMLDivElement | null) => void;
}

/**
 * One gathering-node marker on the map image, with pulse ring and tooltip.
 * Extracted from MapView.tsx (mechanical move).
 */
export const MapNodeMarker: React.FC<MapNodeMarkerProps> = ({
    node,
    offsetX,
    offsetY,
    isStacked,
    validItems,
    data,
    completedItems,
    isActive,
    isLocked,
    onHoverStart,
    onHoverEnd,
    onLockToggle,
    markerRef,
}) => {
    const { lang, t: i18n } = useLanguage();

    let iconKey: GatherType = 'mining';
    if (node.type === 0) iconKey = 'mining';
    else if (node.type === 1) iconKey = 'quarrying';
    else if (node.type === 2) iconKey = 'logging';
    else if (node.type === 3) iconKey = 'harvesting';

    const isTimed = node.spawns && node.spawns.length > 0;
    const iconSet = isTimed ? TIMED_GATHERING_MAP_ICONS : GATHERING_MAP_ICONS;
    const iconUrl = iconSet[iconKey] || iconSet.mining;
    const isAllCompleted = validItems.every(id => completedItems.has(id));

    // Pulse color
    const pulseColor = 'bg-blue-400';

    return (
        <div
            ref={markerRef}
            onMouseEnter={onHoverStart}
            onMouseLeave={onHoverEnd}
            onClick={(e) => {
                e.stopPropagation();
                onLockToggle();
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
                style={isStacked ? { '--tx': `${offsetX}px`, '--ty': `${offsetY}px` } as any : {}}
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
                            {(data.items[itemId]?.isCollectible || data.items[itemId]?.isCustomDelivery) && (
                                <img
                                    src={UI_ICON_URLS.collectible}
                                    className="w-3.5 h-3.5 flex-shrink-0"
                                    alt="Collectible"
                                    title={i18n.pages.gathering_log.collectible_tag}
                                />
                            )}
                        </div>
                    ))}
                    <div className="mt-1 text-[10px] text-slate-400 font-mono">X:{node.x}, Y:{node.y}</div>
                    <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                </div>
            </div>
        </div>
    );
};
