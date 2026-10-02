# Theming

Charts take their theme from the host. The chart payload has no `theme` field.

```ts
import { applyWidgetContext } from '@fusedashlabs/widgets/context';

applyWidgetContext(document.documentElement, { mode: 'dark' });
```

`mode` is `'light'`, `'dark'`, or `'auto'`. `auto` follows `prefers-color-scheme`. The written `--ui9000-mode` is always the resolved `light` or `dark`.

Dark ink is painted only when `--ui9000-color-surface` is set on the chart or an ancestor. `data-theme="dark"` without that variable keeps the light card and the light ink.

## Precedence

`resolveElementMode` walks the element, then its ancestors:

1. Inline `--ui9000-mode` of `light` or `dark`.
2. Computed `--ui9000-mode`, when no inline value was found.
3. The nearest `data-theme="light"` or `data-theme="dark"`.
4. `prefers-color-scheme: dark`.
5. Light.

## Tokens

Dark values are the FuseDash shell neutrals. Series colors stay the light palette.

| Variable | Light | Dark |
|---|---|---|
| `--ui9000-color-surface` | `#ffffff` | `#13161D` |
| `--ui9000-color-surface-muted` | `#f3f4f6` | `#282E37` |
| `--ui9000-color-text` | `#111827` | `#EFF0F1` |
| `--ui9000-color-text-muted` | `#6c7584` | `#A4A9B1` |
| `--ui9000-color-border` | `#e5e7eb` | `#444B57` |
| `--ui9000-color-grid` | `#afb3bb` | `#444B57` |

Changing the host context redraws a mounted chart. Call `applyWidgetContext` again; do not remount the element.
