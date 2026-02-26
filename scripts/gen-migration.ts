/**
 * Generate a database migration file with tenant isolation boilerplate.
 * Usage: pnpm gen:migration <table_name>
 */

import * as path from "node:path";
import { parseArgs, validateArgs, type CliConfig } from "./lib/cli.js";
import { toSnakeCase, toTableName } from "./lib/naming.js";
import { writeFile, reportCreatedFiles } from "./lib/writer.js";
import {
  migrationHeader,
  standardColumns,
  rlsPolicy,
  updatedAtTrigger,
  tenantIdIndex,
} from "./lib/templates.js";

const config: CliConfig = {
  scriptName: "migration",
  description: "Generate a PostgreSQL migration with tenant isolation and RLS",
  args: [
    {
      name: "table_name",
      description: "Table name (snake_case, singular or plural)",
      required: true,
    },
  ],
  examples: [
    "pnpm gen:migration cone_purchases",
    "pnpm gen:migration wager_returns",
    "pnpm gen:migration products",
  ],
};

const parsed = parseArgs(config);
const [rawName] = validateArgs(parsed, config);

const tableName = toTableName(rawName);
const snakeName = toSnakeCase(rawName);
const timestamp = new Date().toISOString().replace(/[-T:]/g, "").slice(0, 14);

const fileName = `${timestamp}_create_${tableName}.sql`;
const filePath = path.resolve("src/db/migrations", fileName);

const content = `${migrationHeader(tableName)}

CREATE TABLE ${tableName} (
${standardColumns()},

  -- TODO: Add foreign key constraints
  -- CONSTRAINT fk_${tableName}_example FOREIGN KEY (example_id) REFERENCES examples(id)
);

-- Indexes
${tenantIdIndex(tableName)}
-- TODO: Add indexes for frequently queried columns
-- CREATE INDEX idx_${tableName}_<column> ON ${tableName}(<column>);

${rlsPolicy(tableName)}

${updatedAtTrigger(tableName)}

-- TODO: Add any ENUM types above the CREATE TABLE if needed
-- CREATE TYPE ${snakeName}_status AS ENUM ('active', 'completed', 'cancelled');
`;

writeFile(filePath, content);
reportCreatedFiles();
