import { resolve } from "path";

const CL_CACHE_KEY = 'collection_log_items';
const CL_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
const PLAYER_CACHE_PREFIX = 'player_data';
const PLAYER_CACHE_TTL = 1000 * 60 * 60; // 1 hour

export type CollectionLogItem = {
  id: number
  name: string
  wikiLink: string
  iconUrl: string
  imageUrl: string
  category: string
}


export default class Wiki {
    collectionLogMap: Map<number, CollectionLogItem> = new Map();

    constructor() {}

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

    async loadPlayerData(username: string, options: { forceRefresh?: boolean } = {}) {
        // Replace multiple spaces with a single underscore and trim whitespace
        username = username.trim().replace(/\s+/g, '_');
        // Get our default/specified options
        const {
          forceRefresh = false,
        } = options;

        if (!username) {
            return {
                ts: 0,
                obtainedItemIds: new Set(),
                achievementDiaries: new Set(),
                skills: new Map(),
            };
        }

        // Load from cache if available and not expired
        const cacheKey = `${PLAYER_CACHE_PREFIX}:${username.toLowerCase()}`;
        if (!forceRefresh) {
            try {
                const raw = localStorage.getItem(cacheKey);
                if (raw) {
                    const { ts, obtainedItemIds, achievementDiaries, skills } = JSON.parse(raw);
                    if (Date.now() - ts < PLAYER_CACHE_TTL && Array.isArray(obtainedItemIds)) {

                        return {
                            obtainedItemIds: new Set(obtainedItemIds.map(id => Number(id)).filter(id => Number.isInteger(id) && id > 0)),
                            achievementDiaries: new Set(
                                Array.isArray(achievementDiaries)
                                    ? achievementDiaries.map(value => String(value))
                                    : []
                            ),
                            skills: new Map(
                                Object.entries(skills ?? {}).map(([skill, exp]) => [skill, Number(exp)])
                            )
                        };
                    }
                }
            } catch {
                // ignore corrupt cache
            }
        }

        try {
            const syncName = encodeURIComponent(username.replace(/ /g, '_'));
            const url = `https://sync.runescape.wiki/runelite/player/${syncName}/STANDARD`;
            const response = await fetch(url, { cache: forceRefresh ? 'no-store' : 'default' });
            if (!response.ok) {
                throw new Error(`sync request failed (${response.status})`);
            }

            const payload = await response.json();
            const obtainedItemIds = payload.collection_log;
            const achievementDiaries = payload.achievement_diaries;
            const skills = new Map();
            Object.entries(payload.levels).forEach(([name, level]) => {
                skills.set(name, level);
            });

    

            try {
                localStorage.setItem(cacheKey, JSON.stringify({
                    ts: Date.now(),
                    obtainedItemIds,
                    achievementDiaries: Array.from(achievementDiaries),
                    skills: Array.from(skills),
                }));
            } catch {
                // ignore localStorage failures
            }

            return {
                obtainedItemIds: new Set(obtainedItemIds),
                achievementDiaries,
                skills
            };
        } catch (error) {
            console.warn('Failed to load player collection log', error);
            return null;
        }
    }
}
