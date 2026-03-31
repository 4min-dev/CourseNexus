import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedInitialData } from "./seed-categories";
import cron from 'node-cron';
import { sendInactivityReminders } from './telegram-bot'; 
import { sendNewCoursesNotification } from "./newCoursesNotification";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Lightweight probe endpoint for load balancer/readiness checks.
app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok", uptime: Math.round(process.uptime()) });
});

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

  // Initialize Telegram bot
  const { startTelegramBot, stopTelegramBot } = await import('./telegram-bot');
  await startTelegramBot();

  // Initialize lesson notification scheduler
  const { lessonNotificationScheduler } = await import('./lessonNotificationScheduler');
  lessonNotificationScheduler.start();

  // Initialize engagement notification scheduler
  const { engagementScheduler } = await import('./engagementScheduler');
  engagementScheduler.start();

  cron.schedule('0 12 * * *', async () => {
    console.log('[Inactivity] Запуск ежедневных напоминаний в 12:00 МСК')
    try {
      await sendInactivityReminders()
    } catch (err) {
      console.error('[Inactivity] Ошибка при отправке напоминаний:', err)
    }
  }, {
    timezone: "Europe/Moscow"
  })

  cron.schedule('10 12 * * *', async () => {
    console.log('[NewCourses] Запуск уведомления о новых курсах в 12:10 МСК');

    try {
      await sendNewCoursesNotification();
    } catch (err) {
      console.error('[NewCourses] Ошибка при отправке уведомления:', err);
    }
  }, {
    timezone: "Europe/Moscow"
  });

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });

  setTimeout(() => videoQueue.restoreQueueFromDatabase(), 5000);

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n[Server] ${signal} received, starting graceful shutdown...`);

    stopTelegramBot();
    lessonNotificationScheduler.stop();
    engagementScheduler.stop();

    await new Promise<void>((resolve) => {
      server.close(() => {
        console.log('[Server] HTTP server closed');
        resolve();
      });
    });

    try {
      const { closeDatabase } = await import('./db');
      await closeDatabase();
    } catch (error) {
      console.error('[Server] Error during database shutdown:', error);
    }

    console.log('[Server] Graceful shutdown completed');
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('unhandledRejection', (reason, promise) => {
    console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (error) => {
    console.error('[Server] Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });
})();