import React from 'react';
import { useTool } from '../../../context/ToolContext';
import { GatheringData, GatherType } from '../types';
import { getLocalizedText, getMapPercentage, GATHERING_ICONS } from '../utils';
import { useLanguage } from '../../../i18n/LanguageContext';

interface MapModalProps {
    data: GatheringData;
}

export const MapModal: React.FC<MapModalProps> = ({ data }) => {
    const { mapModal, setMapModal } = useTool();
    const { lang } = useLanguage();

    if (!mapModal.isOpen) return null;

    const map = data.maps[mapModal.mapId];
    if (!map) return null;

    const handleClose = () => {
        setMapModal({ ...mapModal, isOpen: false });
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    const sizeFactor = map.size_factor || 100;
    const pixelX = getMapPercentage(mapModal.x, sizeFactor);
    const pixelY = getMapPercentage(mapModal.y, sizeFactor);

    const mapName = getLocalizedText(data.places[map.placename_id || mapModal.mapId], lang);
    const title = mapModal.itemName ? `${mapModal.itemName} - ${mapName}` : mapName;
    const mapImage = map.image ? (map.image.includes('xivapi.com') ? map.image : `https://xivapi.com${map.image.startsWith('/') ? '' : '/'}${map.image}`) : `https://xivapi.com/m/${mapModal.mapId}/${mapModal.mapId}.00.jpg`;

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={handleBackdropClick}
        >
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 truncate pr-4">{title}</h3>
                    <button
                        onClick={handleClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600/50"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <div className="p-4 overflow-y-auto">
                    <div className="relative aspect-square bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner">
                        <img
                            src={mapImage}
                            alt={title}
                            className="w-full h-full object-contain"
                            loading="eager"
                        />

                        {/* Pulsing Marker */}
                        {(() => {
                           let iconKey: GatherType = 'mining';
                           if (mapModal.type === 0) iconKey = 'mining';
                           else if (mapModal.type === 1) iconKey = 'quarrying';
                           else if (mapModal.type === 2) iconKey = 'harvesting';
                           else if (mapModal.type === 3) iconKey = 'logging';
                           
                           const iconUrl = GATHERING_ICONS[iconKey];
                           // Color: Unified Light Blue
                           const pulseColor = 'bg-blue-400';

                           return (
                                <div
                                    className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center"
                                    style={{ left: `${pixelX}%`, top: `${pixelY}%` }}
                                >
                                    {/* Background Circle */}
                                    <div className="absolute inset-0 bg-blue-100 rounded-full opacity-60 shadow-sm transform scale-125"></div>

                                    {/* Breathing/Pulse Effect */}
                                    <div className={`absolute inset-0 rounded-full opacity-60 animate-ping ${pulseColor}`}></div>
                                    <div className={`absolute inset-1 rounded-full opacity-40 animate-pulse ${pulseColor} blur-[2px]`}></div>

                                    {/* Icon */}
                                    <img 
                                        src={iconUrl}
                                        className="relative z-10 w-full h-full object-contain drop-shadow-lg"
                                        alt="" 
                                    />
                                </div>
                           );
                        })()}
                    </div>

                    <div className="mt-3 text-center text-slate-600 dark:text-slate-400 font-mono text-sm">
                        X: {mapModal.x.toFixed(1)}, Y: {mapModal.y.toFixed(1)}
                    </div>
                </div>
            </div>
        </div>
    );
};
