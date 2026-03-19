const CL_CACHE_KEY = 'collection_log_items';
const CL_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
const PLAYER_CL_CACHE_PREFIX = 'player_collection_log';
const PLAYER_CL_CACHE_TTL = 1000 * 60 * 60; // 1 hour

export default class Wiki {
    collectionLogMap: Map<number, any>;

    constructor() {
        this.collectionLogMap = new Map();
    }

    getCollectionLogEntry(itemId: number): any | undefined {
        return this.collectionLogMap.get(itemId);
    }

    buildCollectionLogEntry(name: string, category: string, iconUrl: string) {
        const encoded = encodeURIComponent(name.replace(/ /g, '_'));
        return {
            name,
            category,
            wikiLink: `https://oldschool.runescape.wiki/w/${encoded}`,
            iconUrl,
            imageUrl: iconUrl?.replace(/(_\d+)?\.png$/, '_detail.png') ?? '',
        };
    }

    setCollectionLogItems(items: any[] = []) {
        this.collectionLogMap.clear();
        items.forEach(item => {
            const numericId = Number(item.id);
            const itemId = Number.isFinite(numericId) ? numericId : item.id;
            this.collectionLogMap.set(itemId, this.buildCollectionLogEntry(item.name, item.category, item.image));
        });
    }

    async loadCollectionLogItems() {
        try {
            const raw = localStorage.getItem(CL_CACHE_KEY);
            if (raw) {
                const { ts, data } = JSON.parse(raw);
                if (Date.now() - ts < CL_CACHE_TTL && Array.isArray(data)) {
                    this.setCollectionLogItems(data);
                    return this.collectionLogMap;
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
                return;
            }

            const cacheData: any[] = [];

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
                const image = img ? `https://oldschool.runescape.wiki${img.getAttribute('src')?.replace(/\?.*$/, '')}` : null;

                cacheData.push({
                    id: parseInt(id, 10),
                    name,
                    category,
                    image
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

        return this.collectionLogMap;
    }

    // normalizeUsername(value) {
    //     return (value || '').trim().replace(/\s+/g, ' ');
    // }

    // toSyncUsername(value) {
    //     return this.normalizeUsername(value).replace(/\W/g, '_');
    // }

    // async loadPlayerData(username, options = {}) {
    //     const { forceRefresh = false } = options;
    //     const normalized = this.normalizeUsername(username);
    //     if (!normalized) {
    //         return {
    //             obtainedItemIds: new Set(),
    //             completedAchievementDiaryKeys: new Set(),
    //             playerSkillExperienceBySkill: new Map(),
    //             playerSkillLevelBySkill: new Map()
    //         };
    //     }

    //     const cacheKey = `${PLAYER_CL_CACHE_PREFIX}:${this.toSyncUsername(username).toLowerCase()}`;
    //     if (!forceRefresh) {
    //         try {
    //             const raw = localStorage.getItem(cacheKey);
    //             if (raw) {
    //                 const { ts, ids, achievementDiaryKeys, skillExperience, skillLevels } = JSON.parse(raw);
    //                 if (Date.now() - ts < PLAYER_CL_CACHE_TTL && Array.isArray(ids)) {
    //                     const cachedSkillExperience = new Map();
    //                     this.extractSkillExperienceFromContainer(skillExperience, cachedSkillExperience);

    //                     const cachedSkillLevels = new Map();
    //                     this.extractSkillLevelsFromContainer(skillLevels, cachedSkillLevels);

    //                     PlayerProgress.finalizeSkillSnapshots(cachedSkillExperience, cachedSkillLevels);

    //                     return {
    //                         obtainedItemIds: new Set(ids.map(id => Number(id)).filter(id => Number.isInteger(id) && id > 0)),
    //                         completedAchievementDiaryKeys: new Set(
    //                             Array.isArray(achievementDiaryKeys)
    //                                 ? achievementDiaryKeys.map(value => String(value))
    //                                 : []
    //                         ),
    //                         playerSkillExperienceBySkill: cachedSkillExperience,
    //                         playerSkillLevelBySkill: cachedSkillLevels
    //                     };
    //                 }
    //             }
    //         } catch {
    //             // ignore corrupt cache
    //         }
    //     }

    //     try {
    //         const syncName = encodeURIComponent(this.toSyncUsername(normalized));
    //         const url = `https://sync.runescape.wiki/runelite/player/${syncName}/STANDARD`;
    //         const response = await fetch(url, { cache: forceRefresh ? 'no-store' : 'default' });
    //         if (!response.ok) {
    //             throw new Error(`sync request failed (${response.status})`);
    //         }

    //         const payload = await response.json();
    //         const ids = Array.isArray(payload.collection_log)
    //             ? payload.collection_log.map(id => Number(id)).filter(id => Number.isInteger(id) && id > 0)
    //             : [];
    //         const completedAchievementDiaryKeys = this.extractCompletedAchievementDiaryKeys(payload.achievement_diaries);
    //         const playerSkillExperienceBySkill = this.extractPlayerSkillExperience(payload);
    //         const playerSkillLevelBySkill = this.extractPlayerSkillLevels(payload);

    //         PlayerProgress.finalizeSkillSnapshots(playerSkillExperienceBySkill, playerSkillLevelBySkill);

    //         try {
    //             localStorage.setItem(cacheKey, JSON.stringify({
    //                 ts: Date.now(),
    //                 ids,
    //                 achievementDiaryKeys: Array.from(completedAchievementDiaryKeys),
    //                 skillExperience: Object.fromEntries(playerSkillExperienceBySkill),
    //                 skillLevels: Object.fromEntries(playerSkillLevelBySkill)
    //             }));
    //         } catch {
    //             // ignore localStorage failures
    //         }

    //         return {
    //             obtainedItemIds: new Set(ids),
    //             completedAchievementDiaryKeys,
    //             playerSkillExperienceBySkill,
    //             playerSkillLevelBySkill
    //         };
    //     } catch (error) {
    //         console.warn('Failed to load player collection log', error);
    //         return null;
    //     }
    // }
}