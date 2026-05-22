import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import providerModel from "../models/providerModel.js";
import pool from "./db.js";

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        const normalizedEmail = email.trim().toLowerCase();

        const userResult = await pool.query(
          `
          SELECT
            id,
            full_name,
            email,
            password_hash,
            role,
            created_at
          FROM users
          WHERE email = $1
          `,
          [normalizedEmail]
        );

        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];

          if (!user.password_hash) {
            return done(null, false, {
              message: "This account does not have a password set",
            });
          }

          const passwordMatches = await bcrypt.compare(
            password,
            user.password_hash
          );

          if (!passwordMatches) {
            return done(null, false, {
              message: "Invalid email or password",
            });
          }

          return done(null, {
            id: user.id,
            name: user.full_name,
            email: user.email,
            role: user.role,
            account_type: "user",
          });
        }

        const provider = await providerModel.getProviderAuthByEmail(
          normalizedEmail
        );

        if (!provider || !provider.is_active) {
          return done(null, false, {
            message: "Invalid email or password",
          });
        }

        if (!provider.password_hash) {
          return done(null, false, {
            message: "This account does not have a password set",
          });
        }

        const passwordMatches = await bcrypt.compare(
          password,
          provider.password_hash
        );

        if (!passwordMatches) {
          return done(null, false, {
            message: "Invalid email or password",
          });
        }

        return done(null, {
          id: provider.id,
          public_id: provider.public_id,
          name: provider.name,
          email: provider.email,
          city: provider.city,
          verified: provider.verified,
          age_verified: provider.age_verified,
          age_verification_status: provider.age_verification_status,
          is_published: provider.is_published,
          account_type: "provider",
        });
      } catch (error) {
        console.error("PASSPORT ERROR:", error);
        return done(error);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, {
    id: user.id,
    account_type: user.account_type,
  });
});

passport.deserializeUser(async (sessionUser, done) => {
  try {
    if (sessionUser.account_type === "user") {
      const result = await pool.query(
        `
        SELECT
          id,
          full_name,
          email,
          role,
          created_at
        FROM users
        WHERE id = $1
        `,
        [sessionUser.id]
      );

      if (result.rows.length === 0) {
        return done(null, false);
      }

      const user = result.rows[0];

      return done(null, {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role,
        account_type: "user",
      });
    }

    const provider = await providerModel.getProviderAuthById(sessionUser.id);

    if (!provider || !provider.is_active) {
      return done(null, false);
    }

    return done(null, {
      id: provider.id,
      public_id: provider.public_id,
      name: provider.name,
      email: provider.email,
      city: provider.city,
      verified: provider.verified,
      age_verified: provider.age_verified,
      age_verification_status: provider.age_verification_status,
      is_published: provider.is_published,
      account_type: "provider",
    });
  } catch (error) {
    return done(error);
  }
});

export default passport;