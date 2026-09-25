export interface BraveWallpaper {
  id: string;
  name: string;
  title: string;
  photographer: string;
  link: string;
  sourceFile: string;
  url: string;
  thumb: string;
  license: string;
}

export const OFFICIAL_BRAVE_WALLPAPERS: BraveWallpaper[];
export const ONLINE_UNSPLASH_CATALOG: BraveWallpaper[];
export const BRAVE_WALLPAPERS: BraveWallpaper[];

export interface DynamicWallpaperFetchResult {
  updated: boolean;
  count: number;
  total: number;
}

export const BraveWallpaperService: {
  getAll(): Promise<BraveWallpaper[]>;
  getByIdOrUrl(idOrUrl?: string | null): Promise<BraveWallpaper | null>;
  getNext(currentUrlOrId?: string | null): Promise<BraveWallpaper | null>;
  getRandom(currentUrlOrId?: string | null): Promise<BraveWallpaper | null>;
  fetchNewWallpapers(customApiKey?: string | null): Promise<DynamicWallpaperFetchResult>;
};
