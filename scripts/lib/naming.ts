/**
 * Case conversion and naming utilities for code generation.
 * Handles snake_case ↔ camelCase ↔ PascalCase ↔ kebab-case
 * plus basic singular/plural for table naming.
 */

/** Split any cased string into lowercase word parts */
function splitWords(s: string): string[] {
  return (
    s
      // Insert boundary between lowercase/digit and uppercase: "coneIssuances" → "cone Issuances"
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      // Insert boundary between consecutive uppercase and lowercase: "HTMLParser" → "HTML Parser"
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
      // Replace non-alphanumeric with space
      .replace(/[^a-zA-Z0-9]+/g, " ")
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
  );
}

/** cone_issuances, ConeIssuances, cone-issuances → cone_issuances */
export function toSnakeCase(s: string): string {
  return splitWords(s).join("_");
}

/** cone_issuances → coneIssuances */
export function toCamelCase(s: string): string {
  const words = splitWords(s);
  return words
    .map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1)))
    .join("");
}

/** cone_issuances → ConeIssuances */
export function toPascalCase(s: string): string {
  return splitWords(s)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join("");
}

/** cone_issuances → cone-issuances */
export function toKebabCase(s: string): string {
  return splitWords(s).join("-");
}

// Common irregular plurals relevant to domain
const IRREGULARS: Record<string, string> = {
  person: "people",
  child: "children",
  goose: "geese",
  man: "men",
  woman: "women",
  tooth: "teeth",
  foot: "feet",
  mouse: "mice",
  datum: "data",
  index: "indexes",
  status: "statuses",
};

const IRREGULAR_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(IRREGULARS).map(([k, v]) => [v, k]),
);

// Words that are the same in singular and plural
const UNCOUNTABLE = new Set([
  "sheep",
  "fish",
  "deer",
  "series",
  "species",
  "money",
  "rice",
  "information",
  "equipment",
  "paavu",
  "oodai",
]);

/** Basic singularization: cone_issuances → cone_issuance */
export function toSingular(s: string): string {
  const lower = s.toLowerCase();

  if (UNCOUNTABLE.has(lower)) return s;
  if (IRREGULAR_REVERSE[lower]) return IRREGULAR_REVERSE[lower];

  if (lower.endsWith("ies") && lower.length > 4) {
    return s.slice(0, -3) + "y";
  }
  if (
    lower.endsWith("ses") ||
    lower.endsWith("xes") ||
    lower.endsWith("zes") ||
    lower.endsWith("ches") ||
    lower.endsWith("shes")
  ) {
    return s.slice(0, -2);
  }
  if (lower.endsWith("s") && !lower.endsWith("ss")) {
    return s.slice(0, -1);
  }
  return s;
}

/** Basic pluralization: cone_issuance → cone_issuances */
export function toPlural(s: string): string {
  const lower = s.toLowerCase();

  if (UNCOUNTABLE.has(lower)) return s;
  if (IRREGULARS[lower]) return IRREGULARS[lower];

  if (lower.endsWith("y") && !/[aeiou]y$/.test(lower)) {
    return s.slice(0, -1) + "ies";
  }
  if (
    lower.endsWith("s") ||
    lower.endsWith("x") ||
    lower.endsWith("z") ||
    lower.endsWith("ch") ||
    lower.endsWith("sh")
  ) {
    return s + "es";
  }
  return s + "s";
}

/**
 * Convert any input to a database table name (snake_case, plural).
 * coneIssuance → cone_issuances
 * ConeIssuance → cone_issuances
 * cone_issuance → cone_issuances
 */
export function toTableName(s: string): string {
  const snake = toSnakeCase(s);
  // Split on underscore, pluralize only the last word, rejoin
  const parts = snake.split("_");
  parts[parts.length - 1] = toPlural(parts[parts.length - 1]);
  return parts.join("_");
}
