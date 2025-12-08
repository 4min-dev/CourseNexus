import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedInitialData } from "./seed-categories";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  const queryString = Object.keys(req.query).length > 0 ? `?${new URLSearchParams(req.query as any).toString()}` : '';
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path}${queryString} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    } else if (path === "/reset-password" || path.startsWith("/reset-password")) {
      log(`[PAGE] ${req.method} ${path}${queryString} ${res.statusCode} in ${duration}ms - User-Agent: ${req.get('User-Agent')?.substring(0, 50) || 'unknown'}`);
    }
  });

  next();
});

(async () => {
  try {
    await seedInitialData();
  } catch (error) {
    console.error("Error seeding initial data:", error);
  }

  // Initialize video queue to restore any queued videos
  const { videoQueue } = await import('./videoQueue');
  console.log('[Server] Video queue initialized');

  // Initialize Telegram bot for polling
  const { startTelegramBot, stopTelegramBot } = await import('./telegram-bot');
  await startTelegramBot();

  // Initialize lesson notification scheduler
  const { lessonNotificationScheduler } = await import('./lessonNotificationScheduler');
  lessonNotificationScheduler.start();

  // Initialize engagement notification scheduler
  const { engagementScheduler } = await import('./engagementScheduler');
  engagementScheduler.start();

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });

  setTimeout(() => videoQueue.restoreQueueFromDatabase(), 5000);

  // Graceful shutdown - корректное завершение при получении сигналов
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n[Server] ${signal} received, starting graceful shutdown...`);

    // Stop Telegram bot
    stopTelegramBot();

    // Stop lesson notification scheduler
    lessonNotificationScheduler.stop();

    // Stop engagement notification scheduler
    engagementScheduler.stop();

    // Закрыть HTTP сервер (больше не принимать новые запросы)
    // Дождаться завершения всех активных соединений
    await new Promise<void>((resolve) => {
      server.close(() => {
        console.log('[Server] HTTP server closed - all connections finished');
        resolve();
      });
    });

    // Закрыть подключения к БД
    try {
      const { closeDatabase } = await import('./db');
      await closeDatabase();
    } catch (error) {
      console.error('[Server] Error during database shutdown:', error);
    }

    console.log('[Server] Graceful shutdown completed');
    process.exit(0);
  };

  // Обработка сигналов завершения
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Обработка необработанных ошибок - логировать, но не падать сразу
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
    // Не падать сразу, дать время для обработки текущих запросов
  });

  process.on('uncaughtException', (error) => {
    console.error('[Server] Uncaught Exception:', error);
    // Критическая ошибка - нужно перезапускаться
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });
})();
