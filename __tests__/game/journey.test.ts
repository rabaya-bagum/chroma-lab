import { LEVELS } from '../../src/data/levels';
import { completeLevel, continueTarget, isLevelUnlocked } from '../../src/game/progress';
import { defaultSave } from '../../src/game/save';
import { isPuzzleSolved } from '../../src/game/rules';
import { deserializeSession, serializeSession } from '../../src/game/serialize';
import { applyMove, createSession } from '../../src/game/session';
import { solveLevel } from '../../src/game/solver';
import { parseSave } from '../../src/services/saveParser';

describe('first launch through every level', () => {
  it('plays all 85 levels by their optimal solutions, unlocking in order and surviving save/load', () => {
    let save = defaultSave();
    expect(continueTarget(save, LEVELS, false)).toMatchObject({ label: 'PLAY' });

    for (const level of LEVELS) {
      // locked until the previous level is done, unlocked now
      expect(isLevelUnlocked(save, level)).toBe(true);
      if (level.number < LEVELS.length) expect(isLevelUnlocked(save, LEVELS[level.number])).toBe(false);

      const solution = solveLevel(level).solution!;
      let session = createSession(level);

      // kill and relaunch halfway: the session must come back identical
      const half = Math.floor(solution.length / 2);
      for (const m of solution.slice(0, half)) session = applyMove(session, m).session;
      const restored = deserializeSession(serializeSession(session), LEVELS)!;
      expect(restored).not.toBeNull();
      expect(restored.current).toEqual(session.current);
      session = restored;
      for (const m of solution.slice(half)) session = applyMove(session, m).session;
      expect(isPuzzleSolved(session.current)).toBe(true);

      const { save: next, result } = completeLevel(save, level, {
        moves: session.current.moves, undosUsed: 0, hintsUsed: 0, extraTubeUsed: false,
      }, LEVELS, 1000 + level.number);
      expect(result.stars).toBe(3);
      save = parseSave(JSON.parse(JSON.stringify({ ...next, settings: defaultSave().settings })), LEVELS)!; // persist and reload
      expect(save).not.toBeNull();
    }

    expect(save.progress.stats.levelsCompleted).toBe(85);
    expect(save.progress.starsTotal).toBe(255);
    expect(save.progress.highestUnlocked).toBe(85);
    expect(Object.keys(save.progress.achievements).sort()).toEqual(
      ['efficiency_expert', 'first_reaction', 'master_chemist', 'no_mistakes', 'perfect_formula', 'researcher', 'scientist'],
    );
    expect(save.economy.coins).toBeGreaterThan(0);
  });
});
