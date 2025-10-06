const User = require('../models/User');
const passport = require('passport');

exports.githubAuth = passport.authenticate('github', { scope: ['user:email'] });

exports.githubAuthCallback = (req, res, next) => {
  const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
  passport.authenticate('github', { failureRedirect: '/login', session: false }, (err, user) => {
    if (err) {
      return res.redirect(`${frontend}/login?error=github_auth_failed`);
    }
    if (!user) {
      return res.redirect(`${frontend}/login?error=user_not_found`);
    }

    const token = user.getSignedJwtToken();

    const redirectUrl = `${frontend}/github-callback?` +
      `token=${token}&` +
      `userId=${user._id}&` +
      `username=${encodeURIComponent(user.username)}&` +
      `email=${encodeURIComponent(user.email)}&` +
      `name=${encodeURIComponent(user.name || user.username)}&` +
      `avatar=${encodeURIComponent(user.avatar || '')}`;

    res.redirect(redirectUrl);
  })(req, res, next);
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.logout = (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};
