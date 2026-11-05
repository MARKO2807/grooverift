// Shared Vitest setup. Tests must never read a real environment file.
process.env.NODE_ENV ??= "test";
process.env.APP_URL ??= "http://localhost:3000";
process.env.BETTER_AUTH_SECRET ??= "test-secret-test-secret-test-secret-0000";
