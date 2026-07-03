import React from 'react';
import { UI_ICON_URLS } from '../../utils';
import { useLanguage } from '../../../../i18n/LanguageContext';

/**
 * Collectible icon shown next to an item name.
 * Shared by ItemRow / TimedView / MapView.
 */
export const CollectibleIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4 shrink-0' }) => {
  const { t: i18n } = useLanguage();
  return (
    <img
      src={UI_ICON_URLS.collectible}
      className={className}
      alt="Collectible"
      title={i18n.pages.gathering_log.collectible_tag}
    />
  );
};

interface ItemBadgesProps {
  isCustomDelivery?: boolean;
  isAetherialReduction?: boolean;
  /** Map sidebar only */
  isCollectionOnly?: boolean;
  isHidden?: boolean;
  /** Extra classes appended to each badge (e.g. 'shrink-0' in rows, 'not-italic' in map sidebar) */
  badgeClassName?: string;
}

/**
 * Custom-delivery / aetherial-reduction / collection-only / hidden badges.
 * Shared by ItemRow / TimedView / MapView (previously three JSX copies).
 */
export const ItemBadges: React.FC<ItemBadgesProps> = ({
  isCustomDelivery,
  isAetherialReduction,
  isCollectionOnly,
  isHidden,
  badgeClassName = '',
}) => {
  const { t: i18n } = useLanguage();

  return (
    <>
      {isCustomDelivery && (
        <span className={`inline-flex items-center gap-1 text-[10px] px-1 rounded border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 w-fit ${badgeClassName}`}>
          <img
            src={UI_ICON_URLS.customDelivery}
            className="w-3 h-3"
            alt="Custom Delivery"
            title={i18n.pages.gathering_log.custom_delivery_tag}
          />
          {i18n.pages.gathering_log.custom_delivery_tag}
        </span>
      )}
      {isAetherialReduction && (
        <span className={`text-[10px] px-1 rounded border border-teal-300 dark:border-teal-700 text-teal-600 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/20 w-fit ${badgeClassName}`}>
          {i18n.pages.gathering_log.aetherial_reduction_tag}
        </span>
      )}
      {isCollectionOnly && (
        <span className={`text-[10px] px-1 rounded border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 w-fit ${badgeClassName}`}>
          {i18n.pages.gathering_log.collection_only_tag}
        </span>
      )}
      {isHidden && (
        <span className={`inline-flex items-center text-[10px] px-1 rounded border border-red-300 dark:border-red-700 text-red-500 dark:text-red-300 bg-red-50 dark:bg-red-900/20 w-fit ${badgeClassName}`}>
          {i18n.pages.gathering_log.hidden_tag}
        </span>
      )}
    </>
  );
};
