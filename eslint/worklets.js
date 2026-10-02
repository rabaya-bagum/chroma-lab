/**
 * Local ESLint plugin: catches plain JS functions called from worklets.
 *
 * Code inside a worklet runs on the UI thread. Calling a function there that is
 * not itself a worklet throws "Tried to synchronously call a Remote Function",
 * which aborts the app in Expo Go with no red screen.
 *
 * The rule treats as worklets: callbacks passed to Reanimated hooks
 * (useDerivedValue, useFrameCallback, ...), animation completion callbacks,
 * gesture callbacks, and any function with a 'worklet' directive. Inside them,
 * every call to a function declared in this project (same file or a relative
 * import) must be a 'worklet' too. Library functions and globals are trusted.
 */
const fs = require('fs');
const path = require('path');
const tsParser = require('@typescript-eslint/parser');

/** Hook name -> indexes of the arguments that run on the UI thread. */
const WORKLET_HOOKS = {
  useDerivedValue: [0],
  useAnimatedStyle: [0],
  useAnimatedProps: [0],
  useFrameCallback: [0],
  useAnimatedReaction: [0, 1],
  useAnimatedScrollHandler: [0],
};
/** Animation name -> index of its completion callback. */
const ANIMATION_CALLBACKS = { withTiming: 2, withSpring: 2, withDecay: 1, withRepeat: 3 };
const GESTURE_CALLBACKS = new Set([
  'onBegin', 'onStart', 'onUpdate', 'onChange', 'onEnd', 'onFinalize',
  'onTouchesDown', 'onTouchesMove', 'onTouchesUp', 'onTouchesCancelled',
]);
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js'];

const isFunction = (n) => !!n && (n.type === 'ArrowFunctionExpression' || n.type === 'FunctionExpression' || n.type === 'FunctionDeclaration');

function hasWorkletDirective(fn) {
  if (!fn || fn.body.type !== 'BlockStatement') return false;
  for (const st of fn.body.body) {
    if (st.type !== 'ExpressionStatement' || st.expression.type !== 'Literal' || typeof st.expression.value !== 'string') break;
    if (st.expression.value === 'worklet') return true;
  }
  return false;
}

/** Leftmost identifier of a chain like Gesture.Pan().onUpdate, and whether .runOnJS(...) appears in it. */
function chainInfo(node) {
  let runOnJS = false;
  while (node) {
    if (node.type === 'CallExpression') node = node.callee;
    else if (node.type === 'MemberExpression') {
      if (node.property.type === 'Identifier' && node.property.name === 'runOnJS') runOnJS = true;
      node = node.object;
    } else break;
  }
  return { root: node && node.type === 'Identifier' ? node.name : null, runOnJS };
}

/** True if `fn` runs on the UI thread by itself (not counting enclosing functions). */
function isWorkletFunction(fn) {
  if (hasWorkletDirective(fn)) return true;
  const call = fn.parent;
  if (!call || call.type !== 'CallExpression') return false;
  const index = call.arguments.indexOf(fn);
  if (index < 0) return false;
  const callee = call.callee;
  if (callee.type === 'Identifier') {
    if (WORKLET_HOOKS[callee.name] && WORKLET_HOOKS[callee.name].includes(index)) return true;
    if (ANIMATION_CALLBACKS[callee.name] === index) return true;
  }
  if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier' && GESTURE_CALLBACKS.has(callee.property.name)) {
    const { root, runOnJS } = chainInfo(callee.object);
    return root === 'Gesture' && !runOnJS;
  }
  return false;
}

/** The outermost worklet function enclosing `node`, or null. */
function enclosingWorklet(node) {
  let found = null;
  for (let n = node.parent; n; n = n.parent) if (isFunction(n) && isWorkletFunction(n)) found = n;
  return found;
}

function findVariable(scope, name) {
  for (let s = scope; s; s = s.upper) {
    const v = s.set.get(name);
    if (v) return v;
  }
  return null;
}

// --- cross-file lookup --------------------------------------------------------

const fileCache = new Map(); // path -> { mtime, ast }

function parseFile(file) {
  let stat;
  try { stat = fs.statSync(file); } catch { return null; }
  const hit = fileCache.get(file);
  if (hit && hit.mtime === stat.mtimeMs) return hit.ast;
  let ast = null;
  try {
    ast = tsParser.parse(fs.readFileSync(file, 'utf8'), { jsx: file.endsWith('x'), sourceType: 'module', range: true });
  } catch { ast = null; }
  fileCache.set(file, { mtime: stat.mtimeMs, ast });
  return ast;
}

function resolveModule(fromFile, source) {
  if (!source.startsWith('.')) return null; // a package: trusted
  const base = path.resolve(path.dirname(fromFile), source);
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const ext of EXTENSIONS) if (fs.existsSync(base + ext)) return base + ext;
  return null;
}

/** Function node declared at the top level of `ast` under `name`, or a non-function marker. */
function topLevelDeclaration(ast, name) {
  for (const st of ast.body) {
    const decl = st.type === 'ExportNamedDeclaration' && st.declaration ? st.declaration : st;
    if (decl.type === 'FunctionDeclaration' && decl.id && decl.id.name === name) return { fn: decl };
    if (decl.type === 'VariableDeclaration') {
      for (const d of decl.declarations) {
        if (d.id.type === 'Identifier' && d.id.name === name) return isFunction(d.init) ? { fn: d.init } : { other: true };
      }
    }
  }
  return null;
}

/**
 * Whether export `name` of `file` is a worklet: true, false, or null when it
 * cannot be told (not found, not a function, unparseable).
 */
function exportIsWorklet(file, name, depth = 0) {
  if (depth > 4) return null;
  const ast = parseFile(file);
  if (!ast) return null;
  for (const st of ast.body) {
    if (st.type !== 'ExportNamedDeclaration' || st.declaration) continue;
    for (const sp of st.specifiers) {
      const exported = sp.exported.type === 'Identifier' ? sp.exported.name : sp.exported.value;
      if (exported !== name) continue;
      const local = sp.local.type === 'Identifier' ? sp.local.name : sp.local.value;
      if (st.source) {
        const target = resolveModule(file, st.source.value);
        return target ? exportIsWorklet(target, local, depth + 1) : null;
      }
      return localIsWorklet(file, ast, local, depth);
    }
  }
  const own = topLevelDeclaration(ast, name);
  if (own) return own.fn ? hasWorkletDirective(own.fn) : null;
  for (const st of ast.body) {
    if (st.type !== 'ExportAllDeclaration' || st.exported) continue;
    const target = resolveModule(file, st.source.value);
    const r = target ? exportIsWorklet(target, name, depth + 1) : null;
    if (r !== null) return r;
  }
  return null;
}

function localIsWorklet(file, ast, local, depth) {
  const own = topLevelDeclaration(ast, local);
  if (own) return own.fn ? hasWorkletDirective(own.fn) : null;
  for (const st of ast.body) {
    if (st.type !== 'ImportDeclaration') continue;
    for (const sp of st.specifiers) {
      if (sp.type !== 'ImportSpecifier' || sp.local.name !== local) continue;
      const target = resolveModule(file, st.source.value);
      const imported = sp.imported.type === 'Identifier' ? sp.imported.name : sp.imported.value;
      return target ? exportIsWorklet(target, imported, depth + 1) : null;
    }
  }
  return null;
}

// --- rule ---------------------------------------------------------------------

const within = (inner, outer) => inner.range[0] >= outer.range[0] && inner.range[1] <= outer.range[1];

/** @type {import('eslint').Rule.RuleModule} */
const noJsCallInWorklet = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow calling non-worklet project functions from worklets (UI thread)' },
    schema: [],
    messages: {
      notWorklet:
        "'{{name}}' runs on the UI thread here but is not a worklet; this crashes the app. Add a 'worklet' directive to it, or call it with scheduleOnRN.",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const filename = context.filename;
    return {
      CallExpression(node) {
        if (node.callee.type !== 'Identifier') return;
        const worklet = enclosingWorklet(node);
        if (!worklet) return;
        const name = node.callee.name;
        const variable = findVariable(sourceCode.getScope(node), name);
        if (!variable || variable.defs.length === 0) return; // a global such as parseInt
        const def = variable.defs[0];
        if (within(def.name, worklet)) return; // declared inside the worklet itself

        let ok = true;
        if (def.type === 'FunctionName') ok = hasWorkletDirective(def.node);
        else if (def.type === 'Variable') ok = isFunction(def.node.init) ? hasWorkletDirective(def.node.init) : true;
        else if (def.type === 'ImportBinding') {
          if (def.node.type !== 'ImportSpecifier') return;
          const target = resolveModule(filename, def.parent.source.value);
          if (!target) return;
          const imported = def.node.imported.type === 'Identifier' ? def.node.imported.name : def.node.imported.value;
          ok = exportIsWorklet(target, imported) !== false;
        }
        if (!ok) context.report({ node: node.callee, messageId: 'notWorklet', data: { name } });
      },
    };
  },
};

module.exports = { rules: { 'no-js-call-in-worklet': noJsCallInWorklet } };
