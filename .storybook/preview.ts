import type { Preview } from '@storybook/html-vite';
import '../src/client/ui/styles/ui.css';

// Target devices are 4:3 iPads, landscape. The 5:3 format of the Claude-Design drafts is an extra viewport option.
const viewports = {
  ipadPro129: { name: 'iPad Pro 12,9" (querformat, 1366x1024)', styles: { width: '1366px', height: '1024px' } },
  ipad97: { name: 'iPad 9,7" (querformat, 1024x768)', styles: { width: '1024px', height: '768px' } },
  ipadPro129Portrait: { name: 'iPad Pro 12,9" (hochformat, 1024x1366)', styles: { width: '1024px', height: '1366px' } },
  draft53: { name: 'Entwurf 5:3 (1000x600)', styles: { width: '1000px', height: '600px' } },
};

const preview: Preview = {
  parameters: {
    layout: 'padded',
    controls: { expanded: true },
    viewport: { options: viewports },
    backgrounds: { options: { dark: { name: 'Papier dunkel', value: '#D8D6CC' }, paper: { name: 'Papier', value: '#ECEBE3' } } },
    options: { storySort: { order: ['Atoms', 'Molecules', 'Organisms', 'Templates', 'Pages'] } },
  },
  initialGlobals: { backgrounds: { value: 'dark' } },
  decorators: [
    (story) => {
      const wrap = document.createElement('div');
      wrap.className = 'pa-root';
      const out = story();
      if (typeof out === 'string') wrap.innerHTML = out;
      else wrap.append(out);
      return wrap;
    },
  ],
};
export default preview;
