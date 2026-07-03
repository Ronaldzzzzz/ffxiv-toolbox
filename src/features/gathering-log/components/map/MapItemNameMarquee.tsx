import React, { useLayoutEffect, useRef, useState } from 'react';

/**
 * Item name label that marquee-scrolls when it overflows its clip container.
 * Extracted from MapView.tsx (mechanical move, no behavior change).
 */
export const MapItemNameMarquee: React.FC<{ text: string; children?: React.ReactNode }> = ({ text, children }) => {
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
