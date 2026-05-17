const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');

// 优先使用 GITHUB_CALLBACK_URL;若未设,根据 BACKEND_URL/PORT 推导;最后回退到 localhost dev 默认
function resolveCallbackURL() {
  if (process.env.GITHUB_CALLBACK_URL) return process.env.GITHUB_CALLBACK_URL;
  const base = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 8089}`;
  return `${base.replace(/\/$/, '')}/api/auth/github/callback`;
}

module.exports = (passport) => {
  const callbackURL = resolveCallbackURL();
  console.log(`[passport] GitHub OAuth callback URL: ${callbackURL}`);

  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL,
        scope: ['user:email']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // 通过 githubId 查找已绑定的用户。
          // 关键:role !== 'admin' — 绝不允许 OAuth 把 admin 账号当作 GitHub 用户取回,
          // 否则一次"用户名/邮箱碰撞"导致的旧合并会让所有 OAuth 登录永久解析到 admin。
          let user = await User.findOne({
            githubId: profile.id,
            role: { $ne: 'admin' }
          });
          if (user) return done(null, user);

          const githubUsername = profile.username || `gh-${profile.id}`;
          const githubEmail = profile.emails?.[0]?.value;

          // ❌ 不再按 username/email 自动合并到已有用户 —
          //    旧逻辑会把 GitHub 身份吸进同 username/email 的 admin 账号,
          //    导致评论作者全部指向 admin、历史无法分辨。
          //    碰撞时改用后缀生成独立用户名/邮箱。

          let username = githubUsername;
          if (await User.exists({ username })) {
            username = `${githubUsername}-gh${profile.id}`;
          }

          let email = githubEmail || `gh-${profile.id}@github.local`;
          if (await User.exists({ email })) {
            email = `gh-${profile.id}@github.local`;
            if (await User.exists({ email })) {
              email = `gh-${profile.id}-${Date.now()}@github.local`;
            }
          }

          user = await User.create({
            githubId: profile.id,
            username,
            email,
            name: profile.displayName || githubUsername,
            avatar: profile.photos?.[0]?.value
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
