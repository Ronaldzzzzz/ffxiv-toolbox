import React from 'react';
import { useAlarm } from '../hooks/useAlarm';

interface AlarmButtonProps {
    itemId: number;
}

export const AlarmButton: React.FC<AlarmButtonProps> = ({ itemId }) => {
    const { trackedItems, toggleTrackedItem } = useAlarm();
    const isTracked = trackedItems.includes(itemId);

    return (
        <button
            onClick={(e) => { 
                e.stopPropagation(); 
                toggleTrackedItem(itemId); 
            }}
            className={`transition-colors flex items-center justify-center w-5 h-5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 ${isTracked ? 'text-blue-500' : 'text-slate-300 dark:text-slate-600 hover:text-blue-500'}`}
            title="Alarm Tracker"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={isTracked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
        </button>
    );
};
