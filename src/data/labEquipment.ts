export interface LabEquipment {
  id: string;
  name: string;
  stars: number;
  /** Reachable with the stars available in the shipped levels (85 levels, 255 stars). */
  mvp: boolean;
}

/** Laboratory progression (§12.6). */
export const LAB_EQUIPMENT: readonly LabEquipment[] = [
  { id: 'microscope', name: 'Microscope', stars: 10, mvp: true },
  { id: 'centrifuge', name: 'Centrifuge', stars: 25, mvp: true },
  { id: 'computer', name: 'Research Computer', stars: 45, mvp: true },
  { id: 'arm', name: 'Robotic Arm', stars: 65, mvp: true },
  { id: 'quantum', name: 'Quantum Analyzer', stars: 100, mvp: true },
  { id: 'reactor', name: 'Advanced Reactor', stars: 140, mvp: true },
  { id: 'hologram', name: 'Holographic Display', stars: 180, mvp: true },
];

export const earnedEquipment = (starsTotal: number): string[] =>
  LAB_EQUIPMENT.filter((e) => starsTotal >= e.stars).map((e) => e.id);
