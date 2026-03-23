import { resolve } from "path";
import { LOCAL_STORAGE_BASE_KEY } from "./Constants";
import { formatUsername } from "./helpers";
import GameManager from "./GameManager";

const CL_CACHE_KEY = `${LOCAL_STORAGE_BASE_KEY}:collection_log_items`;
const CL_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
const PLAYER_CACHE_KEY = `${LOCAL_STORAGE_BASE_KEY}:player_data`;
const PLAYER_CACHE_TTL = 1000 * 60 * 60; // 1 hour

export type CollectionLogItem = {
  id: number
  name: string
  wikiLink: string
  iconUrl: string
  imageUrl: string
  category: string
}

export type PlayerData = {
  obtainedItemIds: Set<number>;
  achievementDiaries: Record<string, Record<string, Record<string, boolean>>>;
  skills: Record<string, number>;
};

export const defaultPlayerData: PlayerData = {
  obtainedItemIds: new Set(),
  achievementDiaries: {},
  skills: {},
};

export default class Wiki {
    collectionLogMap: Map<number, CollectionLogItem> = new Map();
    gameManager: GameManager;

    constructor(gameManager: GameManager) {
        this.gameManager = gameManager;
    }

    async initialize() {
        await this.loadCollectionLogItems();
    }

    async loadCollectionLogItems(forceRefresh: boolean = false): Promise<Map<number, CollectionLogItem>> {
        try {
            const raw = localStorage.getItem(CL_CACHE_KEY);
            if (raw) {
                const { ts, data } = JSON.parse(raw);
                if (!forceRefresh && Date.now() - ts < CL_CACHE_TTL && Array.isArray(data)) {
                    this.setCollectionLogItems(data);
                    return Promise.resolve(this.collectionLogMap);
                }
            }
        } catch {
            // ignore corrupt cache
        }

        try {
            const url = 'https://oldschool.runescape.wiki/api.php?action=parse&page=Collection_log/Table&prop=text&format=json&origin=*';

            const resp = await fetch(url);
            const json = await resp.json();
            const html = json.parse.text['*'];

            // Parse HTML string into a DOM
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Find the collection log table
            const table = doc.querySelector('table.wikitable');
            if (!table) {
                console.warn('No collection log table found');
                return Promise.resolve(this.collectionLogMap);
            }

            const cacheData: Partial<CollectionLogItem>[] = [];

            const rows = table.querySelectorAll('tr');
            rows.forEach((row, i) => {
                if (i === 0) return; // skip header

                const cells = row.querySelectorAll('td');
                if (cells.length < 2) return;

                const nameLink = cells[0].querySelector('a[title]');
                const name = nameLink?.getAttribute('title')?.trim() ?? cells[0].textContent?.trim() ?? '';

                const id = row.getAttribute('data-item-id');
                if (!id) return;

                const category = cells[1].textContent?.trim() ?? '';

                const img = cells[0].querySelector('img');
                const iconUrl = img ? `https://oldschool.runescape.wiki${img.getAttribute('src')?.replace(/\?.*$/, '')}` : '';

                cacheData.push({
                    id: parseInt(id, 10),
                    name,
                    category,
                    iconUrl, 
                });
            });

            this.setCollectionLogItems(cacheData);

            try {
                localStorage.setItem(CL_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: cacheData }));
            } catch {
                // ignore localStorage failures
            }
        } catch (error) {
            console.warn('Failed to load collection log data', error);
        }

        return Promise.resolve(this.collectionLogMap);
    }

    getCollectionLogEntry(itemId: number): CollectionLogItem | undefined {
        return this.collectionLogMap.get(itemId);
    }

    setCollectionLogItems(items: Partial<CollectionLogItem>[] = []): void {
        this.collectionLogMap.clear();
        items.forEach(item => {
            const itemId = +(item?.id ?? 0);
            const encodedName = encodeURIComponent(item?.name?.replace(/ /g, '_') ?? '');
            const logItem: CollectionLogItem = {
                id: itemId,
                name: item?.name ?? '',
                category: item?.category ?? '',
                wikiLink: `https://oldschool.runescape.wiki/w/${encodedName}`,
                iconUrl: item?.iconUrl ?? '',
                imageUrl: item?.iconUrl?.replace(/(_\d+)?\.png$/, '_detail.png') ?? '',
            };
            this.collectionLogMap.set(itemId, logItem);
        });
    }

    keysToLowerCaseDeep(input: Object): Object {
        if (Array.isArray(input)) {
            return input.map(this.keysToLowerCaseDeep.bind(this));
        }

        if (input !== null && typeof input === 'object') {
            return Object.fromEntries(
                Object.entries(input).map(([key, value]) => [
                    key.toLowerCase(),
                    this.keysToLowerCaseDeep(value),
                ])
            );
        }

        return input;
    }

    async loadPlayerData(username: string, options: { forceRefresh?: boolean } = {}): Promise<PlayerData> {
        // Replace multiple spaces with a single underscore and trim whitespace
        username = username.trim().replace(/\s+/g, '_');
        // Get our default/specified options
        const {
          forceRefresh = false,
        } = options;

        if (!username) {
            return defaultPlayerData;
        }

        // Load from cache if available and not expired
        const cacheKey = `${PLAYER_CACHE_KEY}:${formatUsername(username)}`;
        if (!forceRefresh) {
            try {
                // TODO: Simplify this, maybe make achievement diaries a Map with a Map of tiers.
                const raw = localStorage.getItem(cacheKey);
                if (raw) {
                    const { ts, obtainedItemIds, achievementDiaries, skills } = JSON.parse(raw);
                    if (Date.now() - ts < PLAYER_CACHE_TTL) {
                        return {
                            obtainedItemIds: new Set(obtainedItemIds),
                            achievementDiaries: achievementDiaries,
                            skills: skills,
                        };
                    }
                }
            } catch {
                // ignore corrupt cache
            }
        }

        try {
            const url = `https://sync.runescape.wiki/runelite/player/${formatUsername(username)}/STANDARD`;
            const response = await fetch(url, { cache: forceRefresh ? 'no-store' : 'default' });
            if (!response.ok) {
                throw new Error(`sync request failed (${response.status})`);
            }

            const payload = await response.json();
            const obtainedItemIds = payload.collection_log;
            const achievementDiaries = this.keysToLowerCaseDeep(payload.achievement_diaries) as Record<string, Record<string, Record<string, boolean>>>;
            const skills = this.keysToLowerCaseDeep(payload.levels) as Record<string, number>;

            try {
                localStorage.setItem(cacheKey, JSON.stringify({
                    ts: Date.now(),
                    obtainedItemIds,
                    achievementDiaries,
                    skills,
                }));
            } catch {
                // ignore localStorage failures
            }

            return {
                obtainedItemIds: new Set(obtainedItemIds),
                achievementDiaries,
                skills,
            };
        } catch (error) {
            console.warn('Failed to load player collection log', error);
            return defaultPlayerData;
        }
    }
}
