#!/usr/bin/env bash
# uninstall-theme.sh — remove the Danke theme ("danke") from an ISPConfig panel server.
#
#   sudo ./uninstall-theme.sh [--dry-run] [--reset-default] [--theme <id>]
#
# Principle: the theme never changes the ISPConfig installation — so removing it is removing ONE folder,
#   /usr/local/ispconfig/interface/web/themes/danke
# --theme <id>: remove the theme folder themes/<id> instead (an older release of this theme that was installed
#   under another folder name). Same steps and the same safety stop; "default" is refused.
# Steps (each one is printed):
#   1. If the global default theme is still "danke" ($conf['theme'] in interface/lib/config.inc.php or
#      server/lib/config.inc.php, or a config.inc.local.php next to them) the script STOPS: the login page uses
#      $conf['theme'] without a compatibility check and would load a theme that is no longer there. It prints the
#      exact command to set the value back to 'default'.
#      --reset-default makes exactly that one edit itself (backup first, the diff is printed). Nothing else in the
#      file is changed; owner and mode of the file stay as they are.
#   2. The theme folder is copied to /root/danke-theme-backup-<timestamp>/danke, then removed.
#   3. The database is NOT touched. Users whose Design is "danke" fall back to "default" at their next login
#      (ISPConfig's own behaviour); their setting stays stored, so re-installing the theme gives it back to them.
#      If possible the script prints how many users that are (one read-only SELECT COUNT(*) with ISPConfig's own
#      database credentials; skipped silently when the mysql client or the connection is not available).
#      Uninstall at a quiet time: a session that is open during the uninstall stays broken (default layout, missing
#      scripts, Logout button dead) until it ends. Anyone still logged in opens https://<panel>:8080/login/logout.php
#      once, then https://<panel>:8080/login/ .
#   4. Rollback / re-install instructions are printed.
#   --dry-run: shows every step, changes nothing.
#
# Test hooks (never needed on a server): ISPC_DIR=<scratch tree> DANKE_BACKUP_ROOT=<dir> DANKE_ALLOW_NONROOT=1
set -euo pipefail

ISPC_DIR="${ISPC_DIR:-/usr/local/ispconfig}"
BACKUP_ROOT="${DANKE_BACKUP_ROOT:-/root}"
THEMES_DIR="$ISPC_DIR/interface/web/themes"
THEME="danke"
DRY=0; RESET=0; want=""
for a in "$@"; do
  if [ -n "$want" ]; then THEME="$a"; want=""; continue; fi
  case "$a" in
    --dry-run) DRY=1 ;;
    --reset-default) RESET=1 ;;
    --theme) want=theme ;;
    --theme=*) THEME="${a#--theme=}" ;;
    -h|--help) sed -n '2,28p' "$0"; exit 0 ;;
    *) printf '[danke] ERROR: unknown argument %s\n' "$a" >&2; exit 2 ;;
  esac
done
say() { printf '[danke] %s\n' "$*"; }
run() { if [ "$DRY" = 1 ]; then printf '[danke] (dry-run) %s\n' "$*"; else "$@"; fi; }
die() { printf '[danke] ERROR: %s\n' "$*" >&2; exit 1; }
[ -z "$want" ] || die "--theme needs the folder name of the theme"
printf '%s' "$THEME" | grep -qE '^[a-z0-9][a-z0-9_-]{0,39}$' || die "--theme: '$THEME' is not a theme folder name"
[ "$THEME" != default ] || die "--theme default: ISPConfig's own theme is never removed"

if [ "$(id -u)" != 0 ]; then
  [ "${DANKE_ALLOW_NONROOT:-0}" = 1 ] && [ "$ISPC_DIR" != /usr/local/ispconfig ] || die "run as root (sudo)"
  say "TEST MODE: not root, working on the scratch tree $ISPC_DIR"
fi
[ -f "$ISPC_DIR/interface/lib/config.inc.php" ] || die "ISPConfig not found in $ISPC_DIR"
[ "$DRY" = 1 ] && say "DRY RUN — nothing is changed"

TS="$(date +%Y%m%d-%H%M%S)"
BK="$BACKUP_ROOT/danke-theme-backup-$TS"
ISPC_VER="$(grep -oP "define\('ISPC_APP_VERSION',\s*'\K[^']+" "$ISPC_DIR/interface/lib/config.inc.php" || true)"
say "ISPConfig ${ISPC_VER:-unknown} in $ISPC_DIR"
[ "$THEME" = danke ] || say "removing the theme folder '$THEME' (--theme)"
if [ -d "$THEMES_DIR/$THEME" ] && [ ! -f "$THEMES_DIR/$THEME/BUILT-AGAINST.txt" ]; then
  die "$THEMES_DIR/$THEME does not look like a release of this theme (no BUILT-AGAINST.txt) — not touched"
fi

# ------------------------------------------------------------------ 1. global default theme
# an active (not commented) line   $conf['theme'] = 'danke';
PAT="^[[:space:]]*\\\$conf\\[['\"]theme['\"]\\][[:space:]]*=[[:space:]]*['\"]${THEME}['\"]"
SED="s/^([[:space:]]*\\\$conf\\[['\"]theme['\"]\\][[:space:]]*=[[:space:]]*)['\"]${THEME}['\"]/\\1'default'/"
# the same edit in a form that can be pasted into a shell. The sed script is single-quoted; "." stands for ' or " when
# matching, and the value is written with single quotes like core does ($conf['theme'] = 'default';) — inside a
# single-quoted shell word a single quote is spelled '\'' (close, escaped quote, open again).
SED_PRINT='s/^(\s*\$conf\[.theme.\]\s*=\s*).'"${THEME}"'./\1'"'\\''default'\\''"'/'
CONFIGS=()
for f in interface/lib/config.inc.php interface/lib/config.inc.local.php server/lib/config.inc.php server/lib/config.inc.local.php; do
  if [ -f "$ISPC_DIR/$f" ] && grep -qE "$PAT" "$ISPC_DIR/$f"; then CONFIGS+=("$f"); fi
done
say "step 1/4: global default theme (\$conf['theme'])"
if [ ${#CONFIGS[@]} -gt 0 ]; then
  for f in "${CONFIGS[@]}"; do
    say "  $ISPC_DIR/$f sets the default theme to '$THEME':"
    grep -nE "$PAT" "$ISPC_DIR/$f" | sed 's/^/[danke]      line /'
  done
  if [ "$RESET" != 1 ]; then
    say ""
    say "STOPPED — nothing was removed."
    say "The login page loads the theme named in \$conf['theme'] without any check. Removing the folder now would"
    say "leave the login page without templates. Set the default back to 'default' first, either with"
    say "    $0 --reset-default$([ "$THEME" = danke ] || echo " --theme $THEME")"
    say "or by hand (backup first; the redirect keeps owner and mode of the file):"
    for f in "${CONFIGS[@]}"; do
      b="$BACKUP_ROOT/$(printf '%s' "$f" | tr '/' '_').before-$THEME-uninstall-$TS"
      say "    cp -a $ISPC_DIR/$f $b \\"
      say "      && sed -E '$SED_PRINT' $b > $ISPC_DIR/$f"
    done
    say "then run this script again."
    exit 3
  fi
  say "  --reset-default: setting \$conf['theme'] back to 'default' in ${#CONFIGS[@]} file(s)"
  run mkdir -p "$BK"
  for f in "${CONFIGS[@]}"; do
    b="$BK/$(printf '%s' "$f" | tr '/' '_')"
    run cp -a "$ISPC_DIR/$f" "$b"
    say "  backup of $f: $b"
    if [ "$DRY" = 1 ]; then
      say "  (dry-run) the edit would be:"
      sed -E "$SED" "$ISPC_DIR/$f" | diff "$ISPC_DIR/$f" - | sed 's/^/[danke]      /' || true
    else
      # write through the existing file (no rename): inode, owner and mode stay exactly as ISPConfig set them
      sed -E "$SED" "$b" > "$ISPC_DIR/$f"
      say "  changed (diff backup → file):"
      diff "$b" "$ISPC_DIR/$f" | sed 's/^/[danke]      /' || true
      if grep -qE "$PAT" "$ISPC_DIR/$f"; then cat "$b" > "$ISPC_DIR/$f"; die "the edit of $f did not work — file restored from $b, nothing removed"; fi
    fi
  done
else
  say "  not '$THEME' in interface/lib/config.inc.php or server/lib/config.inc.php — the login page does not depend on the theme. OK."
  [ "$RESET" = 1 ] && say "  (--reset-default: nothing to reset)"
fi

# ------------------------------------------------------------------ 3 (read-only, before the folder goes): who uses it
count_users() {
  command -v mysql >/dev/null 2>&1 || return 1
  local cf="$ISPC_DIR/interface/lib/config.inc.php" h u p d port tmp n
  val() { grep -oP "^\s*\\\$conf\[['\"]$1['\"]\]\s*=\s*['\"]\K[^'\"]*" "$cf" | head -n 1; }
  h="$(val db_host)"; u="$(val db_user)"; p="$(val db_password)"; d="$(val db_database)"; port="$(val db_port)"
  [ -n "$u" ] && [ -n "$d" ] || return 1
  tmp="$(mktemp)"; chmod 600 "$tmp"
  printf '[client]\nhost=%s\nuser=%s\npassword="%s"\n%s' "${h:-localhost}" "$u" "$p" "$([ -n "$port" ] && printf 'port=%s\n' "$port")" > "$tmp"
  n="$(mysql --defaults-extra-file="$tmp" --batch --skip-column-names --connect-timeout=5 "$d" \
        -e "SELECT COUNT(*) FROM sys_user WHERE app_theme = '$THEME'" 2>/dev/null)" || { rm -f "$tmp"; return 1; }
  rm -f "$tmp"
  printf '%s' "$n" | grep -qE '^[0-9]+$' || return 1
  printf '%s' "$n"
}
USERS=""; USERS="$(count_users)" || USERS=""

# ------------------------------------------------------------------ 2. backup + remove the folder
say "step 2/4: theme folder"
if [ -d "$THEMES_DIR/$THEME" ]; then
  say "  backup: $THEMES_DIR/$THEME → $BK/$THEME"
  run mkdir -p "$BK"
  run cp -a "$THEMES_DIR/$THEME" "$BK/$THEME"
  if [ "$DRY" != 1 ]; then
    [ "$(find "$THEMES_DIR/$THEME" -type f | wc -l)" = "$(find "$BK/$THEME" -type f | wc -l)" ] || die "backup is incomplete — the theme folder was NOT removed"
    printf '%s theme backup\nmade by: uninstall-theme.sh\ndate: %s\nISPConfig: %s\ncontains: %s/ (the theme folder that was removed)\nrestore: %s\n' "$THEME" "$TS" "${ISPC_VER:-unknown}" "$THEME" \
      "$([ "$THEME" = danke ] && echo "install-theme.sh --rollback $BK" || echo "cp -a $BK/$THEME $THEMES_DIR/ (then owner and mode like themes/default)")" > "$BK/BACKUP-INFO.txt"
  fi
  say "  removing $THEMES_DIR/$THEME"
  run rm -rf "$THEMES_DIR/$THEME"
  run rm -rf "$THEMES_DIR/$THEME.new"
  REMOVED=1
else
  say "  $THEMES_DIR/$THEME does not exist — nothing to remove."
  REMOVED=0
fi

# ------------------------------------------------------------------ 3. users
say "step 3/4: users (the database is not touched)"
if [ -n "$USERS" ]; then
  say "  $USERS user(s) have Design = '$THEME' (read-only count from sys_user)."
else
  say "  (could not count the users with Design = '$THEME' — no mysql client or no connection; not needed for the uninstall)"
fi
say "  They get the 'default' theme at their next login: ISPConfig checks at login that the theme folder exists and"
say "  falls back to 'default' when it does not. Their stored setting is left alone — re-installing the theme"
say "  gives them '$THEME' back without anybody changing a setting."
say "  Users who are logged in right now keep a session that names the removed theme: until that session ends the"
say "  panel shows the default layout with broken scripts (every /themes/$THEME/… file is missing) and the Logout"
say "  button does not work. So: uninstall at a quiet time. Anyone still logged in opens once"
say "      https://<panel>:8080/login/logout.php     (ends the session; the page only shows a short line of text)"
say "  and then"
say "      https://<panel>:8080/login/               (log in again — now with the 'default' theme)"

# ------------------------------------------------------------------ 4. what next
say "step 4/4: done$([ "$DRY" = 1 ] && echo ' (dry run: nothing was changed)')."
if [ "$REMOVED" = 1 ]; then
  say "  backup of the removed theme: $BK/$THEME"
  if [ "$THEME" = danke ]; then
    say "  put exactly this folder back:   $(dirname "$0")/install-theme.sh --rollback $BK"
    say "  or install a release again:     $(dirname "$0")/install-theme.sh <danke-theme-….tar.gz>"
    say "  (the backup includes local/ — this server's brand choice; --rollback brings it back with the folder)"
  else
    say "  put exactly this folder back (by hand — install-theme.sh only handles themes/danke):"
    say "      cp -a $BK/$THEME $THEMES_DIR/ && chown -R --reference=$THEMES_DIR/default $THEMES_DIR/$THEME && chmod -R 750 $THEMES_DIR/$THEME"
  fi
fi
if [ ${#CONFIGS[@]} -gt 0 ] && [ "$RESET" = 1 ]; then
  say "  \$conf['theme'] was set to 'default'. To make the theme the default again after a re-install: INSTALL.md §6 (manual step)."
  for f in "${CONFIGS[@]}"; do say "  config backup: $BK/$(printf '%s' "$f" | tr '/' '_')"; done
fi
for d in "$THEMES_DIR"/*/; do
  d="$(basename "$d")"
  if [ "$d" != "$THEME" ] && [ "$d" != default ] && [ -f "$THEMES_DIR/$d/BUILT-AGAINST.txt" ]; then
    say "  NOTE: another folder of this theme exists and was not touched: $THEMES_DIR/$d   (remove it with --theme $d)"
  fi
done
say "  not changed: database, language files, templates, other themes$([ "$RESET" = 1 ] && [ ${#CONFIGS[@]} -gt 0 ] || echo ', config.inc.php')."
exit 0
