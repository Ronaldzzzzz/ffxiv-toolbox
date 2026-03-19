import React from 'react';
import { GatheringItemEntry, GatheringData, NodeData } from '../types';
import { getLocalizedText, calculateNodeStatus, formatSeconds } from '../utils';
import { useLanguage } from '../../../i18n/LanguageContext';
import { useTool } from '../../../context/ToolContext';
import { AlarmButton } from './AlarmButton';

interface ItemRowProps {
  item: GatheringItemEntry;
  data: GatheringData;
  isCompleted: boolean;
  isBookmarked: boolean;
  toggleComplete: (id: number) => void;
  toggleBookmark: (id: number) => void;
  className?: string;
  disableHover?: boolean;
  disableGrayscale?: boolean;
}

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`transition-colors flex items-center justify-center w-6 h-6 rounded hover:bg-slate-100 dark:hover:bg-slate-700 ${copied ? 'text-green-500' : 'text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300'}`}
      title={copied ? "Copied!" : "Copy Name"}
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
      )}
    </button>
  );
};

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

export const ItemRow: React.FC<ItemRowProps> = ({
  item, data, isCompleted, isBookmarked, toggleComplete, toggleBookmark, className, disableHover, disableGrayscale
}) => {
  const { lang, t: i18n } = useLanguage();
  const { setMapModal } = useTool();
  const itemInfo = data.items[item.itemId];
  const iconPath = data.icons[item.itemId];
  const iconUrl = iconPath ? `https://xivapi.com${iconPath}` : 'https://xivapi.com/i/066000/066313_hr1.png';

  const itemNodes: NodeData[] = Object.values(data.nodes).filter(node =>
    node.items.includes(item.itemId) && node.map !== 0
  );

  const isCrystal = item.itemId >= 2 && item.itemId <= 19;
  const isTimed = itemNodes.some(n => n.spawns && n.spawns.length > 0);

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
        <img
          src={iconUrl}
          alt=""
          className="w-10 h-10 rounded border border-slate-300 dark:border-slate-600 shadow-sm shrink-0 bg-slate-800"
          loading="lazy"
        />

        <div className="flex-grow min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-800 dark:text-slate-100 item-name text-base leading-tight">
              {getLocalizedText(itemInfo, lang)}
            </span>
            <div className="flex items-center gap-1">
              <CopyButton text={getLocalizedText(itemInfo, lang)} />
              <button
                onClick={(e) => { e.stopPropagation(); toggleBookmark(item.itemId); }}
                className={`transition-colors flex items-center justify-center w-6 h-6 rounded hover:bg-slate-100 dark:hover:bg-slate-700 ${isBookmarked ? 'text-yellow-500' : 'text-slate-300 dark:text-slate-600 hover:text-yellow-500'}`}
                title="Bookmark"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              </button>
              {isTimed && <AlarmButton itemId={item.itemId} />}
            </div>
            {item.stars > 0 && (
              <span className="text-yellow-500 text-xs border border-yellow-500/30 px-1 rounded">★{item.stars}</span>
            )}
            {item.hidden === 1 && (
              <span className="text-red-400 text-xs border border-red-400/30 px-1 rounded">Hidden</span>
            )}
          </div>

          <div className="mt-1 space-y-0.5">
            {isCrystal ? (
              <div className="text-xs text-slate-400 opacity-75 italic">📍 {i18n.pages.gathering_log.omitted}</div>
            ) : (
              (() => {
                const validNodes = itemNodes.filter(node => data.maps[node.map]);

                if (validNodes.length > 0) {
                  return validNodes.map((node, idx) => {
                    const map = data.maps[node.map];
                    const mapName = getLocalizedText(data.places[map.placename_id], lang);
                    const subZoneName = (node.zoneid && data.places[node.zoneid]) ? getLocalizedText(data.places[node.zoneid], lang) : '';
                    const placeName = (subZoneName && subZoneName !== mapName) ? `${mapName} - ${subZoneName}` : mapName;

                    return (
                      <div key={idx} className="text-xs text-slate-500 dark:text-slate-400 flex flex-col gap-1 mt-1">
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
                } else {
                  return <div className="text-xs text-slate-400">📍 未知區域</div>;
                }
              })()
            )}
          </div>

          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
            Lv. {item.lvl}
          </div>
        </div>
      </div>
    </div>
  );
};
