import type { SaveDataV1 } from '../game/save';

/** Future cloud save hook (§19). */
export interface CloudSyncService {
  push(save: SaveDataV1): Promise<void>;
  pull(): Promise<SaveDataV1 | null>;
}

export const noopCloudSync: CloudSyncService = { push: () => Promise.resolve(), pull: () => Promise.resolve(null) };
export let cloudSync: CloudSyncService = noopCloudSync;
export const setCloudSync = (s: CloudSyncService) => { cloudSync = s; };
