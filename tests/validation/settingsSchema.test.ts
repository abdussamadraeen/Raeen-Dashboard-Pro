import { describe, it, expect } from 'vitest';
import { SettingsSchema } from '../../validation/settingsSchema';

describe('settingsSchema', () => {
  it('Valid settings parse correctly', () => {
    const valid = {
      dashboardTitle: 'Test',
      themePreference: 'light',
      dashboardMode: 'pro',
      backgroundType: 'solid',
      backgroundValue: '#000000',
      showSearch: true,
      searchEngine: 'google',
      showTopSites: false,
      topSitesSource: 'custom',
      shortcuts: [],
      googleApps: [],
      msApps: [],
      aiApps: [],
      customApps: [],
      showClock: true,
      clockFormat: '24h',
      showClockAmPm: false,
      showCards: true,
      showCardDate: true,
      showCardFocus: true,
      showCardNote: true,
      showCardSecurity: true,
      showCardDns: true,
      showCardFileShare: true,
      showCardDirectories: true,
      showCardImageCompressor: false,
      showCardPdfTools: false,
      showCardCreativeStudio: false,
      showNoosphereBar: true,
      showMainUI: true,
      showSettingsButtonInImmersive: true,
      customSearchUrl: 'https://test.com/?q=%s',
      lastNonLiveBgType: 'brave',
      lastNonLiveBgValue: 'brave_random',
      videoMuted: false,
      canvasStyle: 'neural',
      canvasSpeed: 1.0,
      canvasDensity: 1.0,
      canvasGlow: 1.0,
      customDashboards: [],
      activeCustomDashboardId: null,
      enableDragAndDrop: false
    };
    
    const parsed = SettingsSchema.parse(valid);
    expect(parsed).toEqual(valid);
  });

  it('Invalid themePreference is rejected', () => {
    const invalid = { themePreference: 'neon' };
    const result = SettingsSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('Invalid backgroundType is rejected', () => {
    const invalid = { backgroundType: 'video' }; // not in enum
    const result = SettingsSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('Defaults are applied for missing fields', () => {
    const result = SettingsSchema.parse({});
    expect(result.dashboardTitle).toBe('New Tab');
    expect(result.themePreference).toBe('dark');
  });

  it('Extra fields are stripped', () => {
    // zod object by default strips extra fields when .parse() is called, unless .strict() is used.
    const input = { extra: 'field' };
    const result = SettingsSchema.parse(input);
    expect((result as any).extra).toBeUndefined();
  });

  it('URL fields accept valid URLs', () => {
    const input = {
      shortcuts: [{ name: 'Test', url: 'https://example.com' }]
    };
    const result = SettingsSchema.safeParse(input);
    expect(result.success).toBe(true);
    
    const invalidInput = {
      shortcuts: [{ name: 'Test', url: 'not-a-url' }]
    };
    const invalidResult = SettingsSchema.safeParse(invalidInput);
    expect(invalidResult.success).toBe(false);
  });
});
