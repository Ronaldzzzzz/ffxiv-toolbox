import React from 'react';
import { GatheringData } from '../../types';
import { getLocalizedText } from '../../utils';
import { groupMapsByExpansion } from '../../selectors';
import { useLanguage } from '../../../../i18n/LanguageContext';
import { EXPANSION_COLORS } from './mapConstants';

export interface MapListEntry {
    id: number;
    name: string;
    region: string;
    nodeCount: number;
    expansion: string;
    regionId: number;
    placeId: number;
}

interface MapSelectorSidebarProps {
    availableMaps: MapListEntry[];
    selectedMapId: number | null;
    isOpen: boolean;
    data: GatheringData;
    onSelectMap: (mapId: number) => void;
    sidebarRef: React.RefObject<HTMLDivElement>;
}

/**
 * Left sidebar listing all maps grouped by expansion and region.
 * Extracted from MapView.tsx (mechanical move).
 */
export const MapSelectorSidebar: React.FC<MapSelectorSidebarProps> = ({
    availableMaps,
    selectedMapId,
    isOpen,
    data,
    onSelectMap,
    sidebarRef,
}) => {
    const { lang, t: i18n } = useLanguage();
    const groupedMapSections = React.useMemo(() => groupMapsByExpansion(availableMaps), [availableMaps]);

    return (
        <div
            ref={sidebarRef}
            className={`w-full lg:w-72 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex-col overflow-hidden shrink-0 ${!isOpen ? 'hidden lg:flex' : 'flex'}`}
        >
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <h3 className="font-bold text-slate-700 dark:text-slate-200">{i18n.pages.gathering_log.all_regions}</h3>
                <div className="text-xs text-slate-500 mt-1">{i18n.pages.gathering_log.maps_available.replace('{count}', String(availableMaps.length))}</div>
            </div>

            <div className="overflow-y-auto flex-grow thin-scrollbar p-2 overscroll-contain">
                {/* Group Maps by Expansion and Region for Rendering */}
                {groupedMapSections.map(({ expansion: expKey, regions }) => (
                    <div key={expKey} className="mb-2">
                        {/* Expansion Header */}
                        <div
                            className="w-full text-left text-xs font-extrabold mt-2 mb-1 px-3 py-1.5 rounded shadow-sm text-white flex items-center justify-between"
                            style={{ backgroundColor: EXPANSION_COLORS[expKey] }}
                        >
                            <span>{i18n.common.expansions[expKey as keyof typeof i18n.common.expansions]}</span>
                        </div>

                        {/* Regions */}
                        {regions.map(({ regionId: rid, maps }) => (
                            <div key={rid} className="mb-2 pl-1">
                                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1 mb-1 px-2">
                                    {getLocalizedText(data.places[Number(rid)], lang)}
                                </div>

                                {/* Maps */}
                                {maps.map(map => (
                                    <button
                                        key={map.id}
                                        onClick={() => onSelectMap(map.id)}
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
                ))}
            </div>
        </div>
    );
};
