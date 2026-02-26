/**
 * CLI argument parsing, validation, and usage display for generator scripts.
 */

export interface ArgSpec {
  name: string;
  description: string;
  required?: boolean;
}

export interface FlagSpec {
  name: string;
  alias?: string;
  description: string;
  default?: string | boolean;
}

export interface CliConfig {
  scriptName: string;
  description: string;
  args: ArgSpec[];
  flags?: FlagSpec[];
  examples?: string[];
}

export interface ParsedArgs {
  positional: string[];
  flags: Record<string, string | boolean>;
}

export function exitWithError(msg: string): never {
  console.error(`\n  Error: ${msg}\n`);
  process.exit(1);
}

export function usage(config: CliConfig): string {
  const argStr = config.args
    .map((a) => (a.required !== false ? `<${a.name}>` : `[${a.name}]`))
    .join(" ");

  const flagStr = config.flags
    ?.map((f) => {
      const alias = f.alias ? `-${f.alias}, ` : "    ";
      const def = f.default !== undefined ? ` (default: ${f.default})` : "";
      return `    ${alias}--${f.name.padEnd(16)} ${f.description}${def}`;
    })
    .join("\n");

  const examplesStr = config.examples?.map((e) => `    ${e}`).join("\n");

  let text = `
  ${config.description}

  Usage: pnpm gen:${config.scriptName} ${argStr}

  Arguments:
${config.args.map((a) => `    ${a.name.padEnd(20)} ${a.description}${a.required !== false ? " (required)" : ""}`).join("\n")}`;

  if (flagStr) {
    text += `\n\n  Flags:\n${flagStr}`;
  }
  if (examplesStr) {
    text += `\n\n  Examples:\n${examplesStr}`;
  }

  return text + "\n";
}

export function parseArgs(config: CliConfig): ParsedArgs {
  const rawArgs = process.argv.slice(2);

  if (rawArgs.includes("--help") || rawArgs.includes("-h")) {
    console.log(usage(config));
    process.exit(0);
  }

  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  // Set defaults
  for (const f of config.flags ?? []) {
    if (f.default !== undefined) {
      flags[f.name] = f.default;
    }
  }

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];

    if (arg.startsWith("--")) {
      const name = arg.slice(2);
      const flagSpec = config.flags?.find((f) => f.name === name);
      if (!flagSpec) {
        exitWithError(`Unknown flag: ${arg}\n${usage(config)}`);
      }
      // Boolean flags don't consume next arg
      if (
        typeof flagSpec.default === "boolean" ||
        flagSpec.default === undefined
      ) {
        flags[name] = true;
      } else {
        const val = rawArgs[++i];
        if (!val) exitWithError(`Flag --${name} requires a value`);
        flags[name] = val;
      }
    } else if (arg.startsWith("-") && arg.length === 2) {
      const alias = arg.slice(1);
      const flagSpec = config.flags?.find((f) => f.alias === alias);
      if (!flagSpec) {
        exitWithError(`Unknown flag: ${arg}\n${usage(config)}`);
      }
      if (
        typeof flagSpec.default === "boolean" ||
        flagSpec.default === undefined
      ) {
        flags[flagSpec.name] = true;
      } else {
        const val = rawArgs[++i];
        if (!val) exitWithError(`Flag -${alias} requires a value`);
        flags[flagSpec.name] = val;
      }
    } else {
      positional.push(arg);
    }
  }

  return { positional, flags };
}

export function validateArgs(parsed: ParsedArgs, config: CliConfig): string[] {
  const required = config.args.filter((a) => a.required !== false);
  if (parsed.positional.length < required.length) {
    console.error(usage(config));
    exitWithError(
      `Missing required argument: ${required[parsed.positional.length].name}`,
    );
  }
  return parsed.positional;
}
