import { useCallback, useState } from 'react';

export interface DragState {
    dragItemId: number | null;
    dropContainerId: string | null;
    dropBeforeItemId: number | null;
}

export function useBookmarkDragAndDrop() {
    const [dragItemId, setDragItemId] = useState<number | null>(null);
    const [dropContainerId, setDropContainerId] = useState<string | null>(null);
    const [dropBeforeItemId, setDropBeforeItemId] = useState<number | null>(null);

    const clearDragState = useCallback(() => {
        setDragItemId(null);
        setDropContainerId(null);
        setDropBeforeItemId(null);
    }, []);

    /** Auto-scroll the window when dragging near the top or bottom edge. */
    const maybeAutoScrollOnDrag = useCallback((clientY: number) => {
        const edge = 140;
        const step = 18;
        if (clientY < edge) {
            window.scrollBy({ top: -step, behavior: 'auto' });
        } else if (clientY > window.innerHeight - edge) {
            window.scrollBy({ top: step, behavior: 'auto' });
        }
    }, []);

    return {
        dragItemId,
        setDragItemId,
        dropContainerId,
        setDropContainerId,
        dropBeforeItemId,
        setDropBeforeItemId,
        clearDragState,
        maybeAutoScrollOnDrag,
    };
}
