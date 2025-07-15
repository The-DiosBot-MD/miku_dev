const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const config = require('../../core/config/config');
const { register, login, completeGoogleRegistration } = require('./auth.controller');
const verifyCloudflare = require('../../core/middleware/cloudflare.middleware');
const router = express.Router();

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false, failureRedirect: '/index.html?error=google_auth_failed' }, (err, user, info) => {
    
    if (err) {
      return next(err);
    }

    if (user) {
      const payload = { id: user.id, username: user.username, role: user.role };
      const token = jwt.sign(payload, config.jwt.secret, { expiresIn: '7d' });
      return res.redirect(`/app.html?token=${token}`);
    }

    if (info && info.tempToken) {
      return res.redirect(`/index.html?tempToken=${info.tempToken}`);
    }

    return res.redirect('/index.html?error=google_auth_failed');

  })(req, res, next);
});


router.post('/complete-google', verifyCloudflare, completeGoogleRegistration);

router.post('/register', verifyCloudflare, register);
router.post('/login', verifyCloudflare, login);

module.exports = router;