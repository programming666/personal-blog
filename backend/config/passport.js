const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');

module.exports = (passport) => {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `http://localhost:5000/api/auth/github/callback`,
        scope: ['user:email']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // 根据githubId查找已有用户
          let user = await User.findOne({ githubId: profile.id });
          if (user) return done(null, user);

          const email = profile.emails?.[0]?.value;
          const githubUsername = profile.username;
          
          // 检查用户名或邮箱是否已存在
          const existingUser = await User.findOne({
            $or: [
              { username: githubUsername },
              { email: email }
            ]
          });

          if (existingUser) {
            // 关联GitHub账号到已有用户
            existingUser.githubId = profile.id;
            existingUser.avatar = profile.photos?.[0]?.value;
            await existingUser.save();
            return done(null, existingUser);
          }

          // 创建新用户
          user = await User.create({
            githubId: profile.id,
            username: githubUsername,
            email: email || `${githubUsername}@github.com`,
            name: profile.displayName || githubUsername,
            password: 'github_oauth', // 虚拟密码
            avatar: profile.photos?.[0]?.value,
            provider: 'github'
          });

          done(null, user);
        } catch (error) {
          done(error);
        }
      }
    )
  );
  
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};
