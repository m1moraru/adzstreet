import express from "express";
import cors from "cors";
import path from "path";
import session from "express-session";

import passport from "./config/passport.js";
import providerRoutes from "./routes/providerRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import adminAuthRoutes from "./routes/adminAuthRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import ageVerificationWebhookRoutes from "./routes/ageVerificationWebhook.routes.js";
import ageVerificationRoutes from "./routes/ageVerificationRoutes.js";
import usersRoutes from "./routes/usersRoutes.js";
import adsRoutes from "./routes/adsRoutes.js";
import adminAdsRoutes from "./routes/adminAdsRoutes.js";
import adminUsersRoutes from "./routes/adminUsersRoutes.js";

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

const corsOptions = {
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(ageVerificationWebhookRoutes);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "erotikos_987123_sokitore_124",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/", (_req, res) => {
  res.send("API is running...");
});

app.use("/api/users", usersRoutes);
app.use("/api/ads", adsRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/providers", providerRoutes);
app.use("/api/admin/users", adminUsersRoutes);
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/ads", adminAdsRoutes);
app.use("/api", ageVerificationRoutes);
app.use("/api", publicRoutes);

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