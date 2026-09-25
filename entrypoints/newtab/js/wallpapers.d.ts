export interface WallpaperItem {
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

export type CuratedWallpaper = WallpaperItem;

export const CURATED_WALLPAPERS: WallpaperItem[];
export const ONLINE_WALLPAPERS: WallpaperItem[];
export const OFFICIAL_BRAVE_WALLPAPERS: WallpaperItem[];
export const ONLINE_UNSPLASH_CATALOG: WallpaperItem[];
export const BRAVE_WALLPAPERS: WallpaperItem[];

export interface DynamicWallpaperFetchResult {
  updated: boolean;
  count: number;
  total: number;
}

export const WallpaperService: {
  getAll(): Promise<WallpaperItem[]>;
  getByIdOrUrl(idOrUrl?: string | null): Promise<WallpaperItem | null>;
  getNext(currentUrlOrId?: string | null): Promise<WallpaperItem | null>;
  getRandom(currentUrlOrId?: string | null): Promise<WallpaperItem | null>;
  fetchNewWallpapers(customApiKey?: string | null): Promise<DynamicWallpaperFetchResult>;
};

export const CuratedWallpaperService: typeof WallpaperService;
