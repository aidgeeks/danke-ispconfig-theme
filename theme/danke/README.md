# danke — Danke, a modern theme for ISPConfig 3.3.x

Install path: `/usr/local/ispconfig/interface/web/themes/danke` (owner `ispconfig:ispconfig`, mode 750 like `default`).
The theme only adds this folder; it changes nothing else in the ISPConfig installation.
`ispconfig_version` names the **latest supported ISPConfig release** (`3.3.3p2`). ISPConfig 3.3.2 and newer accept the
theme on every 3.3.x (major.minor check); ISPConfig 3.3.1p1 wants the exact version in that file — `install-theme.sh`
takes care of it. Tested versions: `TESTED-VERSIONS.md`. Otherwise ISPConfig silently falls back to `default`.

## What is ours, what is copied, what is generated
| Path | Origin |
|---|---|
| `templates/main.tpl.htm`, `main_login.tpl.htm`, `topnav.tpl.htm`, `sidenav.tpl.htm`, `tabbed_form.tpl.htm` | theme overrides (shell with icon rail + module menu panel, pinned footer, navigation with an icon element per menu item, tab chrome) |
| `templates/asset_ver.htm` | **the one version** (`<public version>-<package release>`, one line without a line break). Both shells and every brand piece print it into the address of every theme file they load (`…?ver=<version>`: boot script, script, all stylesheets, logos, icons, favicons), so browsers fetch the new files after an update. Changed once per release; never write a version number into a template by hand |
| `templates/dashboard/dashboard.htm`, `limits.htm`, `modules.htm` | theme overrides (dashboard + dashlets; `modules.htm` intentionally renders nothing) |
| `brands/<id>/` | **brand profiles**: `brand.json` (name, logo kind, colour accent, credit) and, if the profile has its own artwork, logo / icon / favicon files. `brands/default` names the default profile of this package; `brands/_fragments/` holds the template pieces a profile is turned into; `brands/_example/` is the starter kit for an own brand (`install-theme.sh --new-brand` copies it to `local/brand/`) — folders starting with `_` are never selectable profiles |
| `local/` (only on a server) | **this server's own choices**: `local/brand` (a profile id, or a folder with an own profile), `local/credit`. Carried over by every update |
| `templates/brand_*.htm`, `assets/brand/*` | **generated** by `install-theme.sh` from the active profile (name, favicon links, logos, footer, credit; images, `accent.css`, `active.txt`). Do not edit — they are written again by every install, update and `--apply-brand` |
| `assets/stylesheets/danke/{palette,tokens,fonts,danke}.css` | design system (`palette.css` = raw colours, `tokens.css` = the roles everything else uses) |
| `assets/javascripts/danke-early.js` | no-flash light/dark + navigation state, and `DK_CONFIG` (language, credit texts / link, `projectUrl` = the project page the credit "Danke theme · by AIDGeeks" links to, `friendlyLabels`, `history`, `syncModule`) |
| `assets/javascripts/danke.js` | everything the theme does in the browser: theme toggle, rail + menu panel + drawer, breadcrumb, menu labels and icons, navigation control, Home panel, Back/Forward/reload state, EN/PT texts, badges, dashboard cards, chart colours, login-flow and form tidy-ups |
| ISPConfig's own scripts (`ispconfig.js`, `bootstrap.min.js`, `bootstrap-datetimepicker.min.js`, `modernizr.custom.min.js`, `responsive.min.js`) | **not in this folder** — both shells load them from `themes/default/assets/javascripts/`, so they always match the installed ISPConfig |
| `assets/fonts/inter`, `assets/fonts/jetbrains-mono` | Inter / JetBrains Mono variable woff2 (SIL OFL 1.1) |
| everything else in `assets/` | unchanged copies from ISPConfig 3.3.3p2 `themes/default/assets` — **CSS, icon fonts and images only** (Bootstrap 3.3 CSS, `ispconfig.css`, select2 css, icon fonts …): the visual baseline the theme's CSS is written against |
| `TESTED-VERSIONS.md` | which ISPConfig versions this theme was tested with (read by the installer; information, not a gate) |

Templates not listed fall back to `themes/default/templates` automatically.
Installing, updating, brand profiles, uninstalling: `INSTALL.md` of the theme project.
