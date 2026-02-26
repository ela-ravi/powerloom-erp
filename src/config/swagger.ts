import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Powerloom ERP API",
      version: "1.0.0",
      description:
        "Multi-tenant SaaS ERP for powerloom textile manufacturing. Targets powerloom owners, wholesalers, and textile micro-manufacturing clusters in Tamil Nadu, India.",
    },
    servers: [{ url: "/api", description: "API base path" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "Health", description: "Health check" },
      { name: "Auth", description: "Authentication (OTP + PIN)" },
      { name: "Tenants", description: "Tenant management" },
      { name: "Users", description: "User management" },
      {
        name: "Master Data",
        description:
          "Loom types, looms, products, suppliers, customers, godowns, wagers",
      },
      { name: "Batches", description: "Batch lifecycle management" },
      {
        name: "Inventory",
        description: "Stock management, cone purchases, transfers",
      },
      {
        name: "Production",
        description:
          "Cone issuance, paavu production, production returns, downtimes, shifts",
      },
      { name: "Damage", description: "Damage recording and approval" },
      {
        name: "Post-Production",
        description: "Tailoring and packaging records",
      },
      { name: "Wages", description: "Advance management and wage cycles" },
      { name: "Sales", description: "Invoices and payments" },
      { name: "Notifications", description: "Notifications and fraud alerts" },
      {
        name: "Reports",
        description: "Production, wager, inventory, and finance reports",
      },
    ],
  },
  apis: ["./src/modules/**/*.routes.ts", "./src/modules/**/*.routes.js"],
};

export const swaggerSpec = swaggerJsdoc(options);
