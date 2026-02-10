import React from 'react';
import { useTool } from '../../../context/ToolContext';
import { GatheringData } from '../types';
import { getLocalizedText } from '../utils';
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

    // Calculate Marker Position
    const sizeFactor = map.size_factor || 100;
    const c = sizeFactor / 100;
    const x = mapModal.x;
    const y = mapModal.y;

    const pixelX = ((x - 1) * c / 41 + 1) / 42 * 100;
    const pixelY = ((y - 1) * c / 41 + 1) / 42 * 100;

    const mapName = getLocalizedText(data.places[map.placename_id || mapModal.mapId], lang);
    const title = mapModal.itemName ? `${mapModal.itemName} - ${mapName}` : mapName;
    const mapImage = map.image || `https://xivapi.com/m/${mapModal.mapId}/${mapModal.mapId}.00.jpg`;

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
                        <div
                            className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                            style={{ left: `${pixelX}%`, top: `${pixelY}%` }}
                        >
                            <div className="w-full h-full bg-red-500 rounded-full animate-ping opacity-75"></div>
                            <div className="absolute inset-0 bg-red-600 rounded-full border-2 border-white shadow-lg"></div>
                        </div>
                    </div>

                    <div className="mt-3 text-center text-slate-600 dark:text-slate-400 font-mono text-sm">
                        X: {x.toFixed(1)}, Y: {y.toFixed(1)}
                    </div>
                </div>
            </div>
        </div>
    );
};
