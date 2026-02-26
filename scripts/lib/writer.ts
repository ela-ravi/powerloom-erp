/**
 * File writing utilities with mkdir -p, conflict detection, and reporting.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const createdFiles: string[] = [];

export interface WriteOptions {
  overwrite?: boolean;
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

export function writeFile(
  filePath: string,
  content: string,
  opts?: WriteOptions,
): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  if (fileExists(filePath) && !opts?.overwrite) {
    console.warn(`  SKIP (exists): ${relativePath(filePath)}`);
    return;
  }

  fs.writeFileSync(filePath, content, "utf-8");
  createdFiles.push(filePath);
  console.log(`  CREATE: ${relativePath(filePath)}`);
}

function relativePath(filePath: string): string {
  return path.relative(process.cwd(), filePath);
}

export function reportCreatedFiles(): void {
  console.log(`\n  Done! ${createdFiles.length} file(s) created.\n`);
}
