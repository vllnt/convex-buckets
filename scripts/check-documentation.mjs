// Agent-first documentation contract shared by every @vllnt package.
// test-package.mjs runs it on the installed tarball: what consumers receive.
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

import ts from "typescript";

/** README `##` sections, in this order, in every @vllnt package. */
export const SECTIONS = [
  "For coding agents",
  "When to use",
  "Install",
  "Quick start",
  "API",
  "Common tasks",
  "Errors and fixes",
  "Limits and gotchas",
  "Compatibility",
  "Testing",
  "Security",
  "Related packages",
  "Contributing",
  "License",
];
const FIRST_LINES = 40;
const OSS = "https://oss.vllnt.com";

/**
 * @typedef {{ code: string, lang: string, line: number }} Block
 * @typedef {{ lang: string, line: number, lines: string[] }} OpenBlock
 * @typedef {{ body: string, line: number, name: string }} Section
 * @typedef {{ name: string, target: ts.Symbol }} Export
 * @typedef {{ checker: ts.TypeChecker, entry: string, symbols: Export[] }} Entry
 * @typedef {{ headings: Set<string>, table: string }} Documented
 */

/** @param {string} name package name without the scope */
export const footer = (name) =>
  `---\n\nPart of [vllnt open source](${OSS}) · [Package page](${OSS}/packages/${name}) · [vllnt.com](https://vllnt.com) · Built by [bntvllnt](https://bntvllnt.com)\n`;

/** @param {string} name package name without the scope */
export const ecosystem = (name) =>
  `## Ecosystem\n\n- [Package page](${OSS}/packages/${name})\n- [All @vllnt packages](${OSS}/llms.txt)\n- [vllnt](https://vllnt.com/llms.txt)\n- [Author](https://bntvllnt.com)\n`;

/** GitHub heading anchor. @param {string} heading */
export const slug = (heading) =>
  heading
    .trim()
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}\s_-]/gu, "")
    .replaceAll(/\s/gu, "-");

/** @param {string} text @returns {Set<string>} */
function anchors(text) {
  /** @type {Map<string, number>} */
  const seen = new Map();
  return new Set(
    [...text.matchAll(/^#{1,6}\s+(.+)$/gmu)].map((match) => {
      const base = slug(String(match[1]));
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      return count === 0 ? base : `${base}-${String(count)}`;
    }),
  );
}

/** Fenced code blocks with 1-based start lines. @param {string} text */
export function codeBlocks(text) {
  /** @type {{ blocks: Block[], open: OpenBlock | undefined }} */
  const start = { blocks: [], open: undefined };
  const state = text.split("\n").reduce((current, line, index) => {
    if (!line.startsWith("```")) {
      current.open?.lines.push(line);
      return current;
    }
    if (current.open === undefined) {
      const open = { lang: line.slice(3).trim(), line: index + 1, lines: [] };
      return { ...current, open };
    }
    const { lang, line: at, lines } = current.open;
    const block = { code: lines.join("\n"), lang, line: at };
    return { blocks: [...current.blocks, block], open: undefined };
  }, start);
  assert.equal(state.open, undefined, "unclosed code block");
  return state.blocks;
}

/** `##` sections outside code blocks. @param {string} text @returns {Section[]} */
function sections(text) {
  const lines = text.split("\n");
  const inCode = new Set(
    codeBlocks(text).flatMap(({ code, line }) =>
      Array.from(
        { length: code.split("\n").length + 2 },
        (_, offset) => line + offset,
      ),
    ),
  );
  const heads = lines
    .map((content, index) => ({ content, line: index + 1 }))
    .filter(
      ({ content, line }) => content.startsWith("## ") && !inCode.has(line),
    );
  return heads.map((head, index) => ({
    body: lines
      .slice(head.line, (heads[index + 1]?.line ?? lines.length + 1) - 1)
      .join("\n"),
    line: head.line,
    name: head.content.slice(3).trim(),
  }));
}

/** @param {string} directory */
const filesUnder = (directory) =>
  readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));

/** @param {Section[]} parts @param {string} name */
function section(parts, name) {
  const found = parts.find((part) => part.name === name);
  assert.ok(found, `README has no section ${name}`);
  return found;
}

/** Title, fixed sections in order, no empty section, short agent note. @param {string} readme @param {string} packageName */
function checkStructure(readme, packageName) {
  assert.ok(
    readme.startsWith(`# ${packageName}\n\n`),
    "README starts with # <package name> and one sentence",
  );
  const parts = sections(readme);
  assert.deepEqual(
    parts.map(({ name }) => name),
    SECTIONS,
    "README ## sections must be SECTIONS, in order",
  );
  parts.forEach((part) => {
    assert.ok(
      part.body.trim().length > 0,
      `section ${part.name} is empty; say in one line why it does not apply`,
    );
  });
  const note = section(parts, "For coding agents").body.trim();
  assert.ok(note.split("\n").length <= 3, "For coding agents: 3 lines at most");
  return parts;
}

/** 2-4 "Use it when" bullets, then 1-3 "Do not use it" bullets naming the alternative. @param {Section[]} parts */
function checkWhenToUse(parts) {
  const bullets = section(parts, "When to use")
    .body.replaceAll(/\n {2,}/gu, " ")
    .split("\n")
    .filter((line) => line.startsWith("- "));
  const use = bullets.filter((line) => line.startsWith("- Use it when "));
  const avoid = bullets.filter((line) => line.startsWith("- Do not use it "));
  assert.ok(use.length >= 2 && use.length <= 4, "2 to 4 'Use it when' bullets");
  assert.ok(avoid.length > 0 && avoid.length <= 3, "1 to 3 'Do not use it'");
  assert.deepEqual(bullets, [...use, ...avoid], "'Use it when' bullets first");
  avoid.forEach((line) => {
    assert.match(line, /`[^`]+`/u, "'Do not use it' names the better choice");
  });
}

/** Install and first example near the top; badges below Quick start. @param {string} readme @param {string} packageName */
function checkTop(readme, packageName) {
  const lines = readme.split("\n");
  const name = packageName.replaceAll(/[$()*+./?[\\\]^{|}]/gu, String.raw`\$&`);
  const pattern = new RegExp(String.raw`\b(?:add|install)\s+${name}\b`, "u");
  const install = lines.findIndex((line) => pattern.test(line));
  assert.ok(install !== -1 && install < FIRST_LINES, "install near the top");
  const quick = section(sections(readme), "Quick start").line;
  const example = codeBlocks(readme).find((block) => block.line > quick);
  assert.ok(example && example.line <= FIRST_LINES, "example near the top");
  lines.forEach((line, index) => {
    if (/img\.shields\.io|badge\.svg/u.test(line))
      assert.ok(index + 1 > quick, "badges go below Quick start");
  });
}

/** Every block tagged; README `ts` blocks complete and placed by path. @param {Record<string, string>} texts */
function checkCode(texts) {
  Object.entries(texts).forEach(([file, text]) => {
    codeBlocks(text).forEach((block) => {
      assert.ok(block.lang, `${file}:${String(block.line)} has no language`);
    });
  });
  return codeBlocks(String(texts["README.md"]))
    .filter((block) => block.lang === "ts")
    .map((block) => {
      const where = `README.md:${String(block.line)}`;
      const gap = /^\s*(?:\/\/\s*)?(?:\.\.\.|…)\s*$/mu;
      assert.doesNotMatch(block.code, gap, `${where} has a ... gap`);
      const path = /^\/\/ (\S+\.ts)\n/u.exec(block.code)?.[1];
      assert.ok(path, `${where} must start with a // <path>.ts comment`);
      return { code: block.code, path };
    });
}

/** Relative links and their anchors resolve inside the package. @param {string} installed @param {Record<string, string>} texts */
function checkLinks(installed, texts) {
  Object.entries(texts).forEach(([file, text]) => {
    const links = text.matchAll(/\]\((?!https?:|mailto:)([^)\s]+)\)/gu);
    [...links].forEach((match) => {
      const link = String(match[1]);
      const [target = "", anchor] = link.split("#");
      const here = join(installed, file);
      const resolved = target ? join(dirname(here), target) : here;
      assert.ok(existsSync(resolved), `${file}: ${link} does not resolve`);
      if (anchor !== undefined) {
        const found = anchors(readFileSync(resolved, "utf8")).has(anchor);
        assert.ok(found, `${file}: ${link} has no such anchor`);
      }
    });
  });
}

/** @param {string} consumer @param {string} packageName @param {string[]} entries */
function probe(consumer, packageName, entries) {
  const file = join(consumer, "documentation-probe.ts");
  const imports = entries.map(
    (key, index) =>
      `import * as e${String(index)} from "${packageName}${key.slice(1)}";`,
  );
  writeFileSync(file, imports.join("\n"));
  const program = ts.createProgram([file], {
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2022,
    types: [],
  });
  const source = program.getSourceFile(file);
  assert.ok(source, "the export probe did not compile");
  return { checker: program.getTypeChecker(), source };
}

/** Public exports of each entry point, from the installed types. @param {string} consumer @param {string} packageName @param {string[]} entries @returns {Entry[]} */
function exportsOf(consumer, packageName, entries) {
  const { checker, source } = probe(consumer, packageName, entries);
  const statements = source.statements.filter((node) =>
    ts.isImportDeclaration(node),
  );
  return statements.map((statement, index) => {
    const entry = String(entries[index]);
    const module = checker.getSymbolAtLocation(statement.moduleSpecifier);
    assert.ok(module, `cannot resolve ${entry}`);
    const symbols = checker.getExportsOfModule(module).map((symbol) => ({
      name: symbol.name,
      target:
        symbol.flags & ts.SymbolFlags.Alias
          ? checker.getAliasedSymbol(symbol)
          : symbol,
    }));
    assert.ok(symbols.length > 0, `${entry} exports nothing`);
    return { checker, entry, symbols };
  });
}

/** @param {ts.TypeChecker} checker @param {ts.Symbol} symbol */
const hasSummary = (checker, symbol) =>
  ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim()
    .length > 0;

/** Public methods of a class symbol. @param {ts.TypeChecker} checker @param {ts.Symbol} symbol */
const publicMethods = (checker, symbol) =>
  checker
    .getDeclaredTypeOfSymbol(symbol)
    .getProperties()
    .filter((member) => {
      const declaration = member.declarations?.[0];
      if (!(member.flags & ts.SymbolFlags.Method) || !declaration) return false;
      const hidden = ts.ModifierFlags.NonPublicAccessibilityModifier;
      return !(ts.getCombinedModifierFlags(declaration) & hidden);
    });

/** TSDoc summary, README API row and reference heading. @param {Documented} documented @param {Entry} entry @param {Export} item */
function checkExport({ headings, table }, { checker, entry }, item) {
  const label = item.name === "default" ? entry.slice(2) : item.name;
  const row = item.name === "default" ? "`default" : `\`${label}\``;
  assert.ok(hasSummary(checker, item.target), `${label} has no TSDoc summary`);
  assert.ok(table.includes(row), `README API table lacks ${label}`);
  assert.ok(headings.has(slug(label)), `docs/API.md lacks a ${label} heading`);
  if (!(item.target.flags & ts.SymbolFlags.Class)) return;
  publicMethods(checker, item.target).forEach((method) => {
    const { name } = method;
    assert.ok(hasSummary(checker, method), `${name} has no TSDoc summary`);
    assert.ok(table.includes(`\`${name}(`), `README API table lacks ${name}`);
    assert.ok(headings.has(slug(name)), `docs/API.md lacks a ${name} heading`);
  });
}

/** A main-entry export carries `@see <package page>`. @param {Entry[]} entries @param {string} page */
function checkSee(entries, page) {
  const main = entries.find(({ entry }) => entry === ".");
  assert.ok(main, "package has no main entry");
  const linked = main.symbols.some(({ target }) =>
    target
      .getJsDocTags(main.checker)
      .some(
        (tag) =>
          tag.name === "see" &&
          ts.displayPartsToString(tag.text).includes(page),
      ),
  );
  assert.ok(linked, `a main-entry export needs TSDoc @see ${page}`);
}

/** Every thrown error code is in the errors table and the reference. @param {string} installed @param {string} errors @param {string} reference */
function checkErrorCodes(installed, errors, reference) {
  const throwing = /\bfail\(\s*"([A-Z][\dA-Z_]+)"/gu;
  const codes = new Set(
    filesUnder(join(installed, "src"))
      .filter((file) => file.endsWith(".ts") && !file.includes("_generated"))
      .flatMap((file) =>
        [...readFileSync(file, "utf8").matchAll(throwing)].map((match) =>
          String(match[1]),
        ),
      ),
  );
  assert.ok(codes.size > 0, "found no error codes; update the pattern");
  codes.forEach((code) => {
    assert.ok(errors.includes(`\`${code}\``), `Errors and fixes lacks ${code}`);
    assert.ok(reference.includes(code), `docs/API.md lacks ${code}`);
  });
}

/** Summary, when to use, links to the reference and errors, ecosystem block. @param {string} llms @param {string} name */
function checkLlms(llms, name) {
  assert.match(llms, /^> \S/mu, "llms.txt needs a > summary line");
  assert.ok(llms.includes("\n## When to use\n"), "llms.txt: ## When to use");
  assert.ok(llms.includes("](./docs/API.md)"), "llms.txt: link ./docs/API.md");
  const errors = "](./README.md#errors-and-fixes)";
  assert.ok(llms.includes(errors), "llms.txt: link the errors table");
  assert.ok(llms.endsWith(ecosystem(name)), "llms.txt: ends with Ecosystem");
  const index = llms.split(`${OSS}/llms.txt`).length - 1;
  assert.equal(index, 1, "llms.txt links the package index once");
}

/** @vllnt names under "Related packages" link their package page; no vllnt.ai anywhere. @param {string} installed @param {Record<string, string>} texts */
function checkBacklinks(installed, texts) {
  Object.entries(texts).forEach(([file, text]) => {
    const related =
      sections(text).find((part) => part.name === "Related packages")?.body ??
      "";
    const names = related.matchAll(/\[`?@vllnt\/([\w-]+)`?\]\(([^)]+)\)/gu);
    [...names].forEach(([, other = "", url]) => {
      const page = `${OSS}/packages/${other}`;
      assert.equal(url, page, `${file}: link @vllnt/${other} to ${page}`);
    });
  });
  filesUnder(installed).forEach((file) => {
    const text = readFileSync(file, "utf8");
    assert.doesNotMatch(text, /vllnt\.ai/iu, `${file} mentions vllnt.ai`);
  });
}

/**
 * Docs cover every export of every entry point; the main entry links its page.
 * @param {string} consumer
 * @param {{ exports: Record<string, unknown>, name: string }} metadata
 * @param {Documented} documented
 */
function checkApi(consumer, metadata, documented) {
  const keys = Object.keys(metadata.exports).filter(
    (key) => key !== "./package.json" && !key.endsWith(".js"),
  );
  const entries = exportsOf(consumer, metadata.name, keys);
  entries.forEach((entry) => {
    entry.symbols.forEach((item) => {
      checkExport(documented, entry, item);
    });
  });
  const name = metadata.name.split("/").at(-1) ?? metadata.name;
  checkSee(entries, `${OSS}/packages/${name}`);
}

/** Shipped docs keyed by package-relative path. @param {string} installed */
function readTexts(installed) {
  const references = readdirSync(join(installed, "docs")).map(
    (file) => `docs/${file}`,
  );
  const files = ["README.md", "llms.txt", "CHANGELOG.md", ...references];
  return Object.fromEntries(
    files.map((file) => [file, readFileSync(join(installed, file), "utf8")]),
  );
}

/**
 * Checks README.md, llms.txt and docs/ of an installed package and returns
 * the README `ts` blocks for the caller to compile and run.
 * @param {string} installed package directory inside node_modules
 * @param {string} consumer project that has the package installed
 */
export function checkDocumentation(installed, consumer) {
  /** @type {{ exports: Record<string, unknown>, name: string }} */
  const metadata = JSON.parse(
    readFileSync(join(installed, "package.json"), "utf8"),
  );
  const name = metadata.name.split("/").at(-1) ?? metadata.name;
  const texts = readTexts(installed);
  const readme = String(texts["README.md"]);
  const reference = String(texts["docs/API.md"]);
  const parts = checkStructure(readme, metadata.name);
  checkWhenToUse(parts);
  checkTop(readme, metadata.name);
  checkLinks(installed, texts);
  checkApi(consumer, metadata, {
    headings: anchors(reference),
    table: section(parts, "API").body,
  });
  checkErrorCodes(
    installed,
    section(parts, "Errors and fixes").body,
    reference,
  );
  assert.ok(readme.endsWith(footer(name)), "README ends with the vllnt footer");
  checkLlms(String(texts["llms.txt"]), name);
  checkBacklinks(installed, texts);
  return checkCode(texts);
}

/**
 * Writes stub host files and the README examples under `consumer`, renaming
 * repeated paths, and returns the written paths.
 * @param {string} consumer @param {Record<string, string>} stubs @param {{ code: string, path: string }[]} examples
 */
export function writeHost(consumer, stubs, examples) {
  /** @type {string[]} */
  const seen = [];
  /** @type {string[]} */
  const written = [];
  const files = [
    ...Object.entries(stubs),
    ...examples.map(({ code, path }) => [path, code]),
  ];
  files.forEach(([path = "", code = ""]) => {
    const copies = seen.filter((file) => file === path).length;
    const target =
      copies === 0 ? path : path.replace(/\.ts$/u, `.${String(copies)}.ts`);
    seen.push(path);
    written.push(target);
    mkdirSync(dirname(join(consumer, target)), { recursive: true });
    writeFileSync(join(consumer, target), code);
  });
  return written;
}
