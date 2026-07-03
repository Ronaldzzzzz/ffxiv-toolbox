import { useEffect, useState } from 'react';

export interface LineCoords {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

/**
 * Tracks the dashed connection line between the active map marker and its
 * sidebar card. Runs a requestAnimationFrame loop while a node is active so
 * the line follows scrolling. Extracted from MapView.tsx.
 */
export function useNodeConnectionLine(
    activeNodeId: number | string | null,
    containerRef: React.RefObject<HTMLDivElement | null>,
    markerRefs: React.MutableRefObject<Record<string | number, HTMLDivElement | null>>,
    sidebarRefs: React.MutableRefObject<Record<string | number, HTMLDivElement | null>>,
) {
    const [lineCoords, setLineCoords] = useState<LineCoords | null>(null);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps -- refs are stable containers
    }, [activeNodeId]);

    return { lineCoords, clearLineCoords: () => setLineCoords(null) };
}
