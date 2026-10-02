import path from 'path';
import { RuleTester } from 'eslint';
import tsParser from '@typescript-eslint/parser';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const plugin = require('../../eslint/worklets');
const rule = plugin.rules['no-js-call-in-worklet'];

const tester = new RuleTester({
  languageOptions: { parser: tsParser, ecmaVersion: 2022, sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } },
});

// relative imports resolve against this (non-existent) file, next to ./fixtures
const filename = path.join(__dirname, 'Component.tsx');
const err = (name: string) => ({ messageId: 'notWorklet', data: { name } });

tester.run('no-js-call-in-worklet', rule, {
  valid: [
    // a local helper marked as a worklet
    { filename, code: "const f = (x) => { 'worklet'; return x; }; useDerivedValue(() => f(1));" },
    { filename, code: "function f(x) { 'worklet'; return x; } useFrameCallback(() => { f(1); });" },
    // globals and member calls are trusted
    { filename, code: 'useDerivedValue(() => parseInt("1", 10) + Math.sin(1));' },
    // a function declared inside the worklet is part of it
    { filename, code: 'useDerivedValue(() => { const g = (x) => x; return g(1); });' },
    // plain helpers are fine on the JS thread
    { filename, code: 'const f = (x) => x; useMemo(() => f(1), []);' },
    // imported worklets, directly and through a renamed re-export
    { filename, code: "import { workletHelper, renamedWorklet } from './fixtures/helpers'; useDerivedValue(() => workletHelper(1) + renamedWorklet(2));" },
    // package imports are trusted
    { filename, code: "import { interpolate } from 'react-native-reanimated'; useDerivedValue(() => interpolate(1, [0, 1], [0, 1]));" },
    // a gesture that opts into the JS thread
    { filename, code: 'const f = (x) => x; Gesture.Pan().runOnJS(true).onUpdate(() => f(1));' },
  ],
  invalid: [
    // the original crash: a plain helper inside useDerivedValue
    { filename, code: 'const rnd = (i) => i; useDerivedValue(() => rnd(1));', errors: [err('rnd')] },
    // a plain function declaration in a frame callback
    { filename, code: 'function period(t) { return t; } useFrameCallback(() => { period(1); });', errors: [err('period')] },
    // an imported plain helper, directly and through a renamed re-export
    { filename, code: "import { plainHelper } from './fixtures/helpers'; useAnimatedStyle(() => ({ opacity: plainHelper(1) }));", errors: [err('plainHelper')] },
    { filename, code: "import { renamedPlain } from './fixtures/helpers'; useDerivedValue(() => renamedPlain(1));", errors: [err('renamedPlain')] },
    // a worklet helper calling a plain helper
    { filename, code: "const parse = (h) => h; function inkFor(h) { 'worklet'; return parse(h); }", errors: [err('parse')] },
    // an animation completion callback
    { filename, code: 'const done = () => {}; withTiming(1, {}, () => { done(); });', errors: [err('done')] },
    // useAnimatedReaction runs both of its callbacks on the UI thread
    { filename, code: 'const f = (x) => x; useAnimatedReaction(() => f(1), () => f(2));', errors: [err('f'), err('f')] },
    // gesture callbacks run on the UI thread by default
    { filename, code: 'const f = (x) => x; Gesture.Pan().onUpdate(() => f(1));', errors: [err('f')] },
  ],
});
