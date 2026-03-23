import React from 'react';
import { useAlarm } from '../hooks/useAlarm';

export const ITEM_ACTION_BUTTON_BASE_CLASS = 'group/action transition-all duration-200 ease-out flex items-center justify-center w-6 h-6 rounded-md hover:bg-slate-200/80 dark:hover:bg-slate-600/80 hover:scale-110 active:scale-95 flex-shrink-0';
export const ITEM_ACTION_ICON_CLASS = 'transition-transform duration-200 ease-out group-hover/action:scale-105';

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
            className={`${ITEM_ACTION_BUTTON_BASE_CLASS} ${isTracked ? 'text-blue-500' : 'text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300'}`}
            title="Alarm Tracker"
        >
            <svg className={ITEM_ACTION_ICON_CLASS} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={isTracked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
        </button>
    );
};
