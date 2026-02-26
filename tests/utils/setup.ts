import dotenv from "dotenv";
dotenv.config();

// Override to test env
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-that-is-at-least-32-characters-long!!";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-at-least-32-chars-long!!";
process.env.LOG_LEVEL = "silent";
