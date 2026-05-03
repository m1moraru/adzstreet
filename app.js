import express from 'express';
import cors from 'cors';
import path from 'path';
import session from 'express-session';

import passport from './config/passport.js';
import providerRoutes from './routes/providerRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import authRoutes from './routes/authRoutes.js';
import adminAuthRoutes from './routes/adminAuthRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import ageVerificationWebhookRoutes from './routes/ageVerificationWebhook.routes.js';
import ageVerificationRoutes from './routes/ageVerificationRoutes.js';

const app = express();

/* -------------------- CORS -------------------- */
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://adzstreet.com',
      'https://www.adzstreet.com',
    ],
    credentials: true,
  })
);

/* -------------------- WEBHOOK -------------------- */
app.use("/api", ageVerificationWebhookRoutes);

/* -------------------- BODY PARSER -------------------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* -------------------- SESSION -------------------- */
app.set("trust proxy", 1);

const cookieOptions = {
  path: "/",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
};

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'rotikos_987123_sokitore_1245',
    resave: false,
    saveUninitialized: false,
    cookie: {
      ...cookieOptions,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

/* -------------------- PASSPORT -------------------- */
app.use(passport.initialize());
app.use(passport.session());

/* -------------------- STATIC -------------------- */
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

/* -------------------- HEALTH CHECK -------------------- */
app.get('/', (_req, res) => {
  res.send('API is running...');
});

/* -------------------- ROUTES -------------------- */
app.use('/api/auth', authRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api', publicRoutes);

app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', ageVerificationRoutes);

/* -------------------- ERROR HANDLER -------------------- */
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    success: false,
    message: error.message || 'Internal server error',
  });
});

export default app;