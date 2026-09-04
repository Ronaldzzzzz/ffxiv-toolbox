import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GatheringItemEntry, GatheringData, NodeData } from '../types';
import { getLocalizedText, calculateNodeStatus, formatSeconds, CRYSTAL_RELATED_ACHIEVEMENT_EXCLUDED_IDS, getItemIconUrl } from '../utils';
import { useLanguage } from '../../../i18n/LanguageContext';
import { useTool } from '../../../context/ToolContext';
import { AlarmButton, ITEM_ACTION_BUTTON_BASE_CLASS, ITEM_ACTION_ICON_CLASS } from './AlarmButton';
import { LazyImage } from './LazyImage';
import { CopyNameButton } from './shared/CopyNameButton';
import { CollectibleIcon, ItemBadges } from './shared/ItemBadges';

interface ItemRowProps {
  item: GatheringItemEntry;
  data: GatheringData;
  isCompleted: boolean;
  isBookmarked: boolean;
  isAlarmTracked: boolean;
  toggleComplete: (id: number) => void;
  toggleBookmark: (id: number) => void;
  toggleAlarm: (id: number) => void;
  className?: string;
  disableHover?: boolean;
  disableGrayscale?: boolean;
  autoBookmarkOnAlarm?: boolean;
}

const NodeTimer: React.FC<{ spawns: number[]; duration: number; i18n: any }> = ({ spawns, duration, i18n }) => {
  const [status, setStatus] = React.useState<{
    isActive: boolean;
    label: string;
    progress: number;
    nextSpawnStr: string;
    remainingSeconds: number;
  } | null>(null);

  React.useEffect(() => {
    const update = () => {
      // Use the centralized status calculator for consistency
      const nodeStatus = calculateNodeStatus(spawns, duration);

      if (nodeStatus.status === 'active') {
        setStatus({
          isActive: true,
          label: formatSeconds(nodeStatus.secondsRemaining),
          progress: 100 - nodeStatus.progressPercent,
          nextSpawnStr: '',
          remainingSeconds: nodeStatus.secondsRemaining
        });
      } else {
        // Waiting state
        // Visual bar for waiting: Max reference 3 Eorzea Hours ~ 262s.
        // If wait is long, bar is full. Shrinks as it gets closer.
        const waitProgress = Math.min(100, (nodeStatus.secondsUntil / 262) * 100);

        setStatus({
          isActive: false,
          label: formatSeconds(nodeStatus.secondsUntil),
          progress: waitProgress,
          nextSpawnStr: nodeStatus.spawnTime,
          remainingSeconds: 0
        });
      }
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [spawns, duration]);

  // Remove local formatTime since we use global formatSeconds now
  // But wait, user might prefer local if formatSeconds is in mm:ss and here we want mm m ss s?
  // User asked for "precise to seconds". mm:ss is cleaner. I'll stick to formatSeconds.

  const getUrgency = (secs: number) => {
    // < 30s: Critical (Red)
    if (secs < 30) return { color: 'bg-red-500', darkColor: 'dark:bg-red-600', circleColor: 'bg-red-500', pulseSpeed: '0.5s' };
    // < 80s: Warning (Yellow)
    if (secs < 80) return { color: 'bg-amber-400', darkColor: 'dark:bg-amber-500', circleColor: 'bg-amber-400', pulseSpeed: '1s' };
    // Normal (Green)
    return { color: 'bg-green-500', darkColor: 'dark:bg-green-500', circleColor: 'bg-green-500', pulseSpeed: '2s' };
  };

  if (!status) return <span className="text-slate-400 text-xs text-mono">Loading...</span>;

  const urgency = status.isActive ? getUrgency(status.remainingSeconds) : null;

  return (
    <div className="w-64">
      {status.isActive && urgency ? (
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${urgency.circleColor} shadow-sm animate-pulse shrink-0`}
            style={{ animationDuration: urgency.pulseSpeed }}
          />
          <div className="relative flex-grow h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
            <div
              className={`absolute top-0 left-0 h-full ${urgency.color} ${urgency.darkColor} transition-all duration-1000 ease-linear`}
              style={{ width: `${status.progress}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white drop-shadow-md z-10 leading-none tracking-wide">
              {i18n.pages.gathering_log.active}: {status.label}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="shrink-0 text-slate-400 dark:text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
          <div className="relative flex-grow h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
            <div
              className="absolute top-0 left-0 h-full bg-slate-400 dark:bg-slate-500 transition-all duration-1000 ease-linear"
              style={{ width: `${status.progress}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white drop-shadow-sm z-10 leading-none tracking-wide">
              {i18n.pages.gathering_log.wait}: {status.label}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export const ItemRow: React.FC<ItemRowProps> = React.memo(({
  item, data, isCompleted, isBookmarked, isAlarmTracked, toggleComplete, toggleBookmark, toggleAlarm, className, disableHover, disableGrayscale, autoBookmarkOnAlarm = true
}) => {
  const { lang, t: i18n } = useLanguage();
  const { setMapModal } = useTool();
  const itemInfo = data.items[item.itemId];
  const isCollectible = Boolean(itemInfo?.isCollectible);
  const isCustomDelivery = itemInfo?.isCustomDelivery === true;
  const isAetherialReduction = itemInfo?.isAetherialReduction === true;
  const showCollectibleIcon = isCollectible || isCustomDelivery;
  const iconUrl = getItemIconUrl(item.itemId, data.icons);

  const itemNodes: NodeData[] = (data.preIndex?.nodesByItemId[item.itemId] ?? [])
    .filter(node => node.map !== 0);

  const isCrystal = CRYSTAL_RELATED_ACHIEVEMENT_EXCLUDED_IDS.has(item.itemId);
  const isTimed = itemNodes.some(n => n.spawns && n.spawns.length > 0);

  const [showLocationPopover, setShowLocationPopover] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<{ top: number; left: number; arrowLeft: number; placement: 'top' | 'bottom' } | null>(null);
  const omittedButtonRef = useRef<HTMLButtonElement | null>(null);
  const locationPopoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showLocationPopover) return undefined;

    const handlePointerDownOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      const clickedTrigger = omittedButtonRef.current?.contains(target);
      const clickedPopup = locationPopoverRef.current?.contains(target);
      if (!clickedTrigger && !clickedPopup) {
        setShowLocationPopover(false);
      }
    };

    // Scroll events from the popover's own scrollable location list are
    // captured here too (capture-phase listeners see them on the way down
    // regardless of bubbling) — ignore those so scrolling the list doesn't
    // immediately close it. Only a scroll elsewhere (the page behind it)
    // should close, since that invalidates the anchored position.
    const handleScroll = (event: Event) => {
      if (locationPopoverRef.current?.contains(event.target as Node)) return;
      setShowLocationPopover(false);
    };
    const handleResize = () => setShowLocationPopover(false);

    document.addEventListener('pointerdown', handlePointerDownOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [showLocationPopover]);

  const handleOmittedClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showLocationPopover) {
      setShowLocationPopover(false);
      return;
    }

    const rect = omittedButtonRef.current?.getBoundingClientRect();
    if (rect) {
      const POPOVER_WIDTH = 384; // matches w-96
      const POPOVER_MAX_HEIGHT = 320; // matches max-h-80
      const VIEWPORT_MARGIN = 8;

      let left = rect.left;
      const maxLeft = window.innerWidth - POPOVER_WIDTH - VIEWPORT_MARGIN;
      if (left > maxLeft) left = Math.max(VIEWPORT_MARGIN, maxLeft);

      const placeBelow = rect.bottom + POPOVER_MAX_HEIGHT + VIEWPORT_MARGIN <= window.innerHeight;

      setPopoverStyle({
        top: placeBelow ? rect.bottom + 8 : rect.top - 8,
        left,
        arrowLeft: Math.min(POPOVER_WIDTH - 16, Math.max(16, rect.left + rect.width / 2 - left)),
        placement: placeBelow ? 'bottom' : 'top',
      });
    }
    setShowLocationPopover(true);
  };

  const renderLocationList = (nodesToRender: NodeData[]) => {
    const validNodes = nodesToRender.filter(node => data.maps[node.map]);

    if (validNodes.length === 0) {
      return <div className="text-xs text-slate-400">📍 未知區域</div>;
    }

    return validNodes.map((node, idx) => {
      const map = data.maps[node.map];
      const mapName = getLocalizedText(data.places[map.placename_id], lang);
      const subZoneName = (node.zoneid && data.places[node.zoneid]) ? getLocalizedText(data.places[node.zoneid], lang) : '';
      const placeName = (subZoneName && subZoneName !== mapName) ? `${mapName} - ${subZoneName}` : mapName;

      return (
        <div key={idx} className="text-xs text-slate-500 dark:text-slate-400 flex flex-col gap-1 mt-1 first:mt-0">
          <div className="flex flex-wrap items-center gap-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (node.x && node.y) {
                  setMapModal({
                    isOpen: true,
                    mapId: node.map,
                    x: node.x,
                    y: node.y,
                    itemName: getLocalizedText(itemInfo, lang),
                    type: node.type
                  });
                }
              }}
              className="flex items-center gap-1 opacity-75 hover:text-blue-500 hover:opacity-100 font-medium cursor-pointer transition-all text-left"
              title="View on Map"
            >
              <span>📍 {placeName}</span>
              {node.x && node.y && <span className="font-mono text-xs opacity-80">(X:{node.x}, Y:{node.y})</span>}
            </button>
          </div>
          {node.spawns && node.spawns.length > 0 && (
            <div className="flex items-center gap-2 w-full">
              <span className="text-amber-600 dark:text-amber-500 font-mono text-[10px] border border-amber-200 dark:border-amber-800 px-1 rounded bg-amber-50 dark:bg-amber-900/20 shrink-0">
                {node.spawns.map(h => `${String(h).padStart(2, '0')}:00`).join(', ')}
              </span>
              <NodeTimer spawns={node.spawns} duration={node.duration || 55} i18n={i18n} />
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className={`group flex items-start p-3 md:p-3 transition-all ${disableHover ? '' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'} ${isCompleted && !disableGrayscale ? 'checked-item bg-slate-50/50 dark:bg-slate-800/30' : ''} ${className || ''}`}>
      <div className="mr-3 shrink-0 flex items-center justify-center self-center min-h-[40px] min-w-[40px] md:min-h-0 md:min-w-0 -ml-2 md:ml-0">
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={() => toggleComplete(item.itemId)}
          className="custom-checkbox w-6 h-6 md:w-5 md:h-5 cursor-pointer text-slate-800 dark:text-slate-200"
        />
      </div>

      <div className="flex-grow min-w-0 flex items-center gap-3">
        <LazyImage
          src={iconUrl}
          alt=""
          className="w-10 h-10 rounded border border-slate-300 dark:border-slate-600 shadow-sm shrink-0"
        />

        <div className="flex-grow min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <span className="text-slate-800 dark:text-slate-100 item-name text-base leading-tight truncate">
                {getLocalizedText(itemInfo, lang)}
              </span>
              {showCollectibleIcon && <CollectibleIcon />}
            </div>
            <ItemBadges
              isCustomDelivery={isCustomDelivery}
              isAetherialReduction={isAetherialReduction}
              isHidden={item.hidden === 1}
              badgeClassName="shrink-0"
            />
            <div className="flex items-center gap-1 shrink-0 ml-auto pl-1">
              <CopyNameButton text={getLocalizedText(itemInfo, lang)} />
              <button
                onClick={(e) => { e.stopPropagation(); toggleBookmark(item.itemId); }}
                className={`${ITEM_ACTION_BUTTON_BASE_CLASS} ${isBookmarked ? 'text-yellow-500' : 'text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300'}`}
                title="Bookmark"
              >
                <svg className={ITEM_ACTION_ICON_CLASS} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              </button>
              {isTimed && (
                <AlarmButton
                  itemId={item.itemId}
                  isTracked={isAlarmTracked}
                  onToggleTracked={toggleAlarm}
                  autoBookmarkOnEnable={autoBookmarkOnAlarm}
                  isBookmarked={isBookmarked}
                  onToggleBookmark={toggleBookmark}
                />
              )}
            </div>
            {item.stars > 0 && (
              <span className="text-yellow-500 text-xs border border-yellow-500/30 px-1 rounded">★{item.stars}</span>
            )}
          </div>

          <div className="mt-1 space-y-0.5">
            {isCrystal ? (
              <button
                ref={omittedButtonRef}
                onClick={handleOmittedClick}
                title={i18n.pages.gathering_log.omitted_hint}
                className={`text-xs opacity-75 italic underline decoration-dotted decoration-slate-400 underline-offset-2 transition-colors ${showLocationPopover ? 'text-blue-500 opacity-100' : 'text-slate-400 hover:text-blue-500 hover:opacity-100'}`}
              >
                📍 {i18n.pages.gathering_log.omitted}
              </button>
            ) : (
              renderLocationList(itemNodes)
            )}
          </div>

          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
            Lv. {item.lvl}
          </div>
        </div>
      </div>

      {isCrystal && showLocationPopover && popoverStyle && createPortal(
        // Outer wrapper carries only position (no overflow) so the arrow —
        // which sits partly outside the inner box — never gets clipped by
        // the inner box's own overflow-y-auto (setting overflow-y forces
        // overflow-x to clip too per the CSS overflow spec, cutting off
        // anything positioned outside on either axis).
        <div
          ref={locationPopoverRef}
          className="fixed z-[120] w-96"
          style={{
            top: popoverStyle.top,
            left: popoverStyle.left,
            transform: popoverStyle.placement === 'top' ? 'translateY(-100%)' : undefined,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Arrow pointing back at the trigger button: an outer border-colored
              triangle plus a slightly smaller inner fill triangle, offset by
              1px, gives the arrow a visible 1px outline against any background. */}
          <div
            className={`absolute w-0 h-0 border-l-[7px] border-r-[7px] border-l-transparent border-r-transparent ${popoverStyle.placement === 'bottom'
              ? '-top-[7px] border-b-[7px] border-b-slate-300 dark:border-b-slate-500'
              : '-bottom-[7px] border-t-[7px] border-t-slate-300 dark:border-t-slate-500'
              }`}
            style={{ left: popoverStyle.arrowLeft - 7 }}
          />
          <div
            className={`absolute w-0 h-0 border-l-[6px] border-r-[6px] border-l-transparent border-r-transparent ${popoverStyle.placement === 'bottom'
              ? '-top-[6px] border-b-[6px] border-b-white dark:border-b-slate-800'
              : '-bottom-[6px] border-t-[6px] border-t-white dark:border-t-slate-800'
              }`}
            style={{ left: popoverStyle.arrowLeft - 6 }}
          />

          <div className="max-h-80 overflow-y-auto thin-scrollbar rounded-lg shadow-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3">
            {/* Sticky header: -mx-3/-mt-3 cancel the box's own padding so the
                opaque background spans full width (edge to edge) instead of
                leaving a gap at the sides where scrolled-past rows would
                otherwise show through. */}
            {/* z-20: must beat the z-10 countdown-label spans inside NodeTimer
                below it — those live at the same stacking level (no positioned
                ancestor sits between them and this header), so on a z-index
                tie the later-in-DOM element (a scrolled-past timer row) wins
                and paints over this header instead of the other way around. */}
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 sticky -top-3 -mx-3 -mt-3 z-20 px-3 pt-3 pb-2 mb-2 rounded-t-lg bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 shadow-sm">
              <img src={iconUrl} alt="" className="w-4 h-4 rounded shrink-0" />
              <span className="truncate">{getLocalizedText(itemInfo, lang)}</span>
              <span className="ml-auto shrink-0 text-[10px] font-normal text-slate-400">{i18n.pages.gathering_log.all_locations}</span>
            </div>
            {renderLocationList(itemNodes)}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});
