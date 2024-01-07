var express = require('express');
var router = express.Router();
var { v4: uuidv4 } = require('uuid');
var LocalStorage = require('node-localstorage').LocalStorage;
var localStorage = new LocalStorage('./scratch');

// GET users listing.
if (!localStorage.getItem("uuid")) {
  localStorage.setItem("uuid", uuidv4());
}

router.get('/', function(req, res) {
  res.render('auth');
});

const passport = require('passport');
var userProfile;

router.use(passport.initialize());
router.use(passport.session());

//router.set('view engine', 'ejs');

router.get('/success', (req, res) => res.send(userProfile));
router.get('/error', (req, res) => res.send("error logging in"));

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});

const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const GOOGLE_CLIENT_ID = '807623894501-vmntmssh6bf28j866i6kpeqr94f3f2k3.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
      userProfile=profile;
      console.log(profile.id)
      return done(null, userProfile);
  }
));
 
router.get('/auth/google', 
  passport.authenticate('google', { scope : ['profile', 'email'] }));
 
  router.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/error' }),
  function(req, res) {
    // Successful authentication, redirect success.
    
    res.redirect(`/${req.user.id}`);
  });

module.exports = router;
