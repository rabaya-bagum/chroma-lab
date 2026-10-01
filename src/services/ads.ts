/** Future rewarded-ads hook (§19). No ads are shown in this build. */
export interface AdsService {
  isRewardedAvailable(): boolean;
  showRewarded(): Promise<'rewarded' | 'dismissed'>;
}

export const noopAds: AdsService = {
  isRewardedAvailable: () => false,
  showRewarded: () => Promise.resolve('dismissed'),
};
export let ads: AdsService = noopAds;
export const setAds = (s: AdsService) => { ads = s; };
