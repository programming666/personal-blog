#!/bin/bash
# ============================================================================
# cf-origin-allowlist.sh — 源站端口只允许 Cloudflare 回源访问
# ============================================================================
#
# 为什么需要它
# ------------
# 源站(159.195.244.144)上有若干端口是专门给 Cloudflare 回源用的:
#
#     3000 → 127.0.0.1:3001   xh.do 主站(stunnel TLS 终结)
#     3002 → 127.0.0.1:3012   xh.do     的 mailcow 面板(stunnel TLS →
#     3003 → 127.0.0.1:3013   bookshop.wiki  ┐   127.0.0.1:3005 mailcow nginx)
#     3004 → 127.0.0.1:3014   6mail.at      ┘
#     8089 → 127.0.0.1:8090   blog.xh.do 后端(stunnel TLS)
#     3001                      上一行的后端本体(*明文* HTTP,stunnel 转发目标)
#
# 这些端口此前对全网开放,于是任何人 `curl https://159.195.244.144:8089` 就能
# **完全绕过 Cloudflare** —— WAF、机器人防护、边缘限速那一层等于不存在(实测返回 200)。
# 3001 更直接:明文 HTTP,连 TLS 都省了。
#
# 怎么做的
# --------
# 不用 ipset(要多装一个包、多一层状态),直接用纯 iptables 规则:每个 CF 网段一条
# ACCEPT,末尾一条 DROP。当前是 15 条 v4 + 7 条 v6,很小,`iptables -L` 一眼能看完。
#
#   Chain CFONLY
#     -i lo -j RETURN                                      ← 本机回环全放行
#     -s <cf v4 网段> -p tcp -m multiport --dports $PORTS -j ACCEPT   ×15
#     -p tcp -m multiport --dports $PORTS -j DROP           ← 其余来源一律丢
#     -j RETURN                                            ← 其它端口交回 INPUT
#
# 规则挂在 INPUT 的第 1 位,末尾 RETURN 把不相关流量交还给 INPUT 剩下的规则
# (mailcow 的 MAILCOW 链只管它自己的端口,互不干扰)。v4/v6 各一套。
#
# 只匹配 TCP —— 这些端口上没有 UDP 服务。
#
# IP 列表
# -------
# 来自官方接口 https://api.cloudflare.com/client/v4/ips,缓存 24 小时后过期重取。
# **取不到列表时保留现有规则不动** —— 绝不清空,清空就等于放行全网。
#
# 用法
# ----
#   cf-origin-allowlist.sh                 按缓存套用规则(缓存过期则先拉接口)
#   cf-origin-allowlist.sh --force-refresh 强制先拉接口再套用
#   cf-origin-allowlist.sh --dry-run       只打印将要写入的规则,不碰防火墙
#   cf-origin-allowlist.sh --status        查看当前规则与缓存
#   cf-origin-allowlist.sh --rollback      移除规则(端口重新对全网开放)
#
# 安装见 DEPLOY.md 9.2。
# ============================================================================

set -u -o pipefail

# ---- 需要限制来源的端口(逗号分隔,不要加空格)------------------------------
# 新增一个"给 Cloudflare 回源用"的端口时加到这里,然后
# `systemctl restart cf-origin-allowlist.service`。怎么判断某个端口是不是 CF 回源口:
#   在发起真实请求的同时看对端地址 —— `ss -tn state established | grep ':8089'`
#   对端落在 CF 网段(104.16.0.0/13、172.64.0.0/13、188.114.96.0/20 …)就是。
PORTS="3000,3001,3002,3003,3004,8089"

CHAIN="CFONLY"
CACHE_DIR="/etc/cf-origin-allowlist"
CACHE_FILE="$CACHE_DIR/ips.txt"
MAX_AGE=$((24 * 3600))          # 缓存最长复用 24h
API="https://api.cloudflare.com/client/v4/ips"
MIN_V4=10                       # 少于这个数认为接口返回不可信,拒绝套用
MIN_V6=5

log() { echo "[cf-origin-allowlist] $*"; }
die() { log "错误: $*"; exit 1; }

# ---------------------------------------------------------------------------
# 拉取并缓存 CF 网段。成功返回 0。
# ---------------------------------------------------------------------------
fetch_ips() {
  local tmp v4 v6 n4 n6
  tmp=$(mktemp) || return 1

  if ! curl -fsS --retry 3 --retry-delay 2 --max-time 30 "$API" -o "$tmp"; then
    log "拉取 $API 失败(网络或接口不可用)"
    rm -f "$tmp"
    return 1
  fi

  # 只有 IPv6 含冒号,所以两类可以干净分开
  v4=$(grep -oE '"[0-9]{1,3}(\.[0-9]{1,3}){3}/[0-9]{1,2}"' "$tmp" | tr -d '"' | sort -u)
  v6=$(grep -oE '"[0-9a-fA-F:]+/[0-9]{1,3}"' "$tmp" | tr -d '"' | sort -u)
  rm -f "$tmp"

  n4=$(printf '%s\n' "$v4" | grep -c .)
  n6=$(printf '%s\n' "$v6" | grep -c .)

  # 上游返回异常(错误页、或 CF 大幅缩减网段)时宁可不用,也不要套用一份残缺列表
  # —— 那会让部分真实用户被挡在门外。
  if [ "$n4" -lt "$MIN_V4" ] || [ "$n6" -lt "$MIN_V6" ]; then
    log "接口返回的网段数量异常(v4=$n4 v6=$n6),拒绝套用"
    return 1
  fi

  mkdir -p "$CACHE_DIR"
  printf '%s\n%s\n' "$v4" "$v6" | grep . > "$CACHE_FILE.tmp" || { rm -f "$CACHE_FILE.tmp"; return 1; }
  mv "$CACHE_FILE.tmp" "$CACHE_FILE"
  log "已更新网段缓存:v4=$n4 v6=$n6"
  return 0
}

cache_is_fresh() {
  [ -s "$CACHE_FILE" ] || return 1
  local age
  age=$(( $(date +%s) - $(stat -c %Y "$CACHE_FILE") ))
  [ "$age" -lt "$MAX_AGE" ]
}

# ---------------------------------------------------------------------------
# 生成规则体(不含 -A "$CHAIN" 前缀),参数是网段列表。
# v4 / v6 的规则体完全同构,只是网段集合不同。
# ---------------------------------------------------------------------------
rules_for() {
  local cidrs="$1" c
  printf -- '-i lo -j RETURN\n'
  while read -r c; do
    [ -n "$c" ] || continue
    printf -- '-s %s -p tcp -m multiport --dports %s -j ACCEPT\n' "$c" "$PORTS"
  done <<< "$cidrs"
  printf -- '-p tcp -m multiport --dports %s -j DROP\n' "$PORTS"
  printf -- '-j RETURN\n'
}

# ---------------------------------------------------------------------------
# 按缓存重放规则。幂等,可重复执行。
# ---------------------------------------------------------------------------
apply_rules() {
  [ -s "$CACHE_FILE" ] || die "缓存 $CACHE_FILE 不存在,拒绝套用规则"

  local v4 v6 rc=0
  v4=$(grep -v ':' "$CACHE_FILE")
  v6=$(grep ':' "$CACHE_FILE")

  if [ "$(printf '%s\n' "$v4" | grep -c .)" -lt "$MIN_V4" ] ||
     [ "$(printf '%s\n' "$v6" | grep -c .)" -lt "$MIN_V6" ]; then
    die "缓存内容不完整,拒绝套用规则"
  fi

  if [ "$DRY" = 1 ]; then
    echo "# 以下规则会写入 iptables / ip6tables(实际未执行):"
    printf '%s\n' "-- ipv4: iptables -N $CHAIN; iptables -F $CHAIN"
    while read -r r; do printf '   iptables -A %s %s\n' "$CHAIN" "$r"; done <<< "$(rules_for "$v4")"
    echo "   iptables -I INPUT 1 -j $CHAIN   (若尚未挂载)"
    printf '%s\n' "-- ipv6: ip6tables -N $CHAIN; ip6tables -F $CHAIN"
    while read -r r; do printf '   ip6tables -A %s %s\n' "$CHAIN" "$r"; done <<< "$(rules_for "$v6")"
    echo "   ip6tables -I INPUT 1 -j $CHAIN   (若尚未挂载)"
    return 0
  fi

  local cmd cidrs r
  for cmd in iptables ip6tables; do
    if [ "$cmd" = iptables ]; then cidrs="$v4"; else cidrs="$v6"; fi

    $cmd -N "$CHAIN" 2>/dev/null || true
    $cmd -F "$CHAIN" || die "清空 $CHAIN ($cmd) 失败"

    while read -r r; do
      [ -n "$r" ] || continue
      # 规则内容由本脚本生成(网段来自 CF 接口且已校验),此处按词拆分是安全的
      $cmd -A "$CHAIN" $r || rc=1
    done <<< "$(rules_for "$cidrs")"

    $cmd -C INPUT -j "$CHAIN" 2>/dev/null || $cmd -I INPUT 1 -j "$CHAIN" || rc=1
  done

  [ "$rc" -eq 0 ] || die "部分规则写入失败,请检查上面的输出"
  log "规则已生效:$PORTS 仅接受 Cloudflare 网段 + 回环"
}

remove_rules() {
  local cmd
  for cmd in iptables ip6tables; do
    $cmd -D INPUT -j "$CHAIN" 2>/dev/null || true
    $cmd -F "$CHAIN" 2>/dev/null || true
    $cmd -X "$CHAIN" 2>/dev/null || true
  done
  log "已移除 $CHAIN —— 这些端口重新对全网开放:$PORTS"
}

show_status() {
  echo "== 端口 =="
  echo "  $PORTS"
  echo "== 缓存 =="
  if [ -s "$CACHE_FILE" ]; then
    echo "  $CACHE_FILE  ($(grep -c . "$CACHE_FILE") 条, $(date -r "$CACHE_FILE" '+%F %T'))"
  else
    echo "  (无缓存)"
  fi
  echo "== ipv4 =="
  iptables -L "$CHAIN" -n --line-numbers 2>/dev/null || echo "  (链不存在)"
  echo "== ipv6 =="
  ip6tables -L "$CHAIN" -n --line-numbers 2>/dev/null || echo "  (链不存在)"
  echo "== INPUT 挂载 =="
  iptables -C INPUT -j "$CHAIN" 2>/dev/null && echo "  ipv4: 已挂载" || echo "  ipv4: 未挂载"
  ip6tables -C INPUT -j "$CHAIN" 2>/dev/null && echo "  ipv6: 已挂载" || echo "  ipv6: 未挂载"
}

# ---------------------------------------------------------------------------
# 主流程
# ---------------------------------------------------------------------------
MODE="${1:-apply}"
DRY=0

case "$MODE" in
  --status) show_status; exit 0 ;;
  --rollback) remove_rules; exit 0 ;;
  --dry-run) DRY=1 ;;
  --force-refresh) ;;
  apply) ;;
  *) echo "用法: $0 [--dry-run|--status|--rollback|--force-refresh]" >&2; exit 2 ;;
esac

# 缓存过期(或强制刷新)才去拉接口;拉失败就沿用旧缓存,只要旧缓存还在。
if [ "$MODE" = "--force-refresh" ] || ! cache_is_fresh; then
  if ! fetch_ips && [ ! -s "$CACHE_FILE" ]; then
    die "既拉不到网段也没有可用缓存,不套用任何规则(现有规则保持不变)"
  fi
fi

apply_rules
