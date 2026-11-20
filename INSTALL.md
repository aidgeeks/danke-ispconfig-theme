# Installing Danke (`danke`) on an ISPConfig 3.3.x panel server

Danke is a theme for the ISPConfig 3.3 control panel. Run everything on the **panel server** as root. Other servers
of a multi-server setup (mail, DNS slaves …) need nothing.

**Principle: the theme never changes the ISPConfig installation.** It only adds its own folder
`/usr/local/ispconfig/interface/web/themes/danke`. No ISPConfig file, template, language file, database table or
other theme is modified by the theme or by the scripts. The only ISPConfig settings involved are ISPConfig's own,
set **by you**, never silently by a script:
- the per-user **Design** (Tools → User Settings) — step 5;
- optionally the global default `$conf['theme']` in `config.inc.php` — step 6: by hand, or with the optional helper
  `set-user-theme.sh --set-default` when you tell it to. The install and uninstall scripts never set it for you.

**ISPConfig version.** The theme targets the latest ISPConfig release (now **3.3.3p2**, the value in
`ispconfig_version`). It installs on every **3.3.x**; another major.minor (3.2.x, 3.4.x) is refused, exactly like
ISPConfig's own `theme_is_compatible()` does. Which versions were tested is listed in `TESTED-VERSIONS.md` inside the
theme (today: 3.3.3p2, 3.3.2p1, 3.3.1p1); for a 3.3.x version that is not in that list the installer prints a
**WARNING** and installs — test with one user first.

Where to get it: https://github.com/aidgeeks/danke-ispconfig-theme (each release is a tag). The repository holds the
theme as a folder (`theme/danke`) and the scripts (`install/`); `install-theme.sh` takes **either** that folder **or**
a package file — wherever this guide writes `danke-theme.tar.gz`, `theme/danke` of a clone works the same way.
Issues and questions: https://github.com/aidgeeks/danke-ispconfig-theme/issues.

Files you need: the package `danke-theme-<version>-<release>.tar.gz`, its `.sha256`, `install-theme.sh` and
`uninstall-theme.sh`. Below the package is called `danke-theme.tar.gz` — use the real file name.
Optional: `set-user-theme.sh`, a separate admin helper that shows and changes the theme of **existing** users (see
"Switching existing users") and can set the global default theme (step 6). It is the only script here that writes
to the database or to `config.inc.php`, and only what you tell it to, after a backup.

## 1. Copy the files to the server
From your workstation (adjust host name):
```bash
scp danke-theme-*.tar.gz danke-theme-*.tar.gz.sha256 install-theme.sh uninstall-theme.sh set-user-theme.sh root@panel.example:/root/
```

## 2. Check checksum and ISPConfig version
```bash
cd /root
sha256sum -c danke-theme-*.tar.gz.sha256
grep ISPC_APP_VERSION /usr/local/ispconfig/interface/lib/config.inc.php
```
Any `3.3.x` is accepted. `3.3.3p2`, `3.3.2p1` and `3.3.1p1` are in the tested list; for another 3.3.x read the
installer's warning.

## 3. Backup
The installer makes this backup itself (`/root/danke-theme-backup-<timestamp>/`: the previous theme folder if
there is one, plus a **reference copy** of both `config.inc.php` files — it never changes or restores them). By hand:
```bash
TS=$(date +%Y%m%d-%H%M%S)
mkdir -p /root/danke-theme-backup-$TS
cp -a /usr/local/ispconfig/interface/lib/config.inc.php /root/danke-theme-backup-$TS/interface-config.inc.php
cp -a /usr/local/ispconfig/server/lib/config.inc.php /root/danke-theme-backup-$TS/server-config.inc.php
[ -d /usr/local/ispconfig/interface/web/themes/danke ] && cp -a /usr/local/ispconfig/interface/web/themes/danke /root/danke-theme-backup-$TS/
echo "backup in /root/danke-theme-backup-$TS"
```
A database dump is not needed for the theme (nothing in the database is changed). Your normal server backup is
always a good idea before any change.

## 4. Install
**Option A — script** (does steps 2–4 itself, prints what it did; `--dry-run` shows the plan without changing anything):
```bash
chmod +x /root/install-theme.sh /root/uninstall-theme.sh
/root/install-theme.sh --dry-run /root/danke-theme.tar.gz
/root/install-theme.sh /root/danke-theme.tar.gz
```
To choose the look of this server at the same time, add `--brand <id>` (see **"Brand profiles"** below), e.g.
`/root/install-theme.sh --brand neutral /root/danke-theme.tar.gz`.
What the script does **not** do: edit `config.inc.php`, touch the database, select the theme for anybody.

**ISPConfig 3.3.1p1 only:** that release has no `theme_is_compatible()` yet; it accepts a theme only when the theme's
`ispconfig_version` file equals the installed version *exactly*. The installer therefore writes `3.3.1p1` into the
**installed copy's own** `ispconfig_version` (the theme's value is kept next to it as `ispconfig_version.theme`) and
prints a NOTE about it. Without that the theme would not appear in the Design list on 3.3.1p1.
(`--keep-version-file` turns it off.) From 3.3.2 on nothing is rewritten.

**Option B — by hand** (gives the package's default brand profile; a choice in `local/` is only applied by the script):
```bash
mkdir -p /root/danke-theme-src
tar -xzf /root/danke-theme.tar.gz -C /root/danke-theme-src
[ -d /usr/local/ispconfig/interface/web/themes/danke/local ] && cp -a /usr/local/ispconfig/interface/web/themes/danke/local /root/danke-theme-src/danke/
rm -rf /usr/local/ispconfig/interface/web/themes/danke
cp -a /root/danke-theme-src/danke /usr/local/ispconfig/interface/web/themes/danke
chown -R ispconfig:ispconfig /usr/local/ispconfig/interface/web/themes/danke
chmod -R 750 /usr/local/ispconfig/interface/web/themes/danke
ls -la /usr/local/ispconfig/interface/web/themes/
```
(On ISPConfig 3.3.1p1 additionally: `echo 3.3.1p1 > /usr/local/ispconfig/interface/web/themes/danke/ispconfig_version`.)
Ownership and mode are the same as the ISPConfig installer gives `themes/default`
(`chown -R ispconfig:ispconfig interface`, `chmod -R 750`). Compare with:
```bash
stat -c '%U:%G %a %n' /usr/local/ispconfig/interface/web/themes/default /usr/local/ispconfig/interface/web/themes/danke
```

## 5. Select the theme for ONE user first (per-user test)
1. Log in to the panel as `admin` (or better: a second admin user made for the test).
2. **Tools → User Settings → Settings** tab → field **Design** → choose `danke` → **Save**.
3. Log out and log in again (the theme is read at login).

If `danke` is missing from the *Design* list, ISPConfig considers it incompatible: check
`cat /usr/local/ispconfig/interface/web/themes/danke/ispconfig_version` (3.3.2 and newer: must start with `3.3`;
3.3.1p1: must be exactly `3.3.1p1`) and that the `ispconfig` user can read it.

For a client: log in as the client (**Client → Clients → "login as"** button) and use Tools → User Settings there.
The **Design** field of *Client → Edit Client* does **not** switch an existing client — see "Switching existing
users". For other panel users: **System → CP Users → edit → Design**.

After **Save** with a new Design the whole page reloads by itself (ISPConfig answers the save with "reload"). A save
that changes anything else shows a short "Saved." at the bottom of the page. No reload and no "Saved." means nothing
was stored — look for a red message above the form (for example a password the browser filled in by itself).

Test with this one user before going further. Everybody else keeps the `default` theme and notices nothing. The
login page also stays ISPConfig's until step 6.

## 6. Make it the default for everybody (optional, after testing)
This is ISPConfig's own documented setting and it is **your** step — the theme install never writes it.
Both config files carry `$conf['theme']`; the interface one decides the **login page** (used without a compatibility
check!) and the theme of new users.

**With the helper** (optional script `set-user-theme.sh`, see "Switching existing users"):
```bash
/root/set-user-theme.sh --set-default danke              # dry run: the current line and the new line of both files
/root/set-user-theme.sh --set-default danke --apply      # asks: type yes
```
It changes only the value in the line `$conf['theme'] = '…';` of
`/usr/local/ispconfig/interface/lib/config.inc.php` and `/usr/local/ispconfig/server/lib/config.inc.php`, and it
refuses a theme whose folder is missing or not compatible with the installed ISPConfig (that would break the login
page for everybody). Before writing it copies each file to `/root/danke-config-backup-<timestamp>/`, then prints the
diff and the restore commands; owner and mode of the files stay as they are. If both files already have the value
it says "already set" and changes nothing. The way back is `--set-default default`.

**By hand** it is the same edit:
```bash
grep -n "\$conf\['theme'\]" /usr/local/ispconfig/interface/lib/config.inc.php /usr/local/ispconfig/server/lib/config.inc.php
for f in /usr/local/ispconfig/interface/lib/config.inc.php /usr/local/ispconfig/server/lib/config.inc.php; do
  cp -a $f /root/$(echo $f | tr / _).before-danke-default
  sed -E 's/^(\s*\$conf\[.theme.\]\s*=\s*).default./\1'\''danke'\''/' /root/$(echo $f | tr / _).before-danke-default > $f
done
grep -n "\$conf\['theme'\]" /usr/local/ispconfig/interface/lib/config.inc.php /usr/local/ispconfig/server/lib/config.inc.php
```
(Writing through the existing file with `>` keeps its owner and mode.) ISPConfig updates keep this value
(`update.php` copies the old `$conf['theme']`).

Existing users keep their own **Design** setting — `$conf['theme']` does not switch them. How to switch them is the
next section. `install-theme.sh` and `uninstall-theme.sh` never write to the database.

**Before you ever remove the theme, set `$conf['theme']` back to `default`** (`set-user-theme.sh --set-default
default --apply`, or by hand) — `uninstall-theme.sh` checks this and stops if you forgot.

## Brand profiles — logo, name, colour accent, credit
What the panel shows as *its* brand is a **brand profile**. A profile is a small folder inside the theme,
`themes/danke/brands/<id>/`: a `brand.json` and, if the profile has its own artwork, logo and icon files.
`ls /usr/local/ispconfig/interface/web/themes/danke/brands/` lists the profiles your package ships (folders whose
name starts with `_` are not profiles: `_fragments` are template pieces, `_example` is the starter kit for an own
brand).

There are two ways to make the panel yours:

**A — your company name, with ISPConfig's logo (profile `neutral`, nothing to install).** The profile `neutral` is
in every package and has no artwork of its own. It shows what your ISPConfig installation has:
- **name** (browser tab) = `ISPConfig`, or `Your Company :: ISPConfig` when you fill in *Company Name for the page
  title* in ISPConfig (System → Interface → Main Config → tab *Misc*) — the same title the `default` theme shows;
- **footer** = `Your Company · powered by ISPConfig` (without a company name: `powered by ISPConfig`), plus the credit;
- **logo** and favicons = ISPConfig's own, taken from ISPConfig at run time exactly like the `default` theme does
  (favicons are loaded from `themes/default`); nothing is copied into the theme.

The company name is the only branding setting ISPConfig 3.3 offers in its interface: **there is no logo upload on
that page.** (If your installation still has a custom logo stored from an older ISPConfig version, ISPConfig keeps
passing it to themes and `neutral` shows it — but it cannot be changed there any more.)

**B — your own logo, icons and colour: your own brand in `themes/danke/local/brand/`.** This is the way to set a
logo. See "Your own brand" below; it takes a `brand.json` and two SVG files.

### Choosing a profile for this server
```bash
/root/install-theme.sh --brand neutral /root/danke-theme.tar.gz     # while installing / updating
/root/install-theme.sh --apply-brand --brand neutral                # later, without a package
```
The choice is written to `themes/danke/local/brand` (one line: the profile id). **`local/` is this server's own
folder: every update, and `--rollback`, carries it over**, so the next
`install-theme.sh danke-theme.tar.gz` (without `--brand`) keeps the profile. Without any choice the package's
default profile is used (`cat themes/danke/brands/default`). Which profile is active:
`cat /usr/local/ispconfig/interface/web/themes/danke/assets/brand/active.txt`.

After a change users reload once with Ctrl+F5.

### Your own brand
Your own profile lives in the **folder** `themes/danke/local/brand/` (instead of the one-line choice file) — same
layout as `brands/<id>/`. The quickest start is the starter kit that comes with the theme:
```bash
/root/install-theme.sh --new-brand               # copies brands/_example/ to themes/danke/local/brand/ — applies nothing
cd /usr/local/ispconfig/interface/web/themes/danke/local/brand
#   edit brand.json (name, colours), replace logo.svg, logo-dark.svg, icon.svg, icon-rail.svg with your files
#   (README.md in that folder: sizes, light / dark / rail rules, every brand.json key)
/root/install-theme.sh --dry-run --apply-brand   # shows what would be applied, changes nothing
/root/install-theme.sh --apply-brand             # applies it; the theme folder is backed up first
```
`--new-brand` never overwrites anything: it refuses when `local/brand/` already exists, and when `local/brand` is the
one-line choice file written by `--brand <id>` it says so and asks you to remove that file first
(`rm …/themes/danke/local/brand`); the panel keeps its current look until you apply the new brand. The kit holds
placeholder artwork ("Your logo") — until you replace it, that is what `--apply-brand` (and the next theme update)
would show.

The folder, by hand:
```
local/brand/
  brand.json            { "name": "Acme Hosting", "short_name": "Acme", "logo": "files", "accent": "#0B6E4F", "credit": true }
  logo.svg              full logo for LIGHT mode (shown 44 px high in the menu panel, 60 px on the login page)   — needed
  logo-dark.svg         full logo for DARK mode (on dark navy)                 — optional, falls back to logo.svg
  icon.svg              square icon in colour: browser tab, top bar on phones  — needed
  icon-rail.svg         WHITE / light icon for the dark icon rail, 30 px       — optional, falls back to icon.svg
  favicon.ico, favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png,
  android-chrome-192x192.png, android-chrome-512x512.png, mstile-150x150.png   — optional (icon.svg is used as favicon)
  credit-icon.svg, credit-icon-dark.svg                                         — optional, 16 px mark next to the credit
```
```bash
mkdir -p /root/my-brand && cd /root/my-brand            # prepare brand.json + files here, then:
rm -f /usr/local/ispconfig/interface/web/themes/danke/local/brand      # a one-line choice file, if there is one
mkdir -p /usr/local/ispconfig/interface/web/themes/danke/local/brand
cp brand.json *.svg *.png *.ico /usr/local/ispconfig/interface/web/themes/danke/local/brand/ 2>/dev/null
/root/install-theme.sh --dry-run --apply-brand
/root/install-theme.sh --apply-brand
```
`brand.json` keys — all optional except `name` when you bring your own logo:

| Key | Meaning |
|---|---|
| `name` | brand name: browser tab title, logo `alt` texts, footer, login page. Plain text, none of `< > { } ' "`. Empty = taken from ISPConfig (only with `"logo": "core"`). |
| `short_name` | home-screen name on phones (default: `name`). |
| `logo` | `"files"` (default) = the logo / icon files of the profile · `"core"` = the logo and favicons of the ISPConfig installation (like `neutral`), e.g. to keep ISPConfig's logo but set your own name and colour. |
| `accent` | one colour `#RRGGBB` for buttons, links and the active menu item; lighter / darker shades are derived from it. Leave it out to keep the theme's blue. Check that white text is readable on it. |
| `rail` | optional: background colour `#RRGGBB` of the icon rail. The rail is dark in both modes and its texts and icons stay light, so the colour must be dark: a colour on which the rail text would have a contrast below 4.5 : 1 is **refused** with a message that names the measured contrast — nothing is changed. Leave it out to keep the theme's navy. |
| `credit` | `true` (default) / `false` — the small credit line in the footer and below the login card. |
| `credit_style` | wording of the credit: `"designer"` (default) = "Designed by AIDGeeks" · `"product"` = "Danke theme · by AIDGeeks" (what `neutral` uses). |

Only these file names are read, only regular files (no symbolic links), and only by `install-theme.sh` — the
running panel never reads `local/` or `brands/`; it uses the generated files `assets/brand/*` and
`templates/brand_*.htm`. Do not edit those two places: the next update or `--apply-brand` writes them again.
While `local/brand/` is a folder, `--brand <id>` refuses to run (your files are never overwritten); move the folder
away to go back to a shipped profile.

### The credit
A small credit line is shown in the footer and below the login card. Its wording depends on the profile:
- `neutral`: **"Danke theme · by AIDGeeks"** — "Danke" links to the theme's project page, "AIDGeeks" to
  https://aidgeeks.com. Text only: no image, and nothing is loaded from either address (they are plain links).
- a profile with its own brand: **"Designed by AIDGeeks"** (linking to https://aidgeeks.com), unless its `brand.json`
  says `"credit_style": "product"`.

It can be switched
- per profile: `"credit": false` in its `brand.json`;
- per server, whatever the profile says: `echo off > themes/danke/local/credit` (or `on`), then
  `/root/install-theme.sh --apply-brand`.

The address of the project page is one setting, `projectUrl` in `themes/danke/assets/javascripts/danke-early.js`.

## Uninstall
```bash
/root/uninstall-theme.sh --dry-run        # shows every step, changes nothing
/root/uninstall-theme.sh
```
The script
1. **stops** if `$conf['theme']` is still `danke` in `interface/lib/config.inc.php` or `server/lib/config.inc.php`
   (the login page would load a theme that is gone) and prints the exact command to set it back to `default`.
   `/root/uninstall-theme.sh --reset-default` makes exactly that one edit for you — backup first, diff printed,
   owner and mode of the file unchanged (`set-user-theme.sh --set-default default --apply` beforehand does the
   same);
2. copies `themes/danke` (including `local/`) to `/root/danke-theme-backup-<timestamp>/danke`, then removes it;
3. does **not** touch the database: users whose Design is `danke` get `default` at their next login (ISPConfig
   checks at login that the theme folder exists — true for 3.3.1p1, 3.3.2p1 and 3.3.3p2). Their setting stays stored,
   so re-installing gives them the theme back. The script prints how many users that are (one read-only
   `SELECT COUNT(*)`; skipped if the database cannot be reached);
4. prints how to roll back / re-install.

`--theme <id>` removes the folder `themes/<id>` instead of `themes/danke` — for a release of this theme that was
installed under another folder name. Same steps, same safety stop; a folder that is not a release of this theme is
refused.

**Uninstall at a quiet time.** A session that is open during the uninstall keeps naming the removed theme and stays
broken until it ends: the panel shows the default layout, every `/themes/danke/…` file answers 404, the console
says "ISPConfig is not defined" — and the **Logout button does not work** in that state. Anyone still logged in:

1. open `https://<panel>:8080/login/logout.php` once — it ends the session; the page only shows the text
   `URL_REDIRECT:index.php` (it is an AJAX endpoint, that is normal);
2. then open `https://<panel>:8080/login/` and log in again — now with the `default` theme.

(Closing the browser or waiting for the session timeout works too. The script prints the same two addresses.)

The hand-edit command the script prints when it stops writes the value like core does: `$conf['theme'] = 'default';`.

By hand it is the same three things, in this order: `$conf['theme']` back to `default` (if you had set it) →
`cp -a` the folder to `/root/…` → `rm -rf /usr/local/ispconfig/interface/web/themes/danke`.

## Updating to a newer release of the theme
A new release replaces `themes/danke` in place — no user or database change is needed, and `local/` (brand choice,
own brand, credit switch) is carried over.
```bash
sha256sum -c danke-theme-*.tar.gz.sha256
/root/install-theme.sh --dry-run /root/danke-theme.tar.gz
/root/install-theme.sh /root/danke-theme.tar.gz      # backs up the old folder to /root/danke-theme-backup-<timestamp>/danke
```
Use the `install-theme.sh` / `uninstall-theme.sh` that came with the new release. Then reload the panel. Since
release 1.0.0 every file the theme loads (scripts, stylesheets, logos, icons) carries the release's version in its
address (`?ver=…`, from the one file `templates/asset_ver.htm`), so a normal reload is enough — also when the
release before was an older one: the new page asks for a new address for every file. (Ctrl+F5 is only needed if the
browser still shows the old page itself.)

## Rollback
- **Back to the theme folder that was there before an install / update** (every install backs it up):
  ```bash
  ls -d /root/danke-theme-backup-*
  /root/install-theme.sh --dry-run --rollback /root/danke-theme-backup-YYYYMMDD-HHMMSS
  /root/install-theme.sh --rollback /root/danke-theme-backup-YYYYMMDD-HHMMSS
  ```
  The current folder is backed up first (if there is none — e.g. after an uninstall — the script says so and does
  not mention a "folder that was there before"); nothing but `themes/danke` is touched. The **current** `local/`
  stays (the brand of this server does not change by a rollback; after an uninstall the `local/` of the backup comes
  back with the folder). A backup made by a *first* install contains no theme folder — `--rollback` refuses it and
  points to `uninstall-theme.sh`.
- **Back to an older release:** install its package again.
- **Undo an uninstall:** `/root/install-theme.sh --rollback <the backup the uninstall printed>` — users with Design
  `danke` have the theme again at their next login.
- **No theme at all:** `uninstall-theme.sh` (above).

After any of these: users log out and in, or reload with Ctrl+F5.

## Switching existing users
ISPConfig stores the theme in three places, and they do different things:

| Where | What it decides |
|---|---|
| `$conf['theme']` in `config.inc.php` (step 6) | the **login page**, and the theme of users that are created **from now on**. It never changes an existing user. |
| `sys_user.app_theme` — the **Design** field in *Tools → User Settings* (and *System → CP Users*) | the theme a user gets **at login**. This is the one that counts. |
| `client.usertheme` — the **Design** field in *Client → Edit Client* | copied to the login theme **only when the client is created**. Changing it later for an existing client is stored, but the login keeps using the old theme. |

The last line is ISPConfig's behaviour (3.3.1p1 – 3.3.3p2), not the theme's: `interface/web/client/client_edit.php`
writes `app_theme` in `onAfterInsert()` and, in `onAfterUpdate()`, carries user name, password, language and modules
over to the login user — but not the theme. So a client can show `danke` in *Edit Client* and still log in with
`default`.

One more trap: when a user's stored theme **no longer exists** (its folder was removed), the Design list in
*Tools → User Settings* has no entry for it and the browser shows the **first** theme of the list as if it were
selected. The form looks set, but nothing is stored until that user saves.

What does change the theme of an existing user:
1. **The user**: Tools → User Settings → Design → Save (the page reloads with the new theme).
2. **The admin, for a client**: Client → Clients → "login as" → Tools → User Settings → Design → Save.
3. **The helper `set-user-theme.sh`** — for several users at once, or to see who is on what.

### The helper: `set-user-theme.sh`
A separate, optional tool; run it as root on the panel server. It reads ISPConfig's own database credentials from
`/usr/local/ispconfig/interface/lib/config.inc.php` (the password is never printed), and for users it touches only
the two columns `sys_user.app_theme` and `client.usertheme` — no files, no other table. (`$conf['theme']` is changed
only by its separate mode `--set-default`, below.) **Without `--apply` it changes nothing**: it prints the affected
users and the exact SQL.

Always look first:
```bash
cd /root && chmod +x set-user-theme.sh
./set-user-theme.sh --list
```
```
USERID  USERNAME   TYP    LOGIN THEME          CLIENT DESIGN        FLAG      THEME FOLDER
                          (sys_user.app_theme) (client.usertheme)             (of the login theme)
1       admin      admin  danke                -                    -         ok
2       alice      user   danke                danke                -         ok
3       bob        user   default              danke                MISMATCH  ok
4       carol      user   oldtheme             oldtheme             -         MISSING
```
`MISMATCH`: *Edit Client* says one theme, the login uses another (the case described above). `MISSING` /
`INCOMPATIBLE` / `INVALID`: the login theme has no usable folder — that user gets `default` at login.

Then choose one of these (each is a **dry run** until you add `--apply`):
```bash
# make the login theme follow what Client → Edit Client says (only rows flagged MISMATCH)
./set-user-theme.sh --sync-from-client
./set-user-theme.sh --sync-from-client --apply

# set a theme for named users / for every client user / for everybody (admins included)
./set-user-theme.sh --set danke --users bob,carol
./set-user-theme.sh --set danke --clients-only
./set-user-theme.sh --set danke --all
./set-user-theme.sh --set danke --users bob,carol --apply       # asks: type yes
./set-user-theme.sh --set default --all --apply --yes           # no question (for scripts) — e.g. before an uninstall
```
- The target theme must be `default` or an installed, compatible folder below `interface/web/themes/`; anything else
  is refused before the database is opened. `--set` also writes `client.usertheme` for client users, so both places
  stay in step.
- `--apply` first writes a `mysqldump` of the tables `sys_user` and `client` to
  `/root/danke-user-theme-backup-<timestamp>.sql` (mode 600) and prints the restore command
  (`mysql <database> < <file>`; it puts both tables back to that moment). No backup → no change.
  The dump runs with `--single-transaction --no-tablespaces`, because ISPConfig's database user has neither the
  LOCK TABLES nor the PROCESS privilege. (The helper of r14 did not pass `--single-transaction`: there `--apply`
  stops with `mysqldump: Got error: 1044 … when doing LOCK TABLES` and changes nothing — use the current script.)
- The new theme is used at each user's **next login**; a session that is open keeps its theme until it ends.
- Exit codes: `0` done / dry run / nothing to do · `1` error (ISPConfig, credentials, mysql client, query or backup;
  for `--set-default` a config file that cannot be edited safely) · `2` wrong usage or not a theme name · `3` target
  theme missing or incompatible · `4` not confirmed with `yes` · `5` a name given to `--users` does not exist. In
  every case but `0` after `--apply` nothing was changed, except exit `1` with the message "the change failed" (then
  check with `--list`; the backup is named).
- `./set-user-theme.sh --help` prints all of this.

### The global default: `set-user-theme.sh --set-default <theme>`
The same helper can set `$conf['theme']` (step 6) — the login page and the theme of users without one of their own.
```bash
./set-user-theme.sh --set-default danke                      # dry run
./set-user-theme.sh --set-default danke --apply              # asks: type yes   (--yes: no question)
./set-user-theme.sh --set-default default --apply            # back to ISPConfig's theme, e.g. before an uninstall
./set-user-theme.sh --sync-from-client --set-default danke --apply     # users and default in one run
```
- It edits **one line in two files**: the value of `$conf['theme'] = '…';` in `interface/lib/config.inc.php` and
  `server/lib/config.inc.php`. Nothing else in those files, no other file, and — when given alone — no database
  access at all. The value is written with single quotes, as ISPConfig writes it.
- **Refused (exit 3)** when the theme is not `default` and its folder below `interface/web/themes/` is missing or
  not compatible with the installed ISPConfig — same rule as ISPConfig's `theme_is_compatible()`: same major.minor
  in the theme's `ispconfig_version`; on ISPConfig 3.3.1 and older the exact version. The login page uses
  `$conf['theme']` without a check, so a wrong value would break it for everybody. `default` is always allowed.
- **Dry run by default**: for each file it shows the current line and the exact new line. `--apply` asks for `yes`.
- Before writing, each file is copied to `/root/danke-config-backup-<timestamp>/` (owner and mode kept). The new
  content is written into the existing file, so its owner and mode stay as ISPConfig set them. Afterwards the script
  prints the diff and the restore commands (`cat <backup> > <file>`).
- Both files already have the value → "already set", nothing is changed and no backup is written. A file with no
  active `$conf['theme']` line, or more than one, is not edited (exit 1) — set the value by hand then. A
  `config.inc.local.php` that sets the theme wins over `config.inc.php`; the script says so and does not edit it.
- **Order in a combined run** (`--set …` or `--sync-from-client` together with `--set-default`): everything is
  checked first; then the database step (its own backup, as above); the config files are changed **only after the
  database step succeeded** or had nothing to do. If the database step fails, the config files are not touched. If
  the config step fails afterwards, the files are put back from their backup and the database change stays — its
  restore command has been printed.
- ISPConfig's updater keeps the value (`update.php` copies the old `$conf['theme']` into the new `config.inc.php`),
  so it survives ISPConfig updates. The uninstall's `--reset-default` is unchanged and still works on its own.

## Behind Cloudflare (or another reverse proxy): port 8080
If the panel's host name is **proxied by Cloudflare** (orange cloud), `https://panel.example.com:8080` fails from
outside although the server is fine: the browser reports `SSL_ERROR_RX_RECORD_TOO_LONG`, `openssl s_client` says
`wrong version number`. Reason: on Cloudflare 8080 is an **HTTP-only** port — Cloudflare answers there in plain
HTTP, whatever the server behind it speaks. Nothing is wrong with ISPConfig or the theme, and nothing on the server
needs fixing. Two ways out:
- set the panel's DNS record to **"DNS only"** (grey cloud) and keep using `https://panel.example.com:8080`; or
- keep the proxy, add an **Origin Rule** (host name equals `panel.example.com` → destination port **8080**), set
  SSL/TLS to **Full (strict)** (the server needs a certificate Cloudflare accepts), and open
  `https://panel.example.com` **without a port**.

Wherever this guide writes `https://<panel>:8080/…`, use your own address in the second case.

## Forcing the theme language
The theme's own texts (about 35 strings) exist in English and Portuguese. By default Portuguese is used when the
user's ISPConfig language is *Português (Brasil)*. To force Portuguese (or English) for everybody, edit
`themes/danke/assets/javascripts/danke-early.js`:
```js
window.DK_CONFIG = window.DK_CONFIG || {
  lang: 'pt',            // 'auto' | 'pt' | 'en'
  …                      // leave the other keys as they are
};
```
(An update of the theme replaces this file — set it again afterwards.)

## Updating ISPConfig
ISPConfig updates (`ispconfig_update.sh`) never delete `themes/danke`, they re-apply `chown/chmod` to it, and they
keep the `$conf['theme']` line of `config.inc.php` as it was. ISPConfig (3.3.2 and newer) only compares
*major.minor* (3.3), so the theme keeps loading on 3.3.x. The theme does not carry a copy of ISPConfig's
JavaScript — the pages load it from `themes/default`, so it always matches the installed release.

**Checklist — after updating ISPConfig underneath Danke** (5 minutes; before anything else is changed):
```bash
ls -d /usr/local/ispconfig/interface/web/themes/danke                      # 1. the theme folder is still there
grep -n "conf\['theme'\]" /usr/local/ispconfig/interface/lib/config.inc.php /usr/local/ispconfig/server/lib/config.inc.php
                                                                           # 2. the global default is what it was
grep -n "ISPC_APP_VERSION" /usr/local/ispconfig/interface/lib/config.inc.php   #    … and this is the new version
```
3. Open the **login page** in a private window: it loads in the theme the global default names, without a
   missing-style look.
4. Log in with a user who has Design = `danke`: the **panel** loads; open Home, one list, one form, Monitor. In the
   browser's developer tools (Network): **no 404**, no error in the console.
5. **Reinstall the current theme package** — same commands as an update of the theme, your `local/` folder is kept:
   ```bash
   /root/install-theme.sh --dry-run /root/danke-theme.tar.gz
   /root/install-theme.sh /root/danke-theme.tar.gz
   ```
   The installer checks the new ISPConfig version against `TESTED-VERSIONS.md` (a warning, not a stop, when it is
   not listed). On a server that came from ISPConfig 3.3.1 this step also **puts the package's own
   `ispconfig_version` file back**: on 3.3.1 the installer had written the exact version into the installed copy
   (see "4. Install"); 3.3.2 and newer do not need that, and the reinstall removes the leftover
   (`ispconfig_version.theme` is gone afterwards).
6. `/root/set-user-theme.sh --list` — every user still has the theme they had; no user points at a missing folder.
7. Reload the panel once with Ctrl+F5.

If something looks wrong after the update: set that user's Design back to `default` (Tools → User Settings), or for
everybody `/root/set-user-theme.sh --set-default default --apply`, and look for a newer release of the theme. A
release that is not in `TESTED-VERSIONS.md` yet: check it with one user first.

`install-theme.sh` does not need the exact version: it refuses only another major.minor and warns when the installed
version is not in `TESTED-VERSIONS.md`.
