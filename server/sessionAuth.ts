import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";

import { storage } from "./storage";

// Throttle user activity updates - only update once per minute
const lastActivityUpdates = new Map<string, number>();
const ACTIVITY_UPDATE_INTERVAL = 60 * 1000; // 1 minute

export function updateUserActivityThrottled(userId: string) {
  const now = Date.now();
  const lastUpdate = lastActivityUpdates.get(userId) || 0;
  const timeSinceLastUpdate = now - lastUpdate;

  if (timeSinceLastUpdate > ACTIVITY_UPDATE_INTERVAL) {
    lastActivityUpdates.set(userId, now);
    // Fire and forget - don't await to avoid blocking the request
    storage.updateUserActivity(userId).catch((err) => {
      console.error("[Activity] Failed to update user activity:", err);
    });
  }
}

export function getSession() {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be set");
  }

  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  return session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: "lax",
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

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated?.() || !user?.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const userId = user.claims.sub;
  if (userId) {
    updateUserActivityThrottled(userId);
  }

  return next();
};
