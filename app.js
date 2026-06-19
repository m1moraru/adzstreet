import express from "express";
import cors from "cors";
import path from "path";
import session from "express-session";
import { getSitemap } from "./controllers/sitemapController.js";
import { getCategoriesSitemap }
from "./controllers/categoriesSitemapController.js";

import passport from "./config/passport.js";
import providerRoutes from "./routes/providerRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import adminAuthRoutes from "./routes/adminAuthRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import adminUsersRoutes from "./routes/adminUsersRoutes.js";
import ageVerificationWebhookRoutes from "./routes/ageVerificationWebhook.routes.js";
import ageVerificationRoutes from "./routes/ageVerificationRoutes.js";
import usersRoutes from "./routes/usersRoutes.js";
import adsRoutes from "./routes/adsRoutes.js";
import adminAdsRoutes from "./routes/adminAdsRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import notificationsRoute from "./routes/notificationsRoute.js";
import accountRoutes from "./routes/accountRoutes.js";

const app = express();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: [
      "https://adzstreet.com",
      "https://www.adzstreet.com",
      "http://localhost:5173",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(ageVerificationWebhookRoutes);

app.use(
  session({
    name: "connect.sid",
    secret: process.env.SESSION_SECRET || "change_this_secret",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    domain: ".adzstreet.com",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  }
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/", (_req, res) => {
  res.send("API is running...");
});

app.get("/sitemap.xml", getSitemap);
app.get(
  "/categories-sitemap.xml",
  getCategoriesSitemap
);

app.use("/api/users", usersRoutes);
app.use("/api/ads", adsRoutes);
app.use("/api/account", accountRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/providers", providerRoutes);

app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/users", adminUsersRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/ads", adminAdsRoutes);

app.use("/api", ageVerificationRoutes);
app.use("/api", publicRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationsRoute);

app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    success: false,
    message: error.message || "Internal server error",
  });
});

export default app;