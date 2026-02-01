// @ts-nocheck
import { dirname, fromFileUrl, join, relative } from "https://deno.land/std@0.224.0/path/mod.ts";

const basePath = dirname(fromFileUrl(import.meta.url));

const icons: Record<string, string> = {};
const nameCounts: Record<string, number> = {};
const nameToKey: Record<string, string> = {};

async function walk(dir: string) {
  for await (const entry of Deno.readDir(dir)) {
    const path = join(dir, entry.name);
    if (entry.isDirectory) {
      await walk(path);
      continue;
    }
    if (!entry.isFile || !entry.name.endsWith(".svg")) continue;
    const rel = relative(basePath, path).replaceAll("\\", "/");
    let key = rel.slice(0, -4);
    if (key.endsWith("-symbolic")) key = key.slice(0, -9);
    const svg = await Deno.readTextFile(path);
    icons[key] = svg;
    const name = key.split("/").pop() ?? key;
    nameCounts[name] = (nameCounts[name] ?? 0) + 1;
    if (!nameToKey[name]) nameToKey[name] = key;
  }
}

await walk(basePath);

const iconsByName: Record<string, string> = {};
for (const [name, key] of Object.entries(nameToKey)) {
  if (nameCounts[name] === 1) iconsByName[name] = key;
}

const output = `// Generated file. Do not edit manually.\n` +
  `export const ICONS = ${JSON.stringify(icons)} as const;\n` +
  `export const ICONS_BY_NAME = ${JSON.stringify(iconsByName)} as const;\n`;

const outPath = join(basePath, "registry.ts");
await Deno.writeTextFile(outPath, output);
