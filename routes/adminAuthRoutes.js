import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../config/db.js';

const router = express.Router();

router.post('/login', async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const { rows } = await pool.query(
      `
      SELECT id, email, password_hash, role
      FROM admins
      WHERE email = $1
      LIMIT 1
      `,
      [email]
    );

    const admin = rows[0];

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const passwordMatches = await bcrypt.compare(password, admin.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    req.session.admin = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
    };

    req.session.save((err) => {
      if (err) {
        return next(err);
      }

      return res.status(200).json({
        success: true,
        message: 'Admin logged in successfully',
        admin: req.session.admin,
      });
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);

    res.clearCookie('connect.sid');

    return res.json({
      success: true,
      message: 'Logged out successfully',
    });
  });
});

router.get('/me', (req, res) => {
  if (!req.session?.admin) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated',
    });
  }

  return res.json({
    success: true,
    admin: req.session.admin,
  });
});

export default router;