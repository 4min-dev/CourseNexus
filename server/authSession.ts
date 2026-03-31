import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { lastReminderLevelMap } from "./telegram-bot";

const lastActivityUpdates = new Map<string, number>();
const ACTIVITY_UPDATE_INTERVAL = 60 * 1000;

export function updateUserActivityThrottled(userId: string) {
  const now = Date.now();
  const lastUpdate = lastActivityUpdates.get(userId) || 0;
  const timeSinceLastUpdate = now - lastUpdate;

  if (timeSinceLastUpdate > ACTIVITY_UPDATE_INTERVAL) {
    lastActivityUpdates.set(userId, now);

    Promise.all([
      storage.updateUserActivity(userId),
      Promise.resolve().then(() => {
        lastReminderLevelMap.delete(userId);
        console.log(`[Activity] Сброс уровня напоминаний для пользователя ${userId} (активность)`);
      })
    ]).catch(err => {
      console.error('[Activity] Ошибка при обновлении активности / сбросе уровня:', err);
    });
  }
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || "dev-session-secret",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (process.env.AUTH_BYPASS === "true") {
    return next();
  }

  const user = req.user as any;

  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Update user activity (throttled, non-blocking)
  // User object has structure: { claims: { sub: 'userId', ... } }
  const userId = user?.claims?.sub;
  if (userId) {
    updateUserActivityThrottled(userId);
  }

  return next();
};
