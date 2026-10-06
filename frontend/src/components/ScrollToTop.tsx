import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * 路由切换时的滚动位置管理。
 *
 * React Router 不会在跳转时自动重置滚动位置(它只提供 <ScrollRestoration />,
 * 属于需要显式挂载的能力),所以什么都不做时浏览器会保留上一页的 scrollY:
 * 新页面同样够长 → 停在半途;新页面较短 → 被文档高度截断到页面偏下位置。
 *
 * 策略:
 * - PUSH / REPLACE(点击链接进入新页面):立即回到顶部;带 #hash 时滚到锚点
 * - POP(浏览器前进/后退、刷新):恢复离开该页面时的位置;因为页面是懒加载 +
 *   异步取数,首帧文档高度可能不足会让 scrollTo 被截断,所以做有限次重试
 * - 位置按 location.key 记录并写入 sessionStorage,刷新后仍能恢复(与浏览器默认行为一致)
 * - 记录里带上 pathname+search,路径不一致时一律从顶部开始 —— location.key 对浏览器
 *   直接加载的条目会退化成同一个值('default'),只比 key 会把 A 页的位置套用到 B 页
 */

const STORAGE_KEY = 'blog:scroll-positions';
const MAX_ENTRIES = 50;
const RESTORE_TIMEOUT = 2500; // 兜底期限:由内容高度变化驱动重试,超时即收手

type ScrollRecord = { path: string; y: number };

const positions = new Map<string, ScrollRecord>();
let storageLoaded = false;

function loadPositions() {
  if (storageLoaded) return;
  storageLoaded = true;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const [key, value] of Object.entries(parsed)) {
      if (!value || typeof value !== 'object') continue;
      const { path, y } = value as Partial<ScrollRecord>;
      if (typeof path === 'string' && typeof y === 'number' && Number.isFinite(y)) positions.set(key, { path, y });
    }
  } catch {
    // 缓存损坏或被隐私模式禁用:忽略即可,顶多退化成回到顶部
  }
}

function persistPositions() {
  try {
    const recent = [...positions.entries()].slice(-MAX_ENTRIES);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(recent)));
  } catch {
    // 写入失败不影响当次会话内的内存记录
  }
}

function ScrollToTop() {
  const { pathname, search, hash, key } = useLocation();
  const navigationType = useNavigationType();
  const path = `${pathname}${search}`;

  // 记录用的 key/path 取"滚动发生那一刻"的当前位置:导航提交后上一页的 scroll 监听
  // 可能还活着(React 清理被动 effect 与浏览器派发 scroll 事件没有固定顺序),
  // 沿用闭包里的旧 key 写会把上一页的记录覆盖成新页面的 scrollTo(0,0) 结果(0)
  // TEMP DEBUG — 定位生产环境恢复位置失效的原因,诊断完删除
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbg = (o: Record<string, unknown>) => { try { const w = window as any; w.__st = w.__st || []; if (w.__st.length < 300) w.__st.push({ t: Math.round(performance.now()), ...o }); } catch { /* ignore */ } };
  const live = useRef({ key, path });
  useLayoutEffect(() => {
    live.current = { key, path };
  }, [key, path]);

  // 持续记录当前页滚动位置:比在卸载时读取可靠 —— 卸载时 DOM 已经换成新页面
  useEffect(() => {
    loadPositions();
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      const { key: at, path: atPath } = live.current;
      const y = window.scrollY;
      frame = requestAnimationFrame(() => {
        frame = 0;
        dbg({ ev: 'record', key: at, path: atPath, y: Math.round(y) });
        positions.set(at, { path: atPath, y });
      });
    };
    // pagehide(刷新/关标签)时把内存记录落盘,sessionStorage 让重载后仍能恢复
    const onPageHide = () => {
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      const { key: at, path: atPath } = live.current;
      positions.set(at, { path: atPath, y: window.scrollY });
      persistPositions();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', onPageHide);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // 自己接管滚动,避免浏览器对前进/后退的原生恢复与这里互相抢
  useEffect(() => {
    if (!('scrollRestoration' in window.history)) return;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useLayoutEffect(() => {
    if (hash) {
      let target: HTMLElement | null = null;
      try {
        target = document.getElementById(decodeURIComponent(hash.slice(1)));
      } catch {
        target = null;
      }
      if (target) {
        target.scrollIntoView();
        return;
      }
    }

    loadPositions();
    const saved = navigationType === 'POP' ? positions.get(key) : undefined;
    // 路径不一致说明这条记录属于另一个页面(浏览器直接加载的条目 key 会重复),不要套用
    const wanted = saved && saved.path === path ? saved.y : 0;
    dbg({ ev: 'start', key, path, navigationType, saved, wanted, y: Math.round(window.scrollY), docH: document.documentElement.scrollHeight });
    if (wanted <= 0) {
      window.scrollTo(0, 0);
      return;
    }

    let frame = 0;
    let finished = false;
    let observer: ResizeObserver | null = null;
    let deadline = 0;

    const finish = (reason: string) => {
      if (finished) return;
      finished = true;
      dbg({ ev: 'finish', reason, y: Math.round(window.scrollY), docH: document.documentElement.scrollHeight });
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      if (deadline) clearTimeout(deadline);
      deadline = 0;
      observer?.disconnect();
      observer = null;
    };

    // 只做"滚到目标",成不成交给调用方判断:异步页面可能几轮渲染后才够长,
    // 所以由文档高度变化(骨架屏→内容)驱动重试,而不是死等固定时长的定时重试
    const attempt = () => {
      frame = 0;
      if (finished) return;
      if (window.scrollY !== wanted) window.scrollTo(0, wanted);
      dbg({ ev: 'attempt', wanted, y: Math.round(window.scrollY), docH: document.documentElement.scrollHeight });
      if (Math.abs(window.scrollY - wanted) <= 2) finish('ok');
    };
    const schedule = () => {
      dbg({ ev: 'observer', y: Math.round(window.scrollY), docH: document.documentElement.scrollHeight });
      if (!finished && !frame) frame = requestAnimationFrame(attempt);
    };

    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(schedule);
      observer.observe(document.documentElement);
      if (document.body) observer.observe(document.body);
    } else {
      // 兜底:拿不到高度变化通知就退回逐帧重试(老浏览器)
      const poll = () => {
        attempt();
        if (!finished) frame = requestAnimationFrame(poll);
      };
      frame = requestAnimationFrame(poll);
    }
    schedule();
    // 兜底期限:内容始终不够长(或被别的东西反复挤动)时到此收手,释放监听
    deadline = window.setTimeout(() => {
      attempt();
      finish('deadline');
    }, RESTORE_TIMEOUT);
    const stop = () => finish('user');
    // 用户自己一动就放弃恢复,不跟用户抢滚动
    window.addEventListener('wheel', stop, { passive: true, once: true });
    window.addEventListener('touchstart', stop, { passive: true, once: true });
    window.addEventListener('pointerdown', stop, { once: true });
    window.addEventListener('keydown', stop, { once: true });
    return () => {
      dbg({ ev: 'cleanup', key, path });
      stop();
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchstart', stop);
      window.removeEventListener('pointerdown', stop);
      window.removeEventListener('keydown', stop);
    };
  }, [key, path, hash, navigationType]);

  return null;
}

export default ScrollToTop;
