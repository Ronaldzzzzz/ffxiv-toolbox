import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookmarkGroup } from '../types';
import { useLanguage } from '../../../i18n/LanguageContext';

interface GroupHeaderProps {
  group: BookmarkGroup;
  itemCount: number;
  inlineContent?: React.ReactNode;
  onCollapse?: (groupId: string, collapsed: boolean) => void;
  onRename?: (groupId: string, newName: string) => void;
  onDelete?: (groupId: string) => void;
}

export const GroupHeader: React.FC<GroupHeaderProps> = ({
  group,
  itemCount,
  inlineContent,
  onCollapse,
  onRename,
  onDelete,
}) => {
  /** True when neither rename nor delete is available — e.g. ungrouped sections. */
  const isReadOnly = !onRename && !onDelete;
  const { t: i18n } = useLanguage();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState(group.name);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuPopupRef = useRef<HTMLDivElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    if (!showContextMenu) {
      return undefined;
    }

    const handlePointerDownOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      const clickedTrigger = menuContainerRef.current?.contains(target);
      const clickedPopup = menuPopupRef.current?.contains(target);
      if (!clickedTrigger && !clickedPopup) {
        setShowContextMenu(false);
      }
    };

    const handleViewportChange = () => {
      setShowContextMenu(false);
    };

    document.addEventListener('pointerdown', handlePointerDownOutside);
    window.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('resize', handleViewportChange);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside);
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [showContextMenu]);

  const handleCollapseClick = () => {
    if (onCollapse) {
      onCollapse(group.id, !group.collapsed);
    }
  };

  const handleRenameStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isReadOnly) {
      setShowContextMenu(false);
      setIsEditingName(true);
      setEditingNameValue(group.name);
    }
  };

  const handleRenameSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingNameValue.trim() && onRename) {
      onRename(group.id, editingNameValue.trim());
    }
    setShowContextMenu(false);
    setIsEditingName(false);
  };

  const handleRenameCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowContextMenu(false);
    setIsEditingName(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && confirm(i18n.pages.gathering_log.confirm_delete_group || '確定刪除此群組嗎？')) {
      onDelete(group.id);
    }
    setShowContextMenu(false);
  };

  const handleContextMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isReadOnly) {
      if (showContextMenu) {
        setShowContextMenu(false);
        return;
      }

      const rect = menuButtonRef.current?.getBoundingClientRect();
      if (rect) {
        setMenuPosition({
          top: rect.bottom + 4,
          left: rect.right,
        });
      }
      setShowContextMenu(true);
    }
  };

  return (
    <div className="group relative">
      <div
        className="px-4 py-3 bg-slate-100 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600 flex items-center justify-between gap-3 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
      >
        {/* Collapse Button */}
        <button
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          title={group.collapsed ? i18n.pages.gathering_log.expand : i18n.pages.gathering_log.collapse}
          onClick={(e) => {
            e.stopPropagation();
            handleCollapseClick();
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: group.collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              transition: 'transform 200ms ease-out',
            }}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        {/* Group Name */}
        <div
          className={`flex-1 min-w-0 ${isEditingName ? '' : 'cursor-pointer'}`}
          onClick={isEditingName ? undefined : (e) => {
            e.stopPropagation();
            handleCollapseClick();
          }}
        >
          {isEditingName ? (
            <input
              type="text"
              value={editingNameValue}
              onChange={(e) => setEditingNameValue(e.target.value)}
              className="w-full px-2 py-1 bg-white dark:bg-slate-600 border border-blue-400 dark:border-blue-500 rounded text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameSave(e as unknown as React.MouseEvent);
                } else if (e.key === 'Escape') {
                  handleRenameCancel(e as unknown as React.MouseEvent);
                }
              }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              {group.name || i18n.pages.gathering_log.group_unnamed}
            </h3>
          )}
        </div>

        {inlineContent && (
          <div className="min-w-0 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {inlineContent}
          </div>
        )}

        {/* Item Count */}
        <span className="flex-shrink-0 text-xs font-medium text-slate-600 dark:text-slate-400 px-2 py-1 bg-slate-200 dark:bg-slate-600 rounded">
          {itemCount}
        </span>

        {/* Action Buttons (visible on hover or edit mode) */}
        <div
          className={`flex-shrink-0 transition-opacity flex items-center gap-1 ${showContextMenu || isEditingName ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {isEditingName && (
            <>
              <button
                type="button"
                className="w-6 h-6 flex items-center justify-center text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                onClick={handleRenameSave}
                onMouseDown={(e) => e.stopPropagation()}
                title={i18n.pages.gathering_log.save}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </button>
              <button
                type="button"
                className="w-6 h-6 flex items-center justify-center text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                onClick={handleRenameCancel}
                onMouseDown={(e) => e.stopPropagation()}
                title={i18n.pages.gathering_log.cancel}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </>
          )}

          {!isEditingName && !isReadOnly && (
            <div
              ref={menuContainerRef}
              className="relative"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                ref={menuButtonRef}
                type="button"
                className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
                onClick={handleContextMenuClick}
                onMouseDown={(e) => e.stopPropagation()}
                title={i18n.pages.gathering_log.more_options}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="5" r="1"></circle>
                  <circle cx="12" cy="12" r="1"></circle>
                  <circle cx="12" cy="19" r="1"></circle>
                </svg>
              </button>

            </div>
          )}
        </div>
      </div>
      {showContextMenu && createPortal(
        <div
          ref={menuPopupRef}
          className="fixed z-[120] min-w-max -translate-x-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded shadow-lg"
          style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700"
            onClick={handleRenameStart}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {i18n.pages.gathering_log.group_rename}
          </button>
          <button
            type="button"
            className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            onClick={handleDeleteClick}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {i18n.pages.gathering_log.group_delete}
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
};
