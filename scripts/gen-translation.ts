/**
 * Generate i18n translation key structure for a module.
 * Usage: pnpm gen:translation <module_name>
 */

import * as path from "node:path";
import { parseArgs, validateArgs, type CliConfig } from "./lib/cli.js";
import {
  toKebabCase,
  toCamelCase,
  toPascalCase,
  toSnakeCase,
} from "./lib/naming.js";
import { writeFile, reportCreatedFiles } from "./lib/writer.js";

const config: CliConfig = {
  scriptName: "translation",
  description: "Generate i18n translation keys (English + Tamil) for a module",
  args: [
    {
      name: "module_name",
      description: "Module name (e.g., cone-purchase, wager-return)",
      required: true,
    },
  ],
  examples: [
    "pnpm gen:translation cone-purchase",
    "pnpm gen:translation wager-return",
    "pnpm gen:translation inventory",
  ],
};

const parsed = parseArgs(config);
const [rawName] = validateArgs(parsed, config);

const kebab = toKebabCase(rawName);
const camel = toCamelCase(rawName);
const pascal = toPascalCase(rawName);
const snake = toSnakeCase(rawName);

const filePath = path.resolve("src/i18n/_generated", `${kebab}.i18n.json`);

const translations = {
  [camel]: {
    pageTitle: {
      en: `${pascal.replace(/([A-Z])/g, " $1").trim()}`,
      ta: "// TODO: Tamil translation",
    },
    form: {
      create: {
        en: `Create ${pascal.replace(/([A-Z])/g, " $1").trim()}`,
        ta: "// TODO: Tamil translation",
      },
      edit: {
        en: `Edit ${pascal.replace(/([A-Z])/g, " $1").trim()}`,
        ta: "// TODO: Tamil translation",
      },
      // TODO: Add form field labels
      // fieldName: { en: "Field Label", ta: "// TODO: Tamil translation" },
    },
    button: {
      create: { en: "Create", ta: "// TODO: Tamil translation" },
      save: { en: "Save", ta: "// TODO: Tamil translation" },
      cancel: { en: "Cancel", ta: "// TODO: Tamil translation" },
      delete: { en: "Delete", ta: "// TODO: Tamil translation" },
      // TODO: Add module-specific buttons
    },
    table: {
      // TODO: Add table column headers
      // columnName: { en: "Column Header", ta: "// TODO: Tamil translation" },
      empty: {
        en: `No ${snake.replace(/_/g, " ")} found`,
        ta: "// TODO: Tamil translation",
      },
    },
    status: {
      // TODO: Add status labels relevant to this module
      // active: { en: "Active", ta: "செயலில்" },
      // completed: { en: "Completed", ta: "முடிந்தது" },
    },
    error: {
      notFound: {
        en: `${pascal.replace(/([A-Z])/g, " $1").trim()} not found`,
        ta: "// TODO: Tamil translation",
      },
      createFailed: {
        en: `Failed to create ${snake.replace(/_/g, " ")}`,
        ta: "// TODO: Tamil translation",
      },
      updateFailed: {
        en: `Failed to update ${snake.replace(/_/g, " ")}`,
        ta: "// TODO: Tamil translation",
      },
      deleteFailed: {
        en: `Failed to delete ${snake.replace(/_/g, " ")}`,
        ta: "// TODO: Tamil translation",
      },
    },
    success: {
      created: {
        en: `${pascal.replace(/([A-Z])/g, " $1").trim()} created successfully`,
        ta: "// TODO: Tamil translation",
      },
      updated: {
        en: `${pascal.replace(/([A-Z])/g, " $1").trim()} updated successfully`,
        ta: "// TODO: Tamil translation",
      },
      deleted: {
        en: `${pascal.replace(/([A-Z])/g, " $1").trim()} deleted successfully`,
        ta: "// TODO: Tamil translation",
      },
    },
  },
};

const content = JSON.stringify(translations, null, 2) + "\n";

writeFile(filePath, content);
reportCreatedFiles();
