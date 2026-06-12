import { z } from 'zod';

export const AppItemSchema = z.object({
  name: z.string(),
  url: z.string(),
  icon: z.string().optional(),
});

export const SettingsSchema = z.object({
  dashboardTitle: z.string().default('New Tab'),
  themePreference: z.enum(['dark', 'light', 'system']).default('dark'),
  backgroundType: z.enum([
    'solid',
    'bing',
    'preset',
    'local',
    'custom',
    'canvas',
    'google_dashboard',
    'bing_dashboard'
  ]).default('solid'),
  backgroundValue: z.string().default('#000000'),
  showSearch: z.boolean().default(true),
  searchEngine: z.string().default('google'),
  showTopSites: z.boolean().default(true),
  topSitesSource: z.enum(['favorites', 'custom']).default('favorites'),
  shortcuts: z.array(AppItemSchema).default([]),
  googleApps: z.array(AppItemSchema).default([
    { name: 'Search', url: 'https://google.com', icon: 'https://www.gstatic.com/images/branding/product/2x/googleg_96dp.png' },
    { name: 'Gmail', url: 'https://mail.google.com', icon: 'https://www.gstatic.com/images/branding/product/2x/gmail_96dp.png' }
  ]),
  msApps: z.array(AppItemSchema).default([
    { name: 'Office', url: 'https://www.office.com', icon: 'https://www.office.com/favicon.ico' },
    { name: 'Outlook', url: 'https://outlook.live.com', icon: 'https://www.office.com/favicon.ico' }
  ]),
  aiApps: z.array(AppItemSchema).default([
    { name: 'ChatGPT', url: 'https://chatgpt.com', icon: 'https://chatgpt.com/favicon.ico' },
    { name: 'Gemini', url: 'https://gemini.google.com', icon: 'https://www.gstatic.com/lamda/images/favicon_v1_150160d1398865304d0c.svg' },
    { name: 'Claude', url: 'https://claude.ai', icon: 'https://www.google.com/s2/favicons?sz=64&domain=claude.ai' }
  ]),
  customApps: z.array(AppItemSchema).default([]),
  showClock: z.boolean().default(true),
  clockFormat: z.enum(['auto', '12h', '24h']).default('auto'),
  showCards: z.boolean().default(true),
  showCardDate: z.boolean().default(true),
  showCardFocus: z.boolean().default(true),
  showCardNote: z.boolean().default(true),
  showNoosphereBar: z.boolean().default(true),
  showMainUI: z.boolean().default(true),
  showSettingsButtonInImmersive: z.boolean().default(true),
  customSearchUrl: z.string().default('https://www.google.com/search?q=%s'),
  videoMuted: z.boolean().default(true),
  canvasStyle: z.string().default('neural'),
  enableDragAndDrop: z.boolean().default(true)
});

export type AppItem = z.infer<typeof AppItemSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
