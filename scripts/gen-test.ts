/**
 * Generate test files for an existing module.
 * Usage: pnpm gen:test <module_name> [--unit|--integration|--both]
 */

import * as path from "node:path";
import { parseArgs, validateArgs, type CliConfig } from "./lib/cli.js";
import { toKebabCase, toPascalCase, toCamelCase } from "./lib/naming.js";
import { writeFile, reportCreatedFiles } from "./lib/writer.js";
import { unitTestSetup, integrationTestSetup } from "./lib/templates.js";

const config: CliConfig = {
  scriptName: "test",
  description: "Generate Vitest test files for a module",
  args: [
    {
      name: "module_name",
      description: "Module name (e.g., cone-purchase)",
      required: true,
    },
  ],
  flags: [
    {
      name: "unit",
      alias: "u",
      description: "Generate unit tests only",
      default: false,
    },
    {
      name: "integration",
      alias: "i",
      description: "Generate integration tests only",
      default: false,
    },
    {
      name: "both",
      alias: "b",
      description: "Generate both (default)",
      default: false,
    },
  ],
  examples: [
    "pnpm gen:test cone-purchase",
    "pnpm gen:test cone-purchase --unit",
    "pnpm gen:test wager-return --integration",
    "pnpm gen:test products --both",
  ],
};

const parsed = parseArgs(config);
const [rawName] = validateArgs(parsed, config);

const kebab = toKebabCase(rawName);
const pascal = toPascalCase(rawName);
const camel = toCamelCase(rawName);

const generateUnit =
  parsed.flags.unit ||
  parsed.flags.both ||
  (!parsed.flags.unit && !parsed.flags.integration);
const generateIntegration =
  parsed.flags.integration ||
  parsed.flags.both ||
  (!parsed.flags.unit && !parsed.flags.integration);

const testDir = path.resolve("src/modules", kebab, "__tests__");

if (generateUnit) {
  const unitPath = path.join(testDir, `${kebab}.service.test.ts`);
  writeFile(unitPath, buildUnitTest(kebab, pascal, camel));
}

if (generateIntegration) {
  const integrationPath = path.join(testDir, `${kebab}.api.test.ts`);
  writeFile(integrationPath, buildIntegrationTest(kebab, pascal, camel));
}

reportCreatedFiles();

function buildUnitTest(kebab: string, pascal: string, camel: string): string {
  return `${unitTestSetup(kebab)}

describe('${pascal}Service', () => {
  let service: ${pascal}Service;
  let mockRepo: jest.Mocked<${pascal}Repository>;
  const tenantId = '11111111-1111-1111-1111-111111111111';

  beforeEach(() => {
    mockRepo = {
      // TODO: Mock repository methods
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as jest.Mocked<${pascal}Repository>;

    service = new ${pascal}Service(mockRepo);
  });

  describe('create', () => {
    it('should create a new ${camel}', async () => {
      // TODO: Arrange — set up mock return value
      // const dto = { /* ... */ };
      // mockRepo.create.mockResolvedValue({ id: 'uuid', ...dto });

      // TODO: Act — call service method
      // const result = await service.create(tenantId, dto);

      // TODO: Assert — verify result and repo calls
      // expect(result).toBeDefined();
      // expect(mockRepo.create).toHaveBeenCalledWith(tenantId, dto);
      expect(true).toBe(true); // Remove after adding real assertions
    });

    it('should enforce tenant isolation on create', async () => {
      // TODO: Verify tenantId is passed to repository
      expect(true).toBe(true);
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      // TODO: Mock and verify pagination
      expect(true).toBe(true);
    });

    it('should only return records for the given tenant', async () => {
      // TODO: Verify tenant scoping
      expect(true).toBe(true);
    });
  });

  describe('findById', () => {
    it('should return a single ${camel} by id', async () => {
      // TODO: Mock findById and verify
      expect(true).toBe(true);
    });

    it('should throw if ${camel} not found', async () => {
      // TODO: Mock null return and verify error
      expect(true).toBe(true);
    });

    it('should throw if ${camel} belongs to different tenant', async () => {
      // TODO: Verify cross-tenant access is blocked
      expect(true).toBe(true);
    });
  });

  // TODO: Add business-logic-specific test groups
  // describe('specific business operation', () => { ... });
});
`;
}

function buildIntegrationTest(
  kebab: string,
  pascal: string,
  camel: string,
): string {
  return `${integrationTestSetup(kebab)}

describe('${pascal} API', () => {
  let tenant1Token: string;
  let tenant2Token: string;
  const API_BASE = '/api/${kebab}s';

  beforeAll(async () => {
    const t1 = await createTestTenant('Test Tenant 1');
    const t2 = await createTestTenant('Test Tenant 2');
    const user1 = await createTestUser(t1.id, 'admin');
    const user2 = await createTestUser(t2.id, 'admin');
    tenant1Token = await getAuthToken(user1);
    tenant2Token = await getAuthToken(user2);
  });

  afterAll(async () => {
    await resetDatabase();
  });

  describe('POST ' + API_BASE, () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post(API_BASE)
        .send({});

      expect(res.status).toBe(401);
    });

    it('should return 400 with invalid body', async () => {
      const res = await request(app)
        .post(API_BASE)
        .set('Authorization', \`Bearer \${tenant1Token}\`)
        .send({});

      expect(res.status).toBe(400);
      // TODO: Verify validation error shape
    });

    it('should create and return 201', async () => {
      const res = await request(app)
        .post(API_BASE)
        .set('Authorization', \`Bearer \${tenant1Token}\`)
        .send({
          // TODO: Add valid request body
        });

      expect(res.status).toBe(201);
      // TODO: Verify response body structure
    });
  });

  describe('GET ' + API_BASE, () => {
    it('should return paginated list', async () => {
      const res = await request(app)
        .get(API_BASE)
        .set('Authorization', \`Bearer \${tenant1Token}\`);

      expect(res.status).toBe(200);
      // TODO: Verify pagination structure { data: [], total: number, page: number }
    });

    it('should isolate data between tenants', async () => {
      const res1 = await request(app)
        .get(API_BASE)
        .set('Authorization', \`Bearer \${tenant1Token}\`);
      const res2 = await request(app)
        .get(API_BASE)
        .set('Authorization', \`Bearer \${tenant2Token}\`);

      // TODO: Verify tenant 1 data does not appear in tenant 2 results
      expect(res1.body.data).not.toEqual(res2.body.data);
    });
  });

  describe('GET ' + API_BASE + '/:id', () => {
    it('should return a single record', async () => {
      // TODO: Create a record first, then fetch by ID
      expect(true).toBe(true);
    });

    it('should return 403 for cross-tenant access', async () => {
      // TODO: Create record with tenant1, try to fetch with tenant2
      expect(true).toBe(true);
    });

    it('should return 404 for non-existent record', async () => {
      const res = await request(app)
        .get(\`\${API_BASE}/00000000-0000-0000-0000-000000000000\`)
        .set('Authorization', \`Bearer \${tenant1Token}\`);

      expect(res.status).toBe(404);
    });
  });

  // TODO: Add PUT, DELETE, and module-specific endpoint tests
});
`;
}
