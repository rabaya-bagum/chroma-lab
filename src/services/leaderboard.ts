/** Future daily leaderboard hook (§19). A server will later supply the canonical date. */
export interface LeaderboardService { submitDaily(dateKey: string, moves: number, timeMs: number): Promise<void> }

export const noopLeaderboard: LeaderboardService = { submitDaily: () => Promise.resolve() };
export let leaderboard: LeaderboardService = noopLeaderboard;
export const setLeaderboard = (s: LeaderboardService) => { leaderboard = s; };
