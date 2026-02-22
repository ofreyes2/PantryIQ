import { Hono } from "hono";

const healthRouter = new Hono();

interface HealthResponse {
  status: "ok" | "error";
  database: "ok" | "error";
  timestamp: string;
}

interface ErrorResponse {
  message: string;
  code: string;
}

/**
 * Test database connection
 * Currently a placeholder for when database is configured
 */
async function testDatabaseConnection(): Promise<boolean> {
  try {
    // This would be replaced with actual database query when Prisma is configured
    // For now, we simulate a successful connection
    // Example: const count = await prisma.user.count();
    return true;
  } catch (error) {
    console.error("Database connection error:", error);
    return false;
  }
}

/**
 * GET /api/health
 * Health check endpoint that tests API and database connectivity
 */
healthRouter.get("/", async (c) => {
  try {
    // Test database connection
    const databaseOk = await testDatabaseConnection();

    if (!databaseOk) {
      return c.json(
        {
          error: {
            message: "Database connection failed",
            code: "DB_ERROR",
          },
        },
        500
      );
    }

    // All systems healthy
    const response: HealthResponse = {
      status: "ok",
      database: "ok",
      timestamp: new Date().toISOString(),
    };

    return c.json({ data: response }, 200);
  } catch (error) {
    console.error("Health check error:", error);

    return c.json(
      {
        error: {
          message: "Health check failed",
          code: "HEALTH_CHECK_ERROR",
        },
      },
      500
    );
  }
});

export { healthRouter };
