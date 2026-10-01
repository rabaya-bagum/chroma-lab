/** Future analytics hook (§19). Gameplay depends only on this interface. */
export interface AnalyticsService { track(event: string, props?: Record<string, unknown>): void }

export const noopAnalytics: AnalyticsService = { track: () => undefined };
export let analytics: AnalyticsService = noopAnalytics;
export const setAnalytics = (s: AnalyticsService) => { analytics = s; };
