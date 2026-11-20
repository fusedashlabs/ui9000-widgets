import './styles/theme.css';
import './styles/typography.css';
import './styles/base.css';
import './styles/shell.css';
import './styles/intro.css';
import './styles/chart-page.css';
import './styles/controls.css';
import './styles/settings-panel.css';
import './styles/code.css';
import './styles/accordion.css';
import './styles/foundations.css';
import './styles/search.css';
// Last: an element with a surface class takes its edge and fill from here, over its component's border and background.
import './styles/surfaces.css';
import { initTheme } from './lib/theme.js';

initTheme();
await import('./components/site-app.js');
