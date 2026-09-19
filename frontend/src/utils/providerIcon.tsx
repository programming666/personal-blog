// @ts-nocheck
// 第三方登录按钮的图标解析 + 后台「快速添加」模板目录。
// 图标优先级:上传的自定义图片 > 自定义 https 图片地址 > 预设品牌图标 > 默认钥匙图标。
import { FaGithub, FaKey } from 'react-icons/fa';
import {
  SiGitee,
  SiGitlab,
  SiGoogle,
  SiApple,
  SiDiscord,
  SiAuth0,
  SiOkta,
  SiWechat,
  SiFacebook,
  SiLinux,
  SiAuthelia,
  SiKeycloak
} from 'react-icons/si';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// 预设名必须与后端 ICON_PRESET_RE 兼容(小写字母/数字/-,2-24 位)
const PRESET_COMPONENTS = {
  github: FaGithub,
  gitee: SiGitee,
  gitlab: SiGitlab,
  google: SiGoogle,
  apple: SiApple,
  discord: SiDiscord,
  auth0: SiAuth0,
  okta: SiOkta,
  wechat: SiWechat,
  facebook: SiFacebook,
  linux: SiLinux,
  authelia: SiAuthelia,
  keycloak: SiKeycloak
};

export const ICON_PRESETS = [
  { id: '', label: '默认(钥匙)' },
  { id: 'github', label: 'GitHub' },
  { id: 'gitee', label: 'Gitee' },
  { id: 'gitlab', label: 'GitLab' },
  { id: 'google', label: 'Google' },
  { id: 'keycloak', label: 'Keycloak' },
  { id: 'authelia', label: 'Authelia' },
  { id: 'okta', label: 'Okta' },
  { id: 'auth0', label: 'Auth0' },
  { id: 'apple', label: 'Apple' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'wechat', label: '微信' },
  { id: 'discord', label: 'Discord' },
  { id: 'linux', label: 'Linux' }
];

export function iconSrc(icon) {
  if (!icon) return null;
  if (icon.path) return `${API_BASE}/${String(icon.path).replace(/^\/+/, '')}`;
  if (icon.url) return icon.url;
  return null;
}

/** 登录按钮/后台预览共用的图标渲染 */
export function ProviderIcon({ icon, className = 'text-xl' }) {
  const src = iconSrc(icon);
  if (src) {
    // className 里的 text-* 对 img 无效,用 em 尺寸让它跟随按钮/预览框的字号(与预设 SVG 一致)
    return <img src={src} alt="" className={`${className} object-contain`} style={{ width: '1em', height: '1em' }} />;
  }
  const Comp = PRESET_COMPONENTS[icon?.preset] || FaKey;
  return <Comp className={className} />;
}

// 快捷模板:选中后自动填好端点/scope/字段映射,只需补 client_id / client_secret
export const PROVIDER_TEMPLATES = [
  {
    key: 'gitee',
    label: 'Gitee(码云)',
    patch: {
      name: 'Gitee',
      iconPreset: 'gitee',
      authorizationUrl: 'https://gitee.com/oauth/authorize',
      tokenUrl: 'https://gitee.com/oauth/token',
      userInfoUrl: 'https://gitee.com/api/v5/user',
      emailUrl: '',
      scope: 'user_info emails',
      tokenAuthStyle: 'body',
      pkce: false,
      mapping: { id: 'id', name: 'name', email: 'email', avatar: 'avatar_url' }
    }
  },
  {
    key: 'gitlab',
    label: 'GitLab',
    patch: {
      name: 'GitLab',
      iconPreset: 'gitlab',
      authorizationUrl: 'https://gitlab.com/oauth/authorize',
      tokenUrl: 'https://gitlab.com/oauth/token',
      userInfoUrl: 'https://gitlab.com/api/v4/user',
      emailUrl: '',
      scope: 'read_user',
      tokenAuthStyle: 'body',
      pkce: true,
      mapping: { id: 'id', name: 'username', email: 'email', avatar: 'avatar_url' }
    }
  },
  {
    key: 'google',
    label: 'Google(OIDC)',
    patch: {
      name: 'Google',
      iconPreset: 'google',
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
      emailUrl: '',
      scope: 'openid email profile',
      tokenAuthStyle: 'body',
      pkce: true,
      mapping: { id: 'sub', name: 'name', email: 'email', avatar: 'picture' }
    }
  },
  {
    key: 'keycloak',
    label: '自建 Keycloak / OIDC(需替换域名与 realm)',
    patch: {
      name: 'SSO 登录',
      iconPreset: 'keycloak',
      authorizationUrl: 'https://sso.example.com/realms/myrealm/protocol/openid-connect/auth',
      tokenUrl: 'https://sso.example.com/realms/myrealm/protocol/openid-connect/token',
      userInfoUrl: 'https://sso.example.com/realms/myrealm/protocol/openid-connect/userinfo',
      emailUrl: '',
      scope: 'openid profile email',
      tokenAuthStyle: 'body',
      pkce: true,
      mapping: { id: 'sub', name: 'preferred_username', email: 'email', avatar: 'picture' }
    }
  }
];

/** 空白的 oauth2 提供方(新增时用) */
export function blankProvider(id) {
  return {
    id,
    type: 'oauth2',
    enabled: true,
    name: '',
    label: { zh: '', en: '' },
    icon: { path: '', url: '', preset: '' },
    clientId: '',
    // 新建 id 若与「删掉后重新添加」的同名 id 撞上:空字符串会被后端解释成「保持原值」从而复活旧密钥,
    // 这里必须用 null,后端才按显式清空处理
    clientSecret: null,
    authorizationUrl: '',
    tokenUrl: '',
    userInfoUrl: '',
    emailUrl: '',
    scope: 'openid profile email',
    tokenAuthStyle: 'body',
    pkce: false,
    redirectUri: '',
    mapping: { id: '', name: '', email: '', avatar: '' }
  };
}
