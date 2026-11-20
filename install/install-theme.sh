#!/usr/bin/env bash
# install-theme.sh — install the Danke theme ("danke") on an ISPConfig panel server.
#
#   sudo ./install-theme.sh [--dry-run] [--keep-version-file] [--brand <id>] <path-to-danke-dir | danke-theme-….tar.gz>
#   sudo ./install-theme.sh [--dry-run] --rollback /root/danke-theme-backup-<timestamp>
#   sudo ./install-theme.sh [--dry-run] --apply-brand [--brand <id>]
#   sudo ./install-theme.sh [--dry-run] --new-brand
#
# Principle: the theme never changes the ISPConfig installation. This script only writes ONE folder,
#   /usr/local/ispconfig/interface/web/themes/danke
# It does not edit config.inc.php, the database, language files, templates or other themes, and it does not select
# the theme for anybody (that is the admin's step: Tools → User Settings → Design; INSTALL.md).
#
# What it does (and prints):
#   1. checks it runs as root and that ISPConfig is installed in /usr/local/ispconfig
#   2. reads the installed ISPConfig version (ISPC_APP_VERSION):
#        - other major.minor than the theme (e.g. 3.2.x, 3.4.x)  → refuses (ISPConfig would not load the theme either)
#        - same major.minor, version not in TESTED-VERSIONS.md   → clear WARNING, installs
#        - same major.minor, tested                              → installs
#   3. backs up an existing themes/danke (and, read-only, a copy of both config.inc.php files for reference)
#      to /root/danke-theme-backup-<timestamp>/
#   4. copies the theme to themes/danke (replacing the old copy), owner and mode like themes/default.
#      The folder themes/danke/local/ (this server's own choices: brand, credit, own logo files) is carried over
#      from the copy that is replaced — an update never loses it.
#   5. applies the brand profile (logo, icons, name, colour accent, credit) to the installed copy:
#        --brand <id>   use the profile brands/<id>/ of the package and remember it in themes/danke/local/brand
#        no --brand     keep what themes/danke/local/ says (a profile id in local/brand, or your own brand in the
#                       folder local/brand/); nothing there → the default profile of the package (brands/default)
#   6. only on an ISPConfig that accepts a theme solely when its ispconfig_version file equals the installed version
#      EXACTLY (3.3.1 and older: no theme_is_compatible() yet): writes the installed version into the INSTALLED COPY's
#      own ispconfig_version file (the theme's file is kept next to it as ispconfig_version.theme) and says so.
#      Without that the theme could not be selected on such a release. --keep-version-file turns this off.
#   --rollback <backup-dir>: puts back the theme folder saved in a backup made by this script or by
#      uninstall-theme.sh (the current folder is backed up first). The current local/ folder is carried over, so the
#      brand of this server stays. Nothing else is restored.
#   --apply-brand: no new package — applies the brand again to the installed theme (after you changed files in
#      local/, or together with --brand <id> to switch the profile). The folder is backed up first.
#   --new-brand: starts your own brand — copies the starter kit of the installed theme (brands/_example/: brand.json,
#      placeholder logo and icons, README.md) to themes/danke/local/brand/ and prints the next steps. Nothing is
#      applied by this step. Refused when local/brand already exists (a folder or the one-line choice file): nothing
#      is ever overwritten.
#
# Build tool mode (no server, no root):  ./install-theme.sh --stage <theme-dir> [--brand <id>]
#   applies the brand profile inside <theme-dir> and exits. Used when the package is built.
#
# Test hooks (never needed on a server): ISPC_DIR=<scratch tree> DANKE_BACKUP_ROOT=<dir> DANKE_ALLOW_NONROOT=1
set -euo pipefail
shopt -u patsub_replacement 2>/dev/null || true   # bash 5.2+: keep "&" in a brand name literal when it is substituted

THEME="danke"
ISPC_DIR="${ISPC_DIR:-/usr/local/ispconfig}"
BACKUP_ROOT="${DANKE_BACKUP_ROOT:-/root}"
THEMES_DIR="$ISPC_DIR/interface/web/themes"
DRY=0; KEEPVER=0; SRC=""; ROLLBACK=""; BRAND=""; STAGE=""; APPLY=0; NEWBRAND=0; want=""
for a in "$@"; do
  if [ -n "$want" ]; then
    case "$want" in rollback) ROLLBACK="$a" ;; brand) BRAND="$a" ;; stage) STAGE="$a" ;; esac
    want=""; continue
  fi
  case "$a" in
    --dry-run) DRY=1 ;;
    --keep-version-file) KEEPVER=1 ;;
    --rollback) want=rollback ;;
    --rollback=*) ROLLBACK="${a#--rollback=}" ;;
    --brand) want=brand ;;
    --brand=*) BRAND="${a#--brand=}" ;;
    --stage) want=stage ;;
    --stage=*) STAGE="${a#--stage=}" ;;
    --apply-brand) APPLY=1 ;;
    --new-brand) NEWBRAND=1 ;;
    --force) printf '[danke] note: --force is no longer needed (and no longer skips anything): only another major.minor is refused\n' ;;
    -h|--help) sed -n '2,46p' "$0"; exit 0 ;;
    -*) printf '[danke] ERROR: unknown option %s\n' "$a" >&2; exit 2 ;;
    *) SRC="$a" ;;
  esac
done
say() { printf '[danke] %s\n' "$*"; }
run() { if [ "$DRY" = 1 ]; then printf '[danke] (dry-run) %s\n' "$*"; else "$@"; fi; }
die() { printf '[danke] ERROR: %s\n' "$*" >&2; exit 1; }
[ -z "$want" ] || die "--$want needs a value"

# ------------------------------------------------------------------ brand profiles
# A profile is a folder:  brand.json + image files (all optional except what its "logo" mode needs)
#   { "name": "…", "short_name": "…", "logo": "files" | "core", "accent": "#RRGGBB", "rail": "#RRGGBB",
#     "credit": true | false, "credit_style": "designer" | "product" }
#   rail          background of the icon rail (dark in both modes; its texts and icons stay light) — a colour on which
#                 the rail text would not reach a contrast of 4.5:1 is refused
#   credit_style  how the maker credit reads: "designer" (default) = "Designed by AIDGeeks"; "product" = "Danke theme ·
#                 by AIDGeeks" (the profile "neutral")
# brands/_example/ is the starter kit for an own brand (--new-brand copies it to local/brand/). A folder whose name
# starts with "_" is never a selectable profile.
# Shipped profiles: <theme>/brands/<id>/.  This server's choice: <theme>/local/brand = a FILE holding a profile id,
# or a FOLDER with the admin's own profile (same layout).  <theme>/local/credit = "on" | "off" overrides "credit".
# Applying a profile writes only generated files: <theme>/assets/brand/* and <theme>/templates/brand_*.htm.
# Everything read from the theme folder is treated as data: fixed file names, regular files only (no symlinks).
BRAND_IMAGES="logo.svg logo-dark.svg icon.svg icon-rail.svg credit-icon.svg credit-icon-dark.svg favicon.ico favicon-16x16.png favicon-32x32.png apple-touch-icon.png android-chrome-192x192.png android-chrome-512x512.png mstile-150x150.png"
DEFAULT_ACCENT="#1F6FAF"
RAIL_TEXT="#B9C6D6"     # --c-rail-text of the theme (tokens.css): the dimmest text on the rail
RAIL_MIN="4.5"
valid_id() { printf '%s' "$1" | grep -qE '^[a-z0-9][a-z0-9_-]{0,39}$'; }
plain_file() { [ -f "$1" ] && [ ! -L "$1" ]; }
json_str()  { tr -d '\r\n' < "$1" | grep -oE "\"$2\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | head -n 1 | sed -E 's/^[^:]*:[[:space:]]*"(.*)"$/\1/' || true; }
json_bool() { tr -d '\r\n' < "$1" | grep -oE "\"$2\"[[:space:]]*:[[:space:]]*(true|false)" | head -n 1 | grep -oE '(true|false)$' || true; }
list_brands() { local d; for d in "$1"/brands/[a-z0-9]*/; do [ -f "$d/brand.json" ] && basename "$d"; done | tr '\n' ' '; }
# contrast <#RRGGBB> <#RRGGBB> → WCAG 2.1 contrast ratio, two decimals, rounded DOWN (4.499 is 4.49, not 4.50)
contrast() {
  awk -v a="$1" -v b="$2" '
    function hx(s, i) { return (index("0123456789abcdef", tolower(substr(s, i, 1))) - 1) * 16 + index("0123456789abcdef", tolower(substr(s, i + 1, 1))) - 1 }
    function ch(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ^ 2.4 }
    function lum(s) { return 0.2126 * ch(hx(s, 2)) + 0.7152 * ch(hx(s, 4)) + 0.0722 * ch(hx(s, 6)) }
    BEGIN { x = lum(a); y = lum(b); if (x < y) { t = x; x = y; y = t } printf "%.2f", int((x + 0.05) / (y + 0.05) * 100) / 100 }'
}

# brand_select <theme-dir> <requested id or ''>  → sets B_ID, B_DIR, B_FROM (why this one)
brand_select() {
  local t="$1" want_id="$2" id=""
  B_ID=""; B_DIR=""; B_FROM=""
  [ -d "$t/brands/_fragments" ] || return 1          # a theme release without brand profiles: nothing to apply
  # This script runs as root, the theme folder belongs to the panel user: never write through a symbolic link.
  local l
  for l in "$t/local" "$t/local/brand" "$t/assets" "$t/templates" "$t/brands" "$t/brands/_fragments"; do
    [ ! -L "$l" ] || die "$l is a symbolic link — refused (the theme folder must hold real files and folders only)"
  done
  if [ -n "$want_id" ]; then
    valid_id "$want_id" || die "--brand: '$want_id' is not a profile id (lower-case letters, digits, - and _)"
    plain_file "$t/brands/$want_id/brand.json" || die "--brand: no profile '$want_id' in this package. Available: $(list_brands "$t")"
    if [ -d "$t/local/brand" ] && [ ! -L "$t/local/brand" ]; then
      die "--brand $want_id: this server has its own brand in $THEMES_DIR/$THEME/local/brand/ — it is never overwritten. Move that folder away first (e.g. mv …/local/brand /root/), then run again."
    fi
    B_ID="$want_id"; B_DIR="$t/brands/$want_id"; B_FROM="--brand $want_id (remembered in local/brand)"
    return 0
  fi
  if [ -d "$t/local/brand" ] && [ ! -L "$t/local/brand" ]; then
    plain_file "$t/local/brand/brand.json" || die "local/brand/ holds no brand.json — see INSTALL.md, 'Your own brand'"
    B_ID="local"; B_DIR="$t/local/brand"; B_FROM="this server's own brand, local/brand/"
    return 0
  fi
  if plain_file "$t/local/brand"; then
    id="$(tr -d '[:space:]' < "$t/local/brand" | head -c 60)"
    if valid_id "$id" && plain_file "$t/brands/$id/brand.json"; then
      B_ID="$id"; B_DIR="$t/brands/$id"; B_FROM="kept from local/brand"
      return 0
    fi
    say "WARNING: local/brand names the profile '$id', which this package does not have (available: $(list_brands "$t"))."
    say "WARNING: using the package's default profile; local/brand is left as it is."
  fi
  id="$(tr -d '[:space:]' < "$t/brands/default" 2>/dev/null | head -c 60 || true)"
  valid_id "$id" && plain_file "$t/brands/$id/brand.json" || id="neutral"
  plain_file "$t/brands/$id/brand.json" || die "the package has no usable brand profile (brands/$id/brand.json missing)"
  B_ID="$id"; B_DIR="$t/brands/$id"; B_FROM="default profile of the package"
}

# fragment <src> <dst> <path prefix>: copy a template fragment, resolving
#   @P@            → path prefix ('' for the panel, '../' for the login pages)
#   @ACCENT@       → accent colour
#   @NAME@         → the brand name (or, for a profile that takes it from ISPConfig, the template expression for it)
#   @has:<file>@…  → the line is kept only when assets/brand/<file> exists
fragment() {
  local src="$1" dst="$2" p="$3" line f out="" nl=$'\n'
  while IFS= read -r line || [ -n "$line" ]; do
    while [[ "$line" =~ ^([[:space:]]*)@has:([A-Za-z0-9._-]+)@(.*)$ ]]; do
      f="${BASH_REMATCH[2]}"
      if [ -f "$B_OUT/$f" ]; then line="${BASH_REMATCH[1]}${BASH_REMATCH[3]}"; else line=$'\x01'; break; fi
    done
    [ "$line" = $'\x01' ] && continue
    line="${line//@P@/$p}"; line="${line//@ACCENT@/$B_ACCENT}"; line="${line//@NAME@/$B_NAME}"
    out="$out${out:+$nl}$line"
  done < "$src"
  # no line break at the very end: fragments are also printed inside attributes. The target is removed first, so a
  # link left under that name is never written through.
  rm -f "$dst"; printf '%s' "$out" > "$dst"
}

# brand_apply <theme-dir> <requested id or ''> : select + write the generated files. Prints one summary line.
brand_apply() {
  local t="$1" f name short mode credit lc frag base style rail cr
  brand_select "$t" "$2" || { say "brand: this theme release has no brand profiles — nothing to apply"; return 0; }
  name="$(json_str "$B_DIR/brand.json" name)"; short="$(json_str "$B_DIR/brand.json" short_name)"
  mode="$(json_str "$B_DIR/brand.json" logo)"; B_ACCENT="$(json_str "$B_DIR/brand.json" accent)"
  credit="$(json_bool "$B_DIR/brand.json" credit)"
  style="$(json_str "$B_DIR/brand.json" credit_style)"; rail="$(json_str "$B_DIR/brand.json" rail)"
  [ "$mode" = core ] || mode=files
  case "$style" in product|designer) ;; '') style=designer ;; *) die "brand '$B_ID': \"credit_style\" must be \"designer\" or \"product\" (found \"$style\")" ;; esac
  case "$name" in *[\<\>\{\}\'\"]*) die "brand '$B_ID': the name in brand.json must not contain any of < > { } ' \" (write &amp; for &)" ;; esac
  [ -z "$B_ACCENT" ] || printf '%s' "$B_ACCENT" | grep -qE '^#[0-9A-Fa-f]{6}$' || die "brand '$B_ID': \"accent\" must look like #1F6FAF"
  if [ -n "$rail" ]; then
    printf '%s' "$rail" | grep -qE '^#[0-9A-Fa-f]{6}$' || die "brand '$B_ID': \"rail\" must look like #14263F"
    cr="$(contrast "$rail" "$RAIL_TEXT")"
    awk -v c="$cr" -v m="$RAIL_MIN" 'BEGIN { exit !(c + 0 >= m + 0) }' || die "brand '$B_ID': \"rail\" $rail is too light for the icon rail — its light text ($RAIL_TEXT) would have a contrast of only $cr:1 on it (at least $RAIL_MIN:1 is needed). Choose a darker colour, or remove \"rail\" to keep the theme's own."
  fi
  if [ "$mode" = files ]; then
    [ -n "$name" ] || die "brand '$B_ID': brand.json needs a \"name\""
    plain_file "$B_DIR/logo.svg" && plain_file "$B_DIR/icon.svg" || die "brand '$B_ID': logo.svg and icon.svg are needed (or \"logo\": \"core\" to use ISPConfig's logo)"
  fi
  [ "$credit" = false ] && credit=off || credit=on
  if plain_file "$t/local/credit"; then
    lc="$(tr -d '[:space:]' < "$t/local/credit" | head -c 10)"
    case "$lc" in on|off) credit="$lc" ;; *) say "WARNING: local/credit must hold 'on' or 'off' (found '$lc') — ignored" ;; esac
  fi
  if [ "$DRY" = 1 ]; then
    say "(dry-run) apply brand profile '$B_ID' ($B_FROM): name '${name:-from ISPConfig}', logo $mode, credit $credit$([ "$credit" = on ] && echo " ($style)")${rail:+, rail $rail (contrast $cr:1)}"
    return 0
  fi
  if [ -n "$2" ]; then mkdir -p "$t/local"; rm -f "$t/local/brand"; printf '%s\n' "$B_ID" > "$t/local/brand"; fi

  # --- images
  B_OUT="$t/assets/brand"
  rm -rf "$B_OUT"; mkdir -p "$B_OUT"
  for f in $BRAND_IMAGES; do plain_file "$B_DIR/$f" && cp "$B_DIR/$f" "$B_OUT/$f"; done
  if [ "$mode" = files ]; then
    [ -f "$B_OUT/logo-dark.svg" ] || cp "$B_OUT/logo.svg" "$B_OUT/logo-dark.svg"
    [ -f "$B_OUT/icon-rail.svg" ] || cp "$B_OUT/icon.svg" "$B_OUT/icon-rail.svg"
    [ -f "$B_OUT/credit-icon.svg" ] && [ ! -f "$B_OUT/credit-icon-dark.svg" ] && cp "$B_OUT/credit-icon.svg" "$B_OUT/credit-icon-dark.svg"
    if [ -f "$B_OUT/android-chrome-192x192.png" ]; then
      printf '{\n    "name": "%s",\n    "short_name": "%s",\n    "icons": [\n        { "src": "android-chrome-192x192.png", "sizes": "192x192", "type": "image/png" }%s\n    ],\n    "theme_color": "%s",\n    "background_color": "#FFFFFF",\n    "display": "browser"\n}\n' \
        "$name" "${short:-$name}" "$([ -f "$B_OUT/android-chrome-512x512.png" ] && printf ',\n        { "src": "android-chrome-512x512.png", "sizes": "512x512", "type": "image/png" }')" "${B_ACCENT:-$DEFAULT_ACCENT}" > "$B_OUT/site.webmanifest"
    fi
    if [ -f "$B_OUT/mstile-150x150.png" ]; then
      printf '<?xml version="1.0" encoding="utf-8"?>\n<browserconfig>\n    <msapplication>\n        <tile>\n            <square150x150logo src="/themes/%s/assets/brand/mstile-150x150.png"/>\n            <TileColor>%s</TileColor>\n        </tile>\n    </msapplication>\n</browserconfig>\n' \
        "$THEME" "${B_ACCENT:-$DEFAULT_ACCENT}" > "$B_OUT/browserconfig.xml"
    fi
  fi
  # --- colour accent: one optional colour; the shades are derived from it (assets/brand/accent.css is always there)
  if [ -n "$B_ACCENT" ]; then
    printf '/* generated from brand.json "accent" (%s) — do not edit, change brand.json and apply the brand again */\n:root {\n  --dk-brand-blue: %s;\n  --dk-brand-blue-600: color-mix(in srgb, %s 84%%, #000);\n  --dk-brand-blue-700: color-mix(in srgb, %s 72%%, #000);\n  --dk-brand-blue-300: color-mix(in srgb, %s 62%%, #fff);\n}\n' \
      "$B_ID" "$B_ACCENT" "$B_ACCENT" "$B_ACCENT" "$B_ACCENT" > "$B_OUT/accent.css"
  else
    printf '/* no colour accent in the active brand profile (%s): the theme palette is used as it is */\n' "$B_ID" > "$B_OUT/accent.css"
    B_ACCENT="$DEFAULT_ACCENT"
  fi
  # --- rail colour (optional): written after the accent, into the same generated file. The selectors are a step more
  #     specific than the theme's own token blocks, which are loaded after this file.
  if [ -n "$rail" ]; then
    printf '/* generated from brand.json "rail" (%s; contrast of the rail text on it: %s:1) */\nhtml:root, html:root[data-theme="dark"] {\n  --c-rail: %s;\n  --c-rail-border: %s;\n  --c-rail-hover: color-mix(in srgb, %s 86%%, #fff);\n}\nhtml:root[data-theme="dark"] { --c-rail-border: color-mix(in srgb, %s 80%%, #fff); }\n' \
      "$B_ID" "$cr" "$rail" "$rail" "$rail" "$rail" >> "$B_OUT/accent.css"
  fi
  printf '%s\n' "$B_ID" > "$B_OUT/active.txt"

  # --- template fragments (templates/brand_*.htm; *_login.htm = the same with ../ paths for the login pages)
  rm -f "$t"/templates/brand_*.htm
  B_NAME="$name"
  if [ -z "$B_NAME" ] && plain_file "$t/brands/_fragments/$mode/brand_name.htm"; then B_NAME="$(cat "$t/brands/_fragments/$mode/brand_name.htm")"; fi
  [ -n "$B_NAME" ] || die "brand '$B_ID': no name (brand.json \"name\")"
  for frag in "$t/brands/_fragments/$mode"/brand_*.htm "$t/brands/_fragments"/brand_*.htm; do
    plain_file "$frag" || continue
    base="$(basename "$frag" .htm)"
    [ "$base" = brand_credit ] && [ "$credit" = off ] && continue
    # the credit has two wordings; a theme release without the second piece keeps the first
    if [ "$base" = brand_credit ] && [ "$style" = product ] && plain_file "$t/brands/_fragments/credit_product.htm"; then frag="$t/brands/_fragments/credit_product.htm"; fi
    fragment "$frag" "$t/templates/$base.htm" ""
    if grep -q '@P@' "$frag"; then fragment "$frag" "$t/templates/${base}_login.htm" "../"; fi
  done
  if [ "$credit" = off ]; then
    for f in brand_credit.htm brand_credit_login.htm; do
      rm -f "$t/templates/$f"; printf '%s' '<!-- maker credit: switched off (brand.json "credit": false, or local/credit = off) -->' > "$t/templates/$f"
    done
  fi
  # the brand name: one line, no line break at the end (it is printed into <title> and into attributes)
  rm -f "$t/templates/brand_name.htm"; printf '%s' "$B_NAME" > "$t/templates/brand_name.htm"
  say "brand profile: $B_ID ($B_FROM) — name '${name:-from ISPConfig (company name / ISPConfig)}', logo: $([ "$mode" = core ] && echo "ISPConfig's own or the custom logo set in ISPConfig" || echo 'profile files'), credit: $credit$([ "$credit" = on ] && echo " ($style)")${rail:+, rail: $rail}"
}

# ------------------------------------------------------------------ build tool mode
if [ -n "$STAGE" ]; then
  [ -f "$STAGE/templates/main.tpl.htm" ] && [ -d "$STAGE/brands" ] || die "--stage: $STAGE is not a $THEME theme folder"
  DRY=0; brand_apply "$(cd "$STAGE" && pwd)" "$BRAND"
  exit 0
fi

if [ "$(id -u)" != 0 ]; then
  [ "${DANKE_ALLOW_NONROOT:-0}" = 1 ] && [ "$ISPC_DIR" != /usr/local/ispconfig ] || die "run as root (sudo)"
  say "TEST MODE: not root, working on the scratch tree $ISPC_DIR (ownership is not changed)"
fi
[ -f "$ISPC_DIR/interface/lib/config.inc.php" ] || die "ISPConfig not found in $ISPC_DIR"
[ -d "$THEMES_DIR/default" ] || die "$THEMES_DIR/default not found"
[ "$DRY" = 1 ] && say "DRY RUN — nothing is changed"

TS="$(date +%Y%m%d-%H%M%S)"
BK="$BACKUP_ROOT/$THEME-theme-backup-$TS"
ISPC_VER="$(grep -oP "define\('ISPC_APP_VERSION',\s*'\K[^']+" "$ISPC_DIR/interface/lib/config.inc.php" || true)"
mm() { printf '%s' "$1" | grep -oE '^[0-9]+\.[0-9]+' || true; }

set_owner() {   # owner + mode like the ISPConfig installer gives themes/default
  local owner; owner="$(stat -c '%U:%G' "$THEMES_DIR/default" 2>/dev/null || echo ispconfig:ispconfig)"
  if [ "$(id -u)" = 0 ]; then
    say "setting owner $owner (copied from themes/default) and mode 750"
    run chown -R "$owner" "$1"
  fi
  run chmod -R 750 "$1"
}
HAD_THEME=0   # 1 = a theme folder existed before this run and was (or, dry-run, would be) backed up
backup_current() {   # $1 = why
  say "backup directory: $BK"
  run mkdir -p "$BK"
  run cp -a "$ISPC_DIR/interface/lib/config.inc.php" "$BK/interface-config.inc.php"
  if [ -f "$ISPC_DIR/server/lib/config.inc.php" ]; then run cp -a "$ISPC_DIR/server/lib/config.inc.php" "$BK/server-config.inc.php"; fi
  if [ -d "$THEMES_DIR/$THEME" ]; then
    HAD_THEME=1
    run cp -a "$THEMES_DIR/$THEME" "$BK/$THEME"
    say "backed up the existing theme folder to $BK/$THEME"
  else
    say "no themes/$THEME yet — nothing of the theme to back up"
  fi
  if [ "$DRY" != 1 ]; then
    printf '%s theme backup\nmade by: install-theme.sh (%s)\ndate: %s\nISPConfig: %s\ncontains: %s\nconfig copies are for reference only — the scripts never change or restore config.inc.php\n' \
      "$THEME" "$1" "$TS" "${ISPC_VER:-unknown}" "$([ -d "$BK/$THEME" ] && echo "$THEME/ (theme folder before this run)" || echo 'no theme folder (none was installed)')" > "$BK/BACKUP-INFO.txt"
  fi
}
# replace_theme <source folder> <brand id or ''>: copy next to the live folder, carry local/ over, apply the brand, swap
replace_theme() {
  local new="$THEMES_DIR/$THEME.new" cur="$THEMES_DIR/$THEME"
  run rm -rf "$new"
  [ "$DRY" = 1 ] || NEW_MADE=1
  run cp -a "$1" "$new"
  if [ -d "$cur/local" ] && [ ! -L "$cur/local" ] && [ "$1" != "$cur" ]; then
    say "keeping this server's own settings: $cur/local/ ($(find "$cur/local" -type f | wc -l | tr -d ' ') file(s)) is carried over"
    run rm -rf "$new/local"
    run cp -a "$cur/local" "$new/local"
  fi
  if [ "$DRY" = 1 ]; then
    # nothing was copied: show what would be applied, read from the source and the live local/ folder
    local probe="$1"
    ( t="$(mktemp -d)"; trap 'rm -rf "$t"' EXIT; mkdir -p "$t/x"; cp -a "$probe/brands" "$t/x/brands" 2>/dev/null || true
      if [ -d "$cur/local" ]; then cp -a "$cur/local" "$t/x/local"; elif [ -d "$probe/local" ]; then cp -a "$probe/local" "$t/x/local"; fi
      brand_apply "$t/x" "$2" )
  else
    brand_apply "$new" "$2"
  fi
  run rm -rf "$cur"
  run mv "$new" "$cur"
  NEW_MADE=0
}
# brand_precheck <source folder>: stop BEFORE anything is backed up or copied when --brand cannot work
brand_precheck() {
  [ -n "$BRAND" ] || return 0
  valid_id "$BRAND" || die "--brand: '$BRAND' is not a profile id (lower-case letters, digits, - and _)"
  [ -d "$1/brands/_fragments" ] || die "--brand: this theme release has no brand profiles"
  plain_file "$1/brands/$BRAND/brand.json" || die "--brand: no profile '$BRAND' in this package. Available: $(list_brands "$1")"
  if [ -d "$THEMES_DIR/$THEME/local/brand" ] && [ ! -L "$THEMES_DIR/$THEME/local/brand" ]; then
    die "--brand $BRAND: this server has its own brand in $THEMES_DIR/$THEME/local/brand/ — it is never overwritten. Move that folder away first (e.g. mv $THEMES_DIR/$THEME/local/brand /root/$THEME-own-brand), then run again."
  fi
}

# ------------------------------------------------------------------ --new-brand: starter kit → local/brand/
if [ "$NEWBRAND" = 1 ]; then
  [ -z "$SRC$ROLLBACK$BRAND" ] && [ "$APPLY" = 0 ] || die "--new-brand stands alone (only --dry-run may be added)"
  T="$THEMES_DIR/$THEME"
  [ -d "$T" ] || die "--new-brand: $T is not installed — install the theme first"
  for l in "$T" "$T/local" "$T/local/brand" "$T/brands" "$T/brands/_example"; do
    [ ! -L "$l" ] || die "$l is a symbolic link — refused (the theme folder must hold real files and folders only)"
  done
  plain_file "$T/brands/_example/brand.json" || die "--new-brand: the installed theme release has no starter kit (brands/_example/) — install the current package first"
  if [ -d "$T/local/brand" ]; then
    die "--new-brand: this server already has its own brand in $T/local/brand/ — it is never overwritten. Edit the files there, or move the folder away first (e.g. mv $T/local/brand /root/$THEME-own-brand)."
  fi
  if [ -e "$T/local/brand" ]; then
    die "--new-brand: $T/local/brand exists as a one-line choice file (profile '$(tr -d '[:space:]' < "$T/local/brand" | head -c 60)', written by --brand). It is not overwritten: remove it first (rm $T/local/brand), then run --new-brand again. Until the new brand is applied the panel keeps its current look."
  fi
  say "copying the starter kit $T/brands/_example/ → $T/local/brand/"
  run mkdir -p "$T/local/brand"
  for f in brand.json README.md logo.svg logo-dark.svg icon.svg icon-rail.svg; do
    if plain_file "$T/brands/_example/$f"; then run cp "$T/brands/_example/$f" "$T/local/brand/$f"; fi
  done
  set_owner "$T/local"
  say "done$([ "$DRY" = 1 ] && echo ' (dry run: nothing was changed)'). Nothing is applied yet — the panel looks as before."
  say "next:"
  say "  1. edit $T/local/brand/brand.json (name, colours) and replace logo.svg, logo-dark.svg, icon.svg,"
  say "     icon-rail.svg with your own files (sizes and rules: $T/local/brand/README.md)"
  say "  2. look at what would be applied:   $0 --dry-run --apply-brand"
  say "  3. apply it:                        $0 --apply-brand      (then reload the panel with Ctrl+F5)"
  say "  the next theme update applies local/brand/ as well — finish or remove the folder before you update."
  exit 0
fi

TMP=""
NEW_MADE=0
cleanup() {
  [ -n "$TMP" ] && rm -rf "$TMP"
  # a stop half-way (e.g. a brand profile that cannot be applied) must not leave a work copy next to the live theme
  if [ "$NEW_MADE" = 1 ] && [ -d "$THEMES_DIR/$THEME.new" ]; then rm -rf "$THEMES_DIR/$THEME.new"; fi
  return 0
}
trap cleanup EXIT

# ------------------------------------------------------------------ rollback
if [ -n "$ROLLBACK" ]; then
  [ -d "$ROLLBACK" ] || die "backup directory not found: $ROLLBACK"
  RB="$(cd "$ROLLBACK" && pwd)"
  if [ ! -d "$RB/$THEME" ]; then
    die "$RB holds no theme folder ($THEME/): that backup was made when no theme was installed. To go back to that state run uninstall-theme.sh."
  fi
  [ -f "$RB/$THEME/ispconfig_version" ] && [ -f "$RB/$THEME/templates/main.tpl.htm" ] || die "$RB/$THEME is not a $THEME theme folder"
  brand_precheck "$RB/$THEME"
  say "rollback: restoring $RB/$THEME → $THEMES_DIR/$THEME"
  backup_current "before --rollback"
  replace_theme "$RB/$THEME" "$BRAND"
  set_owner "$THEMES_DIR/$THEME"
  say "done. Restored theme folder: $THEMES_DIR/$THEME"
  if [ "$HAD_THEME" = 1 ]; then
    say "  the folder that was there before this rollback: $BK/$THEME"
  else
    say "  no theme folder existed before this rollback (the theme was not installed) — nothing was replaced."
  fi
  say "  nothing else was touched (config.inc.php, database, user settings)."
  say "  users: log out and in again, reload with Ctrl+F5."
  exit 0
fi

# ------------------------------------------------------------------ source: installed folder (--apply-brand), directory or tarball
if [ "$APPLY" = 1 ]; then
  [ -z "$SRC" ] || die "--apply-brand works on the installed theme; do not name a package with it"
  [ -d "$THEMES_DIR/$THEME" ] || die "--apply-brand: $THEMES_DIR/$THEME is not installed"
  [ -d "$THEMES_DIR/$THEME/brands/_fragments" ] || die "--apply-brand: the installed theme release has no brand profiles"
  say "applying the brand to the installed theme (no new package)"
  TMP="$(mktemp -d)"
  cp -a "$THEMES_DIR/$THEME" "$TMP/$THEME"
  THEME_SRC="$TMP/$THEME"
else
  [ -n "$SRC" ] || die "name the package: $0 [--brand <id>] <$THEME-theme-….tar.gz | path to a $THEME folder>   (--help for all options)"
  if [ -d "$SRC" ]; then
    THEME_SRC="$(cd "$SRC" && pwd)"
  elif [ -f "$SRC" ]; then
    if [ -f "$SRC.sha256" ]; then
      say "verifying $(basename "$SRC").sha256"
      (cd "$(dirname "$SRC")" && sha256sum -c "$(basename "$SRC").sha256") || die "checksum mismatch"
    fi
    TMP="$(mktemp -d)"
    tar -xzf "$SRC" -C "$TMP"
    THEME_SRC="$TMP/$THEME"
  else
    die "source not found: $SRC"
  fi
fi
[ -f "$THEME_SRC/ispconfig_version" ] || die "$THEME_SRC is not the $THEME theme (no ispconfig_version file)"
[ -f "$THEME_SRC/templates/main.tpl.htm" ] || die "$THEME_SRC/templates/main.tpl.htm missing"

# ------------------------------------------------------------------ version policy
THEME_VER="$(tr -d '[:space:]' < "$THEME_SRC/ispconfig_version")"
[ -f "$THEME_SRC/ispconfig_version.theme" ] && THEME_VER="$(tr -d '[:space:]' < "$THEME_SRC/ispconfig_version.theme")"
say "installed ISPConfig version: ${ISPC_VER:-unknown}"
say "theme targets ISPConfig:     $THEME_VER (latest supported release)"
[ -n "$ISPC_VER" ] || die "cannot read ISPC_APP_VERSION from $ISPC_DIR/interface/lib/config.inc.php"
if [ "$(mm "$ISPC_VER")" != "$(mm "$THEME_VER")" ] || [ -z "$(mm "$ISPC_VER")" ]; then
  die "ISPConfig $ISPC_VER is another major.minor than the theme ($THEME_VER). ISPConfig itself refuses such a theme (theme_is_compatible) — not installed. Use a theme release built for ISPConfig $(mm "$ISPC_VER").x."
fi
TESTED="$THEME_SRC/TESTED-VERSIONS.md"
if [ -f "$TESTED" ] && grep -qE "^\|[[:space:]]*${ISPC_VER//./\\.}[[:space:]]*\|" "$TESTED"; then
  say "ISPConfig $ISPC_VER is in the theme's tested-versions list:"
  grep -E "^\|[[:space:]]*${ISPC_VER//./\\.}[[:space:]]*\|" "$TESTED" | head -n 1 | sed 's/^/[danke]    /'
else
  say "WARNING: ISPConfig $ISPC_VER is NOT in the theme's tested-versions list (TESTED-VERSIONS.md)."
  say "WARNING: same major.minor as the theme, so it is installed — but test it with ONE user before anybody else"
  say "WARNING: gets it (INSTALL.md, 'Select the theme for ONE user first')."
fi
# ISPConfig <= 3.3.1 has no theme_is_compatible(): login/index.php and the Design list accept a theme only when its
# ispconfig_version file equals ISPC_APP_VERSION exactly.
EXACT=0
if ! grep -q "function theme_is_compatible" "$ISPC_DIR/interface/lib/classes/functions.inc.php" 2>/dev/null; then EXACT=1; fi

brand_precheck "$THEME_SRC"

# ------------------------------------------------------------------ backup, copy, brand, owner
backup_current "$([ "$APPLY" = 1 ] && echo 'before --apply-brand' || echo 'before install')"
say "installing to $THEMES_DIR/$THEME"
replace_theme "$THEME_SRC" "$BRAND"
if [ "$EXACT" = 1 ] && [ "$ISPC_VER" != "$THEME_VER" ] && [ "$APPLY" != 1 ]; then
  if [ "$KEEPVER" = 1 ]; then
    say "NOTE: ISPConfig $ISPC_VER accepts a theme only when ispconfig_version equals '$ISPC_VER' exactly; the file says"
    say "NOTE: '$THEME_VER' and --keep-version-file was given → the theme will NOT appear in the Design list on this server."
  else
    say "NOTE: ISPConfig $ISPC_VER has no theme_is_compatible(): it accepts a theme only when the theme's"
    say "NOTE: ispconfig_version file equals '$ISPC_VER' exactly. Writing '$ISPC_VER' into the INSTALLED COPY's own file"
    say "NOTE: ($THEMES_DIR/$THEME/ispconfig_version; the theme's value '$THEME_VER' is kept as ispconfig_version.theme)."
    say "NOTE: Only the theme's own folder is touched. After an ISPConfig update to 3.3.2+ nothing needs to change."
    say "NOTE: The panel vhost of this ISPConfig release does not hide theme files from browsers (3.3.2+ does), so"
    say "NOTE: /themes/$THEME/ispconfig_version is readable without login and shows '$ISPC_VER'."
    if [ "$DRY" = 1 ]; then
      say "(dry-run) write '$ISPC_VER' to $THEMES_DIR/$THEME/ispconfig_version"
    else
      cp -a "$THEMES_DIR/$THEME/ispconfig_version" "$THEMES_DIR/$THEME/ispconfig_version.theme"
      printf '%s\n' "$ISPC_VER" > "$THEMES_DIR/$THEME/ispconfig_version"
    fi
  fi
fi
set_owner "$THEMES_DIR/$THEME"

say "done$([ "$DRY" = 1 ] && echo ' (dry run: nothing was changed)')."
if [ "$DRY" = 1 ]; then
  say "  theme:   $THEMES_DIR/$THEME  (the package holds $(find "$THEME_SRC" -type f | wc -l | tr -d ' ') files; none were copied)"
else
  say "  theme:   $THEMES_DIR/$THEME  ($(find "$THEMES_DIR/$THEME" -type f 2>/dev/null | wc -l | tr -d ' ') files)"
fi
say "  backup:  $BK"
say "  not changed: config.inc.php, database, other themes, any user's Design setting."
if [ "$APPLY" = 1 ]; then
  say "next: reload the panel with Ctrl+F5 (logo, icons and name are files of the theme; the browser may hold the old ones)."
else
  say "next: select the theme for ONE user first (Tools → User Settings → Design = $THEME), log out and in again."
fi
if [ "$HAD_THEME" = 1 ]; then
  say "rollback to the theme folder that was here before:  $0 --rollback $BK"
else
  say "no theme folder existed before this install, so there is nothing to roll back to; to undo it, remove the theme:"
fi
say "remove the theme completely:  $(dirname "$0")/uninstall-theme.sh   (users fall back to 'default' at their next login)"
