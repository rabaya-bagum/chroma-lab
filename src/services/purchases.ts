/** Future in-app purchases hook (§19). There is no real-money purchase in this build. */
export interface PurchasesService { getProducts(): Promise<never[]> }

export const noopPurchases: PurchasesService = { getProducts: () => Promise.resolve([]) };
export let purchases: PurchasesService = noopPurchases;
export const setPurchases = (s: PurchasesService) => { purchases = s; };
