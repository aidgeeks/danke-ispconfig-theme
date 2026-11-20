#!/usr/bin/env bash
# set-user-theme.sh — show and change the theme ("Design") of EXISTING ISPConfig users, and the global default theme.
#
# An optional admin tool. It is NOT part of the theme install: install-theme.sh / uninstall-theme.sh never touch
# the database. This script changes only what it is asked to: the two theme columns of sys_user / client (--set,
# --sync-from-client) and the one line $conf['theme'] = '…'; of ISPConfig's two config.inc.php files (--set-default).
#
#   sudo ./set-user-theme.sh --list
#   sudo ./set-user-theme.sh --sync-from-client                 [--apply [--yes]]
#   sudo ./set-user-theme.sh --set <theme> --all                [--apply [--yes]]
#   sudo ./set-user-theme.sh --set <theme> --clients-only       [--apply [--yes]]
#   sudo ./set-user-theme.sh --set <theme> --users alice,bob    [--apply [--yes]]
#   sudo ./set-user-theme.sh --set-default <theme>              [--apply [--yes]]     alone, or added to --set … /
#                                                                                     --sync-from-client
#
# Why it exists: ISPConfig keeps the theme of a user in two places.
#   sys_user.app_theme   what the login uses (Tools → User Settings → Design writes it)
#   client.usertheme     the "Design" field of Client → Edit Client. ISPConfig copies it to sys_user.app_theme only
#                        when the client is CREATED; a later change in that form does not reach the login.
#
# Modes
#   --list               read-only table: userid, username, typ, sys_user.app_theme, client.usertheme, a MISMATCH
#                        flag (the two differ) and whether the folder of the login theme exists (ok / MISSING /
#                        INCOMPATIBLE = folder exists, but its ispconfig_version is for another ISPConfig major.minor /
#                        INVALID = the stored value is empty or not a theme name).
#   --sync-from-client   sys_user.app_theme := client.usertheme for every client user where the two differ and the
#                        client's theme exists and is compatible. Other rows are listed as skipped.
#   --set <theme>        set the theme of the chosen users; one of
#       --all              every user (admins included)
#       --clients-only     every user that belongs to a client (clients and resellers)
#       --users a,b,c      these user names (as shown by --list); an unknown name stops the run, nothing is changed
#                        For client users client.usertheme is set as well, so both places stay in step.
#   --set-default <theme>  the GLOBAL default theme: what the login page uses and what a user without a theme of their
#                        own gets. Changes only the value in the line  $conf['theme'] = '…';  of
#                            interface/lib/config.inc.php   and   server/lib/config.inc.php
#                        — nothing else in those files, no other file, no database access. Refused (exit 3) when the
#                        theme is not "default" and its folder is missing or not compatible: the login page would
#                        break for everybody. Each file is first copied to /root/danke-config-backup-<timestamp>/
#                        (owner and mode kept); the new content is written INTO the existing file, so its owner and
#                        mode stay as ISPConfig set them; the diff and the restore commands are printed. Files that
#                        already hold the value are not touched ("already set"). ISPConfig's updater keeps the value.
#                        "--set-default default" is the way back, e.g. before an uninstall.
#                        Combined with --set … / --sync-from-client: the database step runs FIRST; the config files
#                        are changed only after it succeeded (or had nothing to do). If the database step fails, the
#                        config files are not touched. Each step has its own backup and its own restore command.
# Rules
#   - A theme name must match ^[a-zA-Z0-9_-]{1,32}$ and be "default" or an existing, compatible folder below
#     interface/web/themes/. Compatible = ISPConfig's own rule (theme_is_compatible): the theme's ispconfig_version
#     names the same major.minor; on ISPConfig 3.3.1 and older (no such function) the exact version.
#   - DRY RUN IS THE DEFAULT: the script prints the affected rows and the exact SQL, and changes nothing.
#     --apply makes the change after you type "yes" (--yes answers for you, for scripts).
#   - Before a database change: mysqldump (--single-transaction --no-tablespaces: needs no LOCK TABLES and no
#     PROCESS privilege) of sys_user and client to /root/danke-user-theme-backup-<timestamp>.sql (mode 600);
#     the restore command is printed. No backup → no change.
#   - The SQL holds only the checked theme name and numeric ids — never text from the command line or the database.
#   - Database access: ISPConfig's own credentials from interface/lib/config.inc.php (db_host, db_port, db_database,
#     db_user, db_password), handed to the mysql client in a temporary --defaults-extra-file (mode 600, removed on
#     exit). The password is never printed and never on a command line.
#   - A changed theme is used at the user's NEXT login; a session that is open keeps its theme until it ends.
#
# Exit codes
#   0  done (also: dry run, nothing to do)
#   1  error: ISPConfig or its database credentials not found, no mysql client, query or backup failed; --set-default:
#      a config file without exactly one active $conf['theme'] line, not writable, or the edit could not be verified
#      (the files are then put back from the backup)
#   2  wrong usage, or a theme name that is not a valid name
#   3  the target theme does not exist below interface/web/themes/ or is not compatible with this ISPConfig
#   4  --apply was not confirmed with "yes" — nothing changed
#   5  --users names a user that does not exist — nothing changed
#
# Test hooks (never needed on a server): ISPC_DIR=<scratch tree> DANKE_BACKUP_ROOT=<dir> DANKE_ALLOW_NONROOT=1
#   DANKE_MYSQL=<mysql command> DANKE_MYSQLDUMP=<mysqldump command>
set -euo pipefail
umask 077

ISPC_DIR="${ISPC_DIR:-/usr/local/ispconfig}"
BACKUP_ROOT="${DANKE_BACKUP_ROOT:-/root}"
THEMES_DIR="$ISPC_DIR/interface/web/themes"
CONF="$ISPC_DIR/interface/lib/config.inc.php"
CFG_FILES=(interface/lib/config.inc.php server/lib/config.inc.php)
NAME_RE='^[a-zA-Z0-9_-]{1,32}$'

say()   { printf '[danke] %s\n' "$*"; }
err()   { printf '[danke] ERROR: %s\n' "$*" >&2; }
die()   { err "$*"; exit 1; }
usage() { err "$*"; printf '[danke] see: %s --help\n' "$0" >&2; exit 2; }

MODE=""; TARGET=""; SCOPE=""; USERS_ARG=""; APPLY=0; DRYFLAG=0; YES=0; want=""; DEF=0; DEF_TARGET=""
setmode() { [ -z "$MODE" ] || [ "$MODE" = "$1" ] || usage "choose ONE of --list, --sync-from-client, --set <theme>"; MODE="$1"; }
setscope() { [ -z "$SCOPE" ] || [ "$SCOPE" = "$1" ] || usage "choose ONE of --all, --clients-only, --users <names>"; SCOPE="$1"; }
for a in "$@"; do
  if [ -n "$want" ]; then
    case "$want" in theme) TARGET="$a" ;; users) USERS_ARG="$a" ;; default) DEF_TARGET="$a" ;; esac
    want=""; continue
  fi
  case "$a" in
    --list) setmode list ;;
    --sync-from-client) setmode sync ;;
    --set) setmode set; want=theme ;;
    --set=*) setmode set; TARGET="${a#--set=}" ;;
    --set-default) [ "$DEF" = 0 ] || usage "--set-default given twice"; DEF=1; want=default ;;
    --set-default=*) [ "$DEF" = 0 ] || usage "--set-default given twice"; DEF=1; DEF_TARGET="${a#--set-default=}" ;;
    --all) setscope all ;;
    --clients-only) setscope clients ;;
    --users) setscope users; want=users ;;
    --users=*) setscope users; USERS_ARG="${a#--users=}" ;;
    --apply) APPLY=1 ;;
    --dry-run) DRYFLAG=1 ;;
    --yes) YES=1 ;;
    -h|--help) sed -n '2,/^set -euo pipefail$/p' "$0" | sed '$d'; exit 0 ;;
    *) usage "unknown argument $a" ;;
  esac
done
[ -z "$want" ] || usage "--$(case "$want" in theme) echo set ;; default) echo set-default ;; *) echo users ;; esac) needs a value"
[ -n "$MODE" ] || [ "$DEF" = 1 ] || usage "nothing to do: give --list, --sync-from-client, --set <theme> or --set-default <theme>"
if [ "$DEF" = 1 ]; then
  [ "$MODE" != list ] || usage "--list only reads; --set-default goes alone or with --set <theme> / --sync-from-client"
  printf '%s' "$DEF_TARGET" | grep -qE "$NAME_RE" || usage "'$DEF_TARGET' is not a theme name (allowed: letters, digits, _ and -, at most 32 characters)"
fi
[ "$APPLY" = 1 ] && [ "$DRYFLAG" = 1 ] && usage "--apply and --dry-run exclude each other"
if [ "$MODE" = set ]; then
  [ -n "$SCOPE" ] || usage "--set needs one of --all, --clients-only, --users <names>"
  [ "$SCOPE" != users ] || [ -n "$USERS_ARG" ] || usage "--users needs a comma-separated list of user names"
  printf '%s' "$TARGET" | grep -qE "$NAME_RE" || usage "'$TARGET' is not a theme name (allowed: letters, digits, _ and -, at most 32 characters)"
else
  [ -z "$SCOPE" ] || usage "--all / --clients-only / --users belong to --set <theme>"
fi
if [ "$MODE" = list ] && { [ "$APPLY" = 1 ] || [ "$YES" = 1 ]; }; then usage "--list only reads; --apply / --yes belong to --sync-from-client, --set and --set-default"; fi
[ "$YES" = 0 ] || [ "$APPLY" = 1 ] || usage "--yes only makes sense with --apply"

if [ "$(id -u)" != 0 ]; then
  if [ "${DANKE_ALLOW_NONROOT:-0}" != 1 ] || [ "$ISPC_DIR" = /usr/local/ispconfig ]; then die "run as root (sudo)"; fi
  say "TEST MODE: not root, working on the scratch tree $ISPC_DIR"
fi
[ -f "$CONF" ] || die "ISPConfig not found in $ISPC_DIR (no interface/lib/config.inc.php)"
ISPC_VER="$(grep -oP "define\('ISPC_APP_VERSION',\s*'\K[^']+" "$CONF" || true)"
ISPC_MM="$(printf '%s' "$ISPC_VER" | grep -oE '^[0-9]+\.[0-9]+' || true)"
# ISPConfig 3.3.1 and older have no theme_is_compatible(): they accept a theme only when its version file equals
# ISPC_APP_VERSION exactly (install-theme.sh writes that value into the installed copy on such a panel)
EXACT=0; FUNCS="$ISPC_DIR/interface/lib/classes/functions.inc.php"
if [ -f "$FUNCS" ] && ! grep -q "function theme_is_compatible" "$FUNCS"; then EXACT=1; fi

# ------------------------------------------------------------------ themes on this server
# the same answer ISPConfig's theme_is_compatible() gives:  ok | MISSING | INCOMPATIBLE | INVALID
theme_state() {
  local t="$1" v="" full=""
  [ "$t" = default ] && { echo ok; return; }
  printf '%s' "$t" | grep -qE "$NAME_RE" || { echo INVALID; return; }
  [ -d "$THEMES_DIR/$t" ] || { echo MISSING; return; }
  if [ -f "$THEMES_DIR/$t/ispconfig_version" ]; then v="$(tr -d '[:space:]' < "$THEMES_DIR/$t/ispconfig_version")"
  elif [ -f "$THEMES_DIR/$t/ISPC_VERSION" ]; then v="$(tr -d '[:space:]' < "$THEMES_DIR/$t/ISPC_VERSION")"; fi
  full="$v"
  if [ "$EXACT" = 1 ]; then { [ -n "$full" ] && [ "$full" = "$ISPC_VER" ] && echo ok; } || echo INCOMPATIBLE; return; fi
  v="$(printf '%s' "$v" | grep -oE '^[0-9]+\.[0-9]+' || true)"
  if [ -n "$v" ] && [ -n "$ISPC_MM" ] && [ "$v" = "$ISPC_MM" ]; then echo ok; else echo INCOMPATIBLE; fi
}
# $1 = theme, $2 = what would happen if it were used anyway
need_theme() {
  case "$(theme_state "$1")" in
    ok) ;;
    MISSING) err "the theme '$1' does not exist: no folder $THEMES_DIR/$1"
             err "installed themes: $(cd "$THEMES_DIR" 2>/dev/null && ls -d */ 2>/dev/null | tr -d '/' | tr '\n' ' ')"
             [ -z "${2:-}" ] || err "$2"; exit 3 ;;
    *) if [ "$EXACT" = 1 ]; then err "the theme '$1' is not compatible with ISPConfig ${ISPC_VER:-unknown}: this ISPConfig accepts a theme only when its ispconfig_version file says exactly '${ISPC_VER:-?}' — ${2:-ISPConfig would fall back to 'default' at login}"
       else err "the theme '$1' is not compatible with ISPConfig ${ISPC_VER:-unknown}: its ispconfig_version file is missing or names another major.minor — ${2:-ISPConfig would fall back to 'default' at login}"; fi
       exit 3 ;;
  esac
}
[ "$MODE" != set ] || need_theme "$TARGET"
[ "$DEF" != 1 ] || need_theme "$DEF_TARGET" "as the global default it would leave the login page without a working theme for everybody — nothing changed"

# ------------------------------------------------------------------ --set-default: plan (reads the two files only)
# an active (not commented) line   $conf['theme'] = '<value>';   — \1 = up to the value, \2 = the value, \3 = the ";"
q="'"; Q="[$q\"]"
CF_RE="^([[:space:]]*\\\$conf\\[${Q}theme${Q}\\][[:space:]]*=[[:space:]]*)${Q}([^$q\"\\\$]*)${Q}([[:space:]]*;)"
CFG_CHANGE=(); CFG_SAME=(); CFG_ABSENT=()
cf_value() { sed -nE "s/${CF_RE}.*\$/\\2/p" "$1" | head -n 1; }
cf_line()  { grep -nE "$CF_RE" "$1" | head -n 1 | sed -E 's/^([0-9]+):[[:space:]]*/line \1:  /'; }
if [ "$DEF" = 1 ]; then
  CF_SED="s/${CF_RE}/\\1'${DEF_TARGET}'\\3/"
  for f in "${CFG_FILES[@]}"; do
    p="$ISPC_DIR/$f"
    if [ ! -e "$p" ] && [ ! -L "$p" ]; then CFG_ABSENT+=("$f"); continue; fi
    [ ! -L "$p" ] && [ -f "$p" ] || die "$p is a symbolic link or not a regular file — not edited, nothing changed"
    n="$(grep -cE "$CF_RE" "$p" || true)"
    [ "$n" = 1 ] || die "$p has $n active \$conf['theme'] = '…'; lines (expected exactly 1) — not edited, nothing changed. Set the value by hand."
    if [ "$(cf_value "$p")" = "$DEF_TARGET" ]; then CFG_SAME+=("$f"); continue; fi
    # the edit must change that one line and nothing else — checked here on a copy in memory, again after writing
    d="$(sed -E "$CF_SED" "$p" | diff "$p" - || true)"
    [ "$(printf '%s\n' "$d" | grep -c '^<')" = 1 ] && [ "$(printf '%s\n' "$d" | grep -c '^>')" = 1 ] \
      && [ "$(sed -E "$CF_SED" "$p" | sed -nE "s/${CF_RE}.*\$/\\2/p")" = "$DEF_TARGET" ] \
      || die "internal check failed: the edit of $p would not be exactly one line — nothing changed"
    CFG_CHANGE+=("$f")
  done
  if [ "$APPLY" = 1 ] && [ ${#CFG_CHANGE[@]} -gt 0 ]; then
    [ -d "$BACKUP_ROOT" ] && [ -w "$BACKUP_ROOT" ] || die "backup folder $BACKUP_ROOT does not exist or is not writable — nothing changed"
    for f in "${CFG_CHANGE[@]}"; do [ -w "$ISPC_DIR/$f" ] || die "$ISPC_DIR/$f is not writable — nothing changed"; done
  fi
fi
print_cfg_plan() {
  local f p
  say "mode: --set-default $DEF_TARGET — the global default theme (login page, users without a theme of their own): one line in each config file"
  for f in ${CFG_SAME[@]+"${CFG_SAME[@]}"}; do
    say "  $ISPC_DIR/$f"
    say "      now:  $(cf_line "$ISPC_DIR/$f")      — already '$DEF_TARGET', not touched"
  done
  for f in ${CFG_CHANGE[@]+"${CFG_CHANGE[@]}"}; do
    p="$ISPC_DIR/$f"
    say "  $p"
    say "      now:  $(cf_line "$p")"
    say "      new:  $(sed -E "$CF_SED" "$p" | grep -nE "$CF_RE" | head -n 1 | sed -E 's/^([0-9]+):[[:space:]]*/line \1:  /')"
  done
  for f in ${CFG_ABSENT[@]+"${CFG_ABSENT[@]}"}; do say "  $ISPC_DIR/$f — no such file on this machine, skipped"; done
  for f in interface/lib/config.inc.local.php server/lib/config.inc.local.php; do
    if [ -f "$ISPC_DIR/$f" ] && grep -qE "$CF_RE" "$ISPC_DIR/$f"; then
      say "  NOTE: $ISPC_DIR/$f also sets \$conf['theme'] ($(cf_line "$ISPC_DIR/$f")) and wins over config.inc.php. This script does not edit it."
    fi
  done
  if [ ${#CFG_CHANGE[@]} -eq 0 ]; then say "  already set: the global default theme is '$DEF_TARGET' in every file — nothing to change there."; fi
}

CNF=""; TMPD=""
cleanup() { [ -z "$CNF" ] || rm -f "$CNF"; [ -z "$TMPD" ] || rm -rf "$TMPD"; }
trap cleanup EXIT
trap 'exit 1' HUP INT TERM
TMPD="$(mktemp -d)"; chmod 700 "$TMPD"
STMTS=(); AFFECTED=""; DB_NAME=""; MYSQLDUMP=""

if [ -n "$MODE" ]; then
# ------------------------------------------------------------------ database access (ISPConfig's own credentials)
# value of $conf['<key>'] = '<value>'; as PHP reads it ('…' with \' and \\ escapes, or "…")
conf_val() {
  local line v
  line="$(grep -E "^[[:space:]]*\\\$conf\[['\"]$1['\"]\][[:space:]]*=" "$CONF" | head -n 1)" || true
  v="$(printf '%s' "$line" | sed -nE "s/^[^=]*=[[:space:]]*'((\\\\.|[^'\\\\])*)'[[:space:]]*;.*$/\1/p")"
  if [ -n "$v" ] || printf '%s' "$line" | grep -qE "=[[:space:]]*''[[:space:]]*;"; then
    printf '%s' "$v" | sed -e "s/\\\\'/'/g" -e 's/\\\\/\\/g'
    return
  fi
  printf '%s' "$line" | sed -nE 's/^[^=]*=[[:space:]]*"([^"$\\]*)"[[:space:]]*;.*$/\1/p; s/^[^=]*=[[:space:]]*([0-9]+)[[:space:]]*;.*$/\1/p' | head -n 1
}
DB_HOST="$(conf_val db_host)"; DB_PORT="$(conf_val db_port)"; DB_NAME="$(conf_val db_database)"; DB_USER="$(conf_val db_user)"; DB_PASS="$(conf_val db_password)"
[ -n "$DB_NAME" ] && [ -n "$DB_USER" ] || die "could not read db_database / db_user from $CONF"
printf '%s' "$DB_NAME" | grep -qE '^[A-Za-z0-9_$-]{1,64}$' || die "the database name in $CONF is not a plain name — not used"

pick() { local c; for c in "$@"; do if command -v "$c" >/dev/null 2>&1; then printf '%s' "$c"; return 0; fi; done; return 1; }
MYSQL="${DANKE_MYSQL:-$(pick mysql mariadb || true)}"
MYSQLDUMP="${DANKE_MYSQLDUMP:-$(pick mysqldump mariadb-dump || true)}"
[ -n "$MYSQL" ] || die "no mysql / mariadb client found on this machine"

CNF="$(mktemp)"; chmod 600 "$CNF"
cnf_quote() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'; }
{
  printf '[client]\n'
  printf 'host="%s"\n' "$(cnf_quote "${DB_HOST:-localhost}")"
  if printf '%s' "$DB_PORT" | grep -qE '^[0-9]+$'; then printf 'port=%s\n' "$DB_PORT"; fi
  printf 'user="%s"\n' "$(cnf_quote "$DB_USER")"
  printf 'password="%s"\n' "$(cnf_quote "$DB_PASS")"
} > "$CNF"
# --defaults-extra-file must be the first option
sql() { "$MYSQL" --defaults-extra-file="$CNF" --batch --skip-column-names --connect-timeout=10 "$DB_NAME" -e "$1"; }

say "ISPConfig ${ISPC_VER:-unknown} in $ISPC_DIR — database '$DB_NAME' as ISPConfig's own database user"

# ------------------------------------------------------------------ read the users (always read-only)
ROWS="$TMPD/rows"
# (every text column starts with "=" so that an empty value still is a field of the tab-separated answer)
Q_LIST="SELECT u.userid, CONCAT('=', HEX(u.username)), CONCAT('=', IFNULL(u.typ,'')), CONCAT('=', IFNULL(u.app_theme,'')), CONCAT('=', IFNULL(c.usertheme,'')), IFNULL(c.client_id,0) FROM sys_user u LEFT JOIN client c ON c.client_id = u.client_id AND u.client_id > 0 ORDER BY u.userid"
load_rows() {
  if ! sql "$Q_LIST" > "$ROWS" 2> "$TMPD/err"; then
    err "the database query failed:"; sed 's/^/[danke]    /' "$TMPD/err" >&2; exit 1
  fi
}
unhex() { printf '%s' "$1" | sed 's/\(..\)/\\x\1/g' | { IFS= read -r h || true; printf '%b' "$h"; }; }
# printable form of a value from the database (control characters never reach the terminal)
show() { local v; v="$(printf '%s' "$1" | LC_ALL=C tr -c '[:print:]' '?' | cut -c1-"${2:-20}")"; printf '%s' "${v:-(empty)}"; }

N_USERS=0; N_MISMATCH=0; N_BADFOLDER=0
declare -a R_ID R_NAME R_TYP R_APP R_CLI R_CID R_FLAG R_FOLD
parse_rows() {
  local id hx typ app cli cid
  N_USERS=0; N_MISMATCH=0; N_BADFOLDER=0
  R_ID=(); R_NAME=(); R_TYP=(); R_APP=(); R_CLI=(); R_CID=(); R_FLAG=(); R_FOLD=()
  while IFS=$'\t' read -r id hx typ app cli cid; do
    printf '%s' "$id" | grep -qE '^[0-9]+$' || continue
    printf '%s' "$cid" | grep -qE '^[0-9]+$' || cid=0
    hx="${hx#=}"; typ="${typ#=}"; app="${app#=}"; cli="${cli#=}"
    R_ID+=("$id"); R_NAME+=("$(unhex "$hx")"); R_TYP+=("$typ"); R_APP+=("$app"); R_CLI+=("$cli"); R_CID+=("$cid")
    if [ "$cid" != 0 ] && [ "$app" != "$cli" ]; then R_FLAG+=(MISMATCH); N_MISMATCH=$((N_MISMATCH+1)); else R_FLAG+=(""); fi
    R_FOLD+=("$(theme_state "$app")")
    [ "${R_FOLD[$N_USERS]}" = ok ] || N_BADFOLDER=$((N_BADFOLDER+1))
    N_USERS=$((N_USERS+1))
  done < "$ROWS"
}
# $1 = "all" or a space-separated list of row indexes; $2 = "client": the last column is about the client's Design
print_table() {
  local i idx fold
  printf '[danke]   %-7s %-24s %-6s %-20s %-20s %-9s %s\n' USERID USERNAME TYP "LOGIN THEME" "CLIENT DESIGN" FLAG "THEME FOLDER"
  printf '[danke]   %-7s %-24s %-6s %-20s %-20s %-9s %s\n' "" "" "" "(sys_user.app_theme)" "(client.usertheme)" "" "$([ "${2:-}" = client ] && echo "(of the client design)" || echo "(of the login theme)")"
  if [ "$1" = all ]; then idx="$(seq 0 $((N_USERS-1)))"; else idx="$1"; fi
  for i in $idx; do
    fold="${R_FOLD[$i]}"; [ "${2:-}" != client ] || fold="$(theme_state "${R_CLI[$i]}")"
    printf '[danke]   %-7s %-24s %-6s %-20s %-20s %-9s %s\n' "${R_ID[$i]}" "$(show "${R_NAME[$i]}" 24)" "$(show "${R_TYP[$i]}" 6)" \
      "$(show "${R_APP[$i]}")" "$([ "${R_CID[$i]}" = 0 ] && echo - || show "${R_CLI[$i]}")" "${R_FLAG[$i]:--}" "$fold"
  done
}
load_rows; parse_rows

if [ "$MODE" = list ]; then
  say "users and their theme (read-only):"
  print_table all
  say "$N_USERS user(s); $N_MISMATCH with MISMATCH (Client → Edit says one theme, the login uses another); $N_BADFOLDER whose login theme has no usable folder (they get 'default' at login)."
  say "installed themes: default $(for d in "$THEMES_DIR"/*/; do d="$(basename "$d")"; [ "$d" = default ] || [ "$d" = '*' ] || printf '%s(%s) ' "$d" "$(theme_state "$d")"; done)"
  [ "$N_MISMATCH" = 0 ] || say "to copy the client's Design to the login theme:  $0 --sync-from-client      (dry run; add --apply to change)"
  exit 0
fi

# ------------------------------------------------------------------ plan the change
# PLAN_U[theme] = userids that get this login theme;  PLAN_C[theme] = client ids whose Design gets this theme
declare -A PLAN_U PLAN_C
AFFECTED=""; SKIPPED=""; N_SKIP=0
add_u() { PLAN_U[$1]="${PLAN_U[$1]:+${PLAN_U[$1]},}$2"; }
add_c() { PLAN_C[$1]="${PLAN_C[$1]:+${PLAN_C[$1]},}$2"; }
if [ "$MODE" = sync ]; then
  for i in $(seq 0 $((N_USERS-1))); do
    [ "${R_FLAG[$i]}" = MISMATCH ] || continue
    st="$(theme_state "${R_CLI[$i]}")"
    if [ "$st" = ok ]; then add_u "${R_CLI[$i]}" "${R_ID[$i]}"; AFFECTED="$AFFECTED $i"
    else SKIPPED="$SKIPPED $i"; N_SKIP=$((N_SKIP+1)); fi
  done
else
  WANT_IDX=""
  if [ "$SCOPE" = users ]; then
    MISSING_NAMES=""
    IFS=',' read -r -a NAMES <<< "$USERS_ARG"
    for n in "${NAMES[@]}"; do
      n="$(printf '%s' "$n" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"; [ -n "$n" ] || continue
      found=""
      for i in $(seq 0 $((N_USERS-1))); do [ "${R_NAME[$i]}" = "$n" ] && { found=1; case " $WANT_IDX " in *" $i "*) ;; *) WANT_IDX="$WANT_IDX $i" ;; esac; }; done
      [ -n "$found" ] || MISSING_NAMES="$MISSING_NAMES $(show "$n")"
    done
    if [ -n "$MISSING_NAMES" ]; then err "no such user:$MISSING_NAMES   (names as shown by --list) — nothing changed"; exit 5; fi
    [ -n "$WANT_IDX" ] || usage "--users needs at least one user name"
  else
    for i in $(seq 0 $((N_USERS-1))); do
      if [ "$SCOPE" = all ] || [ "${R_CID[$i]}" != 0 ]; then WANT_IDX="$WANT_IDX $i"; fi
    done
  fi
  for i in $WANT_IDX; do
    hit=""
    [ "${R_APP[$i]}" = "$TARGET" ] || { add_u "$TARGET" "${R_ID[$i]}"; hit=1; }
    if [ "${R_CID[$i]}" != 0 ] && [ "${R_CLI[$i]}" != "$TARGET" ]; then add_c "$TARGET" "${R_CID[$i]}"; hit=1; fi
    [ -z "$hit" ] || AFFECTED="$AFFECTED $i"
  done
fi

for t in "${!PLAN_U[@]}"; do STMTS+=("UPDATE sys_user SET app_theme = '$t' WHERE userid IN (${PLAN_U[$t]});"); done
for t in "${!PLAN_C[@]}"; do STMTS+=("UPDATE client SET usertheme = '$t' WHERE client_id IN (${PLAN_C[$t]});"); done
# belt and braces: nothing but a checked theme name and numbers may be in a statement
for s in ${STMTS[@]+"${STMTS[@]}"}; do
  printf '%s' "$s" | grep -qE "^UPDATE (sys_user SET app_theme|client SET usertheme) = '[a-zA-Z0-9_-]{1,32}' WHERE (userid|client_id) IN \([0-9]+(,[0-9]+)*\);$" \
    || die "internal check failed: unexpected statement — nothing changed"
done

case "$MODE" in
  sync) say "mode: --sync-from-client — the login theme (sys_user.app_theme) takes the value of Client → Edit → Design (client.usertheme)" ;;
  set)  say "mode: --set $TARGET — $(case "$SCOPE" in all) echo 'every user' ;; clients) echo 'every client user (clients and resellers)' ;; users) echo "the named users" ;; esac); client.usertheme follows for client users" ;;
esac
if [ -n "$SKIPPED" ]; then
  say "skipped — the client's Design names a theme that is not installed or not compatible (set it in Client → Edit, or use --set):"
  print_table "$SKIPPED" client
fi
 if [ ${#STMTS[@]} -eq 0 ]; then
  say "nothing to change — every chosen user already has the wanted theme."
else
  say "affected users — as they are NOW:"
  print_table "$AFFECTED"
  say "SQL:"
  for s in "${STMTS[@]}"; do say "    $s"; done
fi
fi   # database modes

[ "$DEF" != 1 ] || print_cfg_plan
N_DB=${#STMTS[@]}; N_CFG=${#CFG_CHANGE[@]}
[ "$N_DB" != 0 ] || [ "$N_CFG" != 0 ] || exit 0
if [ "$APPLY" != 1 ]; then
  say "DRY RUN — nothing was changed. Run the same command with --apply to make the change."
  exit 0
fi

# ------------------------------------------------------------------ apply: confirm, then database step, then config step
WHAT=""
[ "$N_DB" = 0 ] || WHAT="Change the theme of $(printf '%s' "$AFFECTED" | wc -w | tr -d ' ') user(s)"
[ "$N_CFG" = 0 ] || WHAT="$([ -n "$WHAT" ] && printf '%s, then set' "$WHAT" || printf 'Set') the global default theme to '$DEF_TARGET' in $N_CFG config file(s)"
if [ "$YES" != 1 ]; then
  printf '[danke] %s now? Type yes to continue: ' "$WHAT"
  ans=""; IFS= read -r ans || true
  if [ "$ans" != yes ]; then printf '\n'; say "not confirmed — nothing changed."; exit 4; fi
fi
TS="$(date +%Y%m%d-%H%M%S)"

if [ "$N_DB" != 0 ]; then
# ---- database step: back up, change, verify
[ -n "$MYSQLDUMP" ] || die "no mysqldump / mariadb-dump found — no backup possible, nothing changed"
[ -d "$BACKUP_ROOT" ] || die "backup folder $BACKUP_ROOT does not exist — nothing changed"
BK="$BACKUP_ROOT/danke-user-theme-backup-$TS.sql"
n=1; while [ -e "$BK" ]; do n=$((n+1)); BK="$BACKUP_ROOT/danke-user-theme-backup-$TS-$n.sql"; done
( umask 077; : > "$BK" ) || die "cannot write $BK — nothing changed"
chmod 600 "$BK"
# --no-tablespaces: ISPConfig's database user has no PROCESS privilege (newer mysqldump versions stop without it)
# --single-transaction: consistent InnoDB snapshot without LOCK TABLES — ISPConfig's database user has no LOCK TABLES privilege
if ! "$MYSQLDUMP" --defaults-extra-file="$CNF" --no-tablespaces --single-transaction "$DB_NAME" sys_user client > "$BK" 2> "$TMPD/err"; then
  err "the backup (mysqldump of sys_user and client) failed — nothing changed:"; sed 's/^/[danke]    /' "$TMPD/err" >&2
  [ "$N_CFG" = 0 ] || err "the config files were NOT touched (--set-default runs only after a successful database step)."
  rm -f "$BK"; exit 1
fi
[ -s "$BK" ] || { rm -f "$BK"; die "the backup file is empty — nothing changed"; }
say "backup of the tables sys_user and client: $BK"
say "  restore (puts BOTH tables back to this moment):   mysql $DB_NAME < $BK"

if ! sql "START TRANSACTION; ${STMTS[*]} COMMIT;" > /dev/null 2> "$TMPD/err"; then
  err "the change failed:"; sed 's/^/[danke]    /' "$TMPD/err" >&2
  err "check the state with --list; the backup is $BK"
  [ "$N_CFG" = 0 ] || err "the config files were NOT touched (--set-default runs only after a successful database step)."
  exit 1
fi
load_rows; parse_rows
say "changed. The same users now:"
print_table "$AFFECTED"
say "The new theme is used at each user's next login; a session that is open now keeps its theme until it ends."
fi   # database step

if [ "$N_CFG" != 0 ]; then
# ---- config step: back up each file, write through the existing file, verify, print diff + restore
CBK="$BACKUP_ROOT/danke-config-backup-$TS"
n=1; while [ -e "$CBK" ]; do n=$((n+1)); CBK="$BACKUP_ROOT/danke-config-backup-$TS-$n"; done
DBNOTE=""; [ "$N_DB" = 0 ] || DBNOTE=" The database change above stays (its restore command is printed above)."
( umask 077; mkdir "$CBK" ) || die "cannot create $CBK — no config file changed.$DBNOTE"
bkname() { printf '%s/%s' "$CBK" "$(printf '%s' "$1" | tr '/' '_')"; }
for f in "${CFG_CHANGE[@]}"; do
  b="$(bkname "$f")"
  cp -a "$ISPC_DIR/$f" "$b" && cmp -s "$ISPC_DIR/$f" "$b" || die "could not copy $ISPC_DIR/$f to $b — no config file changed.$DBNOTE"
done
say "backup of the config file(s), owner and mode kept: $CBK/"
DONE=()
put_back() { local g; for g in ${DONE[@]+"${DONE[@]}"}; do cat "$(bkname "$g")" > "$ISPC_DIR/$g" || err "could NOT restore $ISPC_DIR/$g — do it by hand:  cat $(bkname "$g") > $ISPC_DIR/$g"; done; }
for f in "${CFG_CHANGE[@]}"; do
  b="$(bkname "$f")"; DONE+=("$f")
  # write into the existing file (no rename): inode, owner and mode stay exactly as ISPConfig set them
  if ! sed -E "$CF_SED" "$b" > "$ISPC_DIR/$f"; then put_back; die "writing $ISPC_DIR/$f failed — the config file(s) were put back from $CBK/.$DBNOTE"; fi
  d="$(diff "$b" "$ISPC_DIR/$f" || true)"
  if [ "$(printf '%s\n' "$d" | grep -c '^<')" != 1 ] || [ "$(printf '%s\n' "$d" | grep -c '^>')" != 1 ] || [ "$(cf_value "$ISPC_DIR/$f")" != "$DEF_TARGET" ]; then
    put_back; die "the edit of $ISPC_DIR/$f could not be verified — the config file(s) were put back from $CBK/.$DBNOTE"
  fi
  say "changed $ISPC_DIR/$f (diff backup → file):"
  printf '%s\n' "$d" | sed 's/^/[danke]      /'
done
say "the global default theme is now '$DEF_TARGET'. It is used by the login page at once and by users without a theme of their own at their next login."
say "  restore (puts the file(s) back to this moment, owner and mode stay):"
for f in "${CFG_CHANGE[@]}"; do say "      cat $(bkname "$f") > $ISPC_DIR/$f"; done
fi   # config step

NOT="every other table"
[ "$N_DB" != 0 ] || NOT="the database"
[ "$N_CFG" != 0 ] || NOT="\$conf['theme'], files, $NOT"
[ "$N_CFG" = 0 ] || NOT="every other line and file, $NOT"
say "not changed: $NOT."
exit 0
