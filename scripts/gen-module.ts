/**
 * Scaffold a complete module with routes, schema, types, service, repository, and tests.
 * Usage: pnpm gen:module <module_name>
 */

import * as path from "node:path";
import { parseArgs, validateArgs, type CliConfig } from "./lib/cli.js";
import {
  toKebabCase,
  toPascalCase,
  toCamelCase,
  toSnakeCase,
  toTableName,
} from "./lib/naming.js";
import { writeFile, reportCreatedFiles } from "./lib/writer.js";
import {
  importBlock,
  unitTestSetup,
  integrationTestSetup,
} from "./lib/templates.js";

const config: CliConfig = {
  scriptName: "module",
  description:
    "Scaffold a full module with routes, schema, types, service, repository, and tests",
  args: [
    {
      name: "module_name",
      description: "Module name (e.g., cone-purchase, wager-return)",
      required: true,
    },
  ],
  examples: [
    "pnpm gen:module cone-purchase",
    "pnpm gen:module wager-return",
    "pnpm gen:module product",
  ],
};

const parsed = parseArgs(config);
const [rawName] = validateArgs(parsed, config);

const kebab = toKebabCase(rawName);
const pascal = toPascalCase(rawName);
const camel = toCamelCase(rawName);
const snake = toSnakeCase(rawName);
const table = toTableName(rawName);

const moduleDir = path.resolve("src/modules", kebab);

// 1. Routes
writeFile(path.join(moduleDir, `${kebab}.routes.ts`), buildRoutes());

// 2. Schema
writeFile(path.join(moduleDir, `${kebab}.schema.ts`), buildSchema());

// 3. Types
writeFile(path.join(moduleDir, `${kebab}.types.ts`), buildTypes());

// 4. Service
writeFile(path.join(moduleDir, `${kebab}.service.ts`), buildService());

// 5. Repository
writeFile(path.join(moduleDir, `${kebab}.repository.ts`), buildRepository());

// 6. Unit test
writeFile(
  path.join(moduleDir, "__tests__", `${kebab}.service.test.ts`),
  buildUnitTest(),
);

// 7. Integration test
writeFile(
  path.join(moduleDir, "__tests__", `${kebab}.api.test.ts`),
  buildIntegrationTest(),
);

reportCreatedFiles();

// --- Template builders ---

function buildRoutes(): string {
  return `${importBlock("routes", kebab)}

const router = Router();
const service = new ${pascal}Service();

// GET /api/${kebab}s — List with pagination
router.get(
  '/',
  authenticate,
  authorize('${snake}:read'),
  async (req, res, next) => {
    try {
      const result = await service.findAll(req.tenantId, {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        // TODO: Add filter/sort params
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/${kebab}s/:id — Get by ID
router.get(
  '/:id',
  authenticate,
  authorize('${snake}:read'),
  async (req, res, next) => {
    try {
      const result = await service.findById(req.tenantId, req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/${kebab}s — Create
router.post(
  '/',
  authenticate,
  authorize('${snake}:write'),
  validate(${camel}Schema.create),
  async (req, res, next) => {
    try {
      const result = await service.create(req.tenantId, req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/${kebab}s/:id — Update
router.put(
  '/:id',
  authenticate,
  authorize('${snake}:write'),
  validate(${camel}Schema.update),
  async (req, res, next) => {
    try {
      const result = await service.update(req.tenantId, req.params.id, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/${kebab}s/:id — Soft delete
router.delete(
  '/:id',
  authenticate,
  authorize('${snake}:delete'),
  async (req, res, next) => {
    try {
      await service.delete(req.tenantId, req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// TODO: Add module-specific routes (e.g., approve, stage transition)

export default router;
`;
}

function buildSchema(): string {
  return `${importBlock("schema", kebab)}

// Create schema — excludes id, tenant_id, timestamps (auto-managed)
const create${pascal}Schema = z.object({
  // TODO: Add fields from migration
  // name: z.string().min(1).max(255),
  // quantity: z.number().positive(),
  // status: z.enum(['active', 'completed', 'cancelled']),
  // relatedId: z.string().uuid(),
});

// Update schema — all fields optional
const update${pascal}Schema = create${pascal}Schema.partial();

// Query/filter params
const ${camel}QuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  // TODO: Add filter fields
  // status: z.enum(['active', 'completed', 'cancelled']).optional(),
  // sortBy: z.enum(['created_at', 'name']).default('created_at'),
  // sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const ${camel}Schema = {
  create: create${pascal}Schema,
  update: update${pascal}Schema,
  query: ${camel}QuerySchema,
};

export type Create${pascal}Input = z.infer<typeof create${pascal}Schema>;
export type Update${pascal}Input = z.infer<typeof update${pascal}Schema>;
export type ${pascal}Query = z.infer<typeof ${camel}QuerySchema>;
`;
}

function buildTypes(): string {
  return `/**
 * Types for the ${pascal} module.
 * Shared between API, service, and client layers.
 */

export interface ${pascal} {
  id: string;
  tenantId: string;
  // TODO: Add fields matching migration columns (camelCase)
  createdAt: Date;
  updatedAt: Date;
}

export interface Create${pascal}Dto {
  // TODO: Fields for creating a new ${camel} (no id, tenantId, timestamps)
}

export interface Update${pascal}Dto {
  // TODO: Fields for updating (all optional)
}

export interface ${pascal}ListParams {
  page: number;
  limit: number;
  // TODO: Add filter/sort params
}

export interface ${pascal}ListResult {
  data: ${pascal}[];
  total: number;
  page: number;
  limit: number;
}
`;
}

function buildService(): string {
  return `${importBlock("service", kebab)}

export class ${pascal}Service {
  constructor(private readonly repo = new ${pascal}Repository()) {}

  async create(tenantId: string, dto: Create${pascal}Dto): Promise<${pascal}> {
    // TODO: Add business logic / validation before persisting
    return this.repo.create(tenantId, dto);
  }

  async findAll(tenantId: string, params: ${pascal}ListParams): Promise<${pascal}ListResult> {
    return this.repo.findAll(tenantId, params);
  }

  async findById(tenantId: string, id: string): Promise<${pascal}> {
    const record = await this.repo.findById(tenantId, id);
    if (!record) {
      // TODO: Use a proper AppError class
      throw new Error('${pascal} not found');
    }
    return record;
  }

  async update(tenantId: string, id: string, dto: Update${pascal}Dto): Promise<${pascal}> {
    await this.findById(tenantId, id); // Ensure exists + tenant match
    // TODO: Add business logic / validation before updating
    return this.repo.update(tenantId, id, dto);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.findById(tenantId, id); // Ensure exists + tenant match
    return this.repo.delete(tenantId, id);
  }

  // TODO: Add module-specific business methods
}
`;
}

function buildRepository(): string {
  return `${importBlock("repository", kebab)}

export class ${pascal}Repository extends BaseRepository<${pascal}> {
  constructor() {
    super('${table}');
  }

  // TODO: Add custom query methods beyond CRUD
  // Example: findByStatus, findWithRelations, aggregateByPeriod
}
`;
}

function buildUnitTest(): string {
  return `${unitTestSetup(kebab)}

describe('${pascal}Service', () => {
  let service: ${pascal}Service;
  let mockRepo: jest.Mocked<${pascal}Repository>;
  const tenantId = '11111111-1111-1111-1111-111111111111';

  beforeEach(() => {
    mockRepo = {
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
      // TODO: Set up test data and assertions
      expect(true).toBe(true);
    });

    it('should enforce tenant isolation', async () => {
      // TODO: Verify tenantId is passed through
      expect(true).toBe(true);
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      // TODO: Mock and verify
      expect(true).toBe(true);
    });
  });

  describe('findById', () => {
    it('should return record when found', async () => {
      // TODO: Mock and verify
      expect(true).toBe(true);
    });

    it('should throw when not found', async () => {
      mockRepo.findById.mockResolvedValue(null as any);
      await expect(service.findById(tenantId, 'nonexistent')).rejects.toThrow();
    });
  });

  // TODO: Add tests for module-specific business logic
});
`;
}

function buildIntegrationTest(): string {
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
    it('should return 401 without auth', async () => {
      const res = await request(app).post(API_BASE).send({});
      expect(res.status).toBe(401);
    });

    it('should return 400 with invalid body', async () => {
      const res = await request(app)
        .post(API_BASE)
        .set('Authorization', \`Bearer \${tenant1Token}\`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('should create and return 201', async () => {
      const res = await request(app)
        .post(API_BASE)
        .set('Authorization', \`Bearer \${tenant1Token}\`)
        .send({
          // TODO: Add valid request body
        });
      expect(res.status).toBe(201);
      // TODO: Verify response shape
    });
  });

  describe('GET ' + API_BASE, () => {
    it('should return paginated list', async () => {
      const res = await request(app)
        .get(API_BASE)
        .set('Authorization', \`Bearer \${tenant1Token}\`);
      expect(res.status).toBe(200);
      // TODO: Verify { data, total, page, limit }
    });

    it('should isolate data between tenants', async () => {
      // TODO: Verify cross-tenant isolation
      expect(true).toBe(true);
    });
  });

  describe('GET ' + API_BASE + '/:id', () => {
    it('should return 404 for non-existent', async () => {
      const res = await request(app)
        .get(\`\${API_BASE}/00000000-0000-0000-0000-000000000000\`)
        .set('Authorization', \`Bearer \${tenant1Token}\`);
      expect(res.status).toBe(404);
    });

    it('should return 403 for cross-tenant access', async () => {
      // TODO: Create with tenant1, fetch with tenant2
      expect(true).toBe(true);
    });
  });

  // TODO: Add PUT, DELETE, and module-specific endpoint tests
});
`;
}
