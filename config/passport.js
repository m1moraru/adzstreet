import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import providerModel from '../models/providerModel.js';

passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        console.log('LOGIN ATTEMPT:', { email, password });

        const provider = await providerModel.getProviderAuthByEmail(email.trim().toLowerCase());
        console.log('PROVIDER FOUND:', provider);

        if (!provider || !provider.is_active) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        if (!provider.password_hash) {
          console.log('NO PASSWORD HASH FOUND');
          return done(null, false, { message: 'This account does not have a password set' });
        }

        const passwordMatches = await bcrypt.compare(password, provider.password_hash);
        console.log('PASSWORD MATCHES:', passwordMatches);

        if (!passwordMatches) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        return done(null, {
          id: provider.id,
          public_id: provider.public_id,
          name: provider.name,
          email: provider.email,
          city: provider.city,
          verified: provider.verified,
        });
      } catch (error) {
        console.error('PASSPORT ERROR:', error);
        return done(error);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const provider = await providerModel.getProviderAuthById(id);

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
    });
  } catch (error) {
    return done(error);
  }
});

export default passport;