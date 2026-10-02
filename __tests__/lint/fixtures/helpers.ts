// Fixture for the worklet lint rule test: one plain helper, one worklet, and a re-export.
export const plainHelper = (x: number): number => x * 2;

export function workletHelper(x: number): number {
  'worklet';
  return x * 2;
}

export { workletHelper as renamedWorklet, plainHelper as renamedPlain };
