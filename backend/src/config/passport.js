const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const pool = require('./database');
require('dotenv').config();

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query('SELECT * FROM auth_users WHERE id = $1', [id]);
    done(null, result.rows[0] || null);
  } catch (err) {
    done(err, null);
  }
});

// Google OAuth
if (process.env.GOOGLE_CLIENT_ID) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      const name = profile.displayName;
      const avatar = profile.photos?.[0]?.value;

      let result = await pool.query(
        'SELECT * FROM auth_users WHERE provider = $1 AND provider_id = $2',
        ['google', profile.id]
      );

      if (result.rows.length === 0) {
        result = await pool.query(
          `INSERT INTO auth_users (provider, provider_id, email, name, avatar)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          ['google', profile.id, email, name, avatar]
        );
      }

      return done(null, result.rows[0]);
    } catch (err) {
      return done(err, null);
    }
  }));
}

// GitHub OAuth
if (process.env.GITHUB_CLIENT_ID) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value || `${profile.username}@github.com`;
      const name = profile.displayName || profile.username;
      const avatar = profile.photos?.[0]?.value;

      let result = await pool.query(
        'SELECT * FROM auth_users WHERE provider = $1 AND provider_id = $2',
        ['github', String(profile.id)]
      );

      if (result.rows.length === 0) {
        result = await pool.query(
          `INSERT INTO auth_users (provider, provider_id, email, name, avatar)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          ['github', String(profile.id), email, name, avatar]
        );
      }

      return done(null, result.rows[0]);
    } catch (err) {
      return done(err, null);
    }
  }));
}

module.exports = passport;
