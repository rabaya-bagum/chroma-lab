import { create } from 'zustand';

export interface ToastItem { id: number; title: string; message?: string; kind: 'info' | 'achievement' | 'warn' }

interface ToastStore {
  queue: ToastItem[];
  show(t: Omit<ToastItem, 'id'>): void;
  dismiss(id: number): void;
}

let nextId = 1;

export const useToastStore = create<ToastStore>((set) => ({
  queue: [],
  show: (t) => set((s) => ({ queue: [...s.queue, { ...t, id: nextId++ }].slice(-4) })),
  dismiss: (id) => set((s) => ({ queue: s.queue.filter((t) => t.id !== id) })),
}));
