/**
 * Host callbacks for the widget chrome. The chart never talks to Redux —
 * the client (or any host) assigns these and implements the action.
 * A button is rendered only when its handler is set, except chat download,
 * which stays available and falls back to the `ui9000-download` event.
 */
export type WidgetHeaderHandlers = {
  onOpenChat?: () => void;
  onViewAsTable?: () => void;
  onProvideFeedback?: () => void;
  onSaveToReport?: () => void;
  onDownloadImage?: () => void;
  onRemove?: () => void;
  onOpenSettings?: () => void;
};

/** `chat` = MCP / charts iframe. `dash` = FuseDash dashboard widget. */
export type WidgetHeaderVariant = 'chat' | 'dash';

export type HeaderMenuItem = {
  id: string;
  label: string;
  /** Chat download with no host handler emits `ui9000-download`. */
  fallbackDownload?: boolean;
};

export type HeaderChrome = {
  variant: WidgetHeaderVariant;
  showChat: boolean;
  showSettings: boolean;
  showMenu: boolean;
  showRemove: boolean;
  items: HeaderMenuItem[];
};

export function resolveHeaderVariant(
  value: string | null | undefined,
): WidgetHeaderVariant {
  return value === 'dash' ? 'dash' : 'chat';
}

export function resolveHeaderChrome(
  variant: WidgetHeaderVariant,
  handlers: WidgetHeaderHandlers,
): HeaderChrome {
  if (variant === 'chat') {
    return {
      variant,
      showChat: false,
      showSettings: false,
      showMenu: true,
      showRemove: false,
      items: [
        {
          id: 'download-image',
          label: 'Download image',
          fallbackDownload: !handlers.onDownloadImage,
        },
      ],
    };
  }

  const items: HeaderMenuItem[] = [];
  if (handlers.onViewAsTable) items.push({ id: 'view-table', label: 'View as table' });
  if (handlers.onProvideFeedback) {
    items.push({ id: 'provide-feedback', label: 'Provide feedback' });
  }
  if (handlers.onSaveToReport) items.push({ id: 'save-report', label: 'Add to page' });
  if (handlers.onDownloadImage) {
    items.push({ id: 'download-image', label: 'Download image' });
  }

  const showRemove = !!handlers.onRemove;
  return {
    variant,
    showChat: !!handlers.onOpenChat,
    showSettings: !!handlers.onOpenSettings,
    showMenu: items.length > 0 || showRemove,
    showRemove,
    items,
  };
}

export function headerMenuHandler(
  item: HeaderMenuItem,
  handlers: WidgetHeaderHandlers,
): (() => void) | undefined {
  switch (item.id) {
    case 'view-table':
      return handlers.onViewAsTable;
    case 'provide-feedback':
      return handlers.onProvideFeedback;
    case 'save-report':
      return handlers.onSaveToReport;
    case 'download-image':
      return handlers.onDownloadImage;
    default:
      return undefined;
  }
}
