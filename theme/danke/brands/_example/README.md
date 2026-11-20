# Your own brand — starter kit

This folder is a starting point for your own brand in the Danke theme. It is **not** a selectable profile and is
never applied by itself. Copy it to this server's own folder and edit the copy:

```bash
./install-theme.sh --new-brand                 # copies this folder to themes/danke/local/brand/
# edit themes/danke/local/brand/brand.json, replace the four SVG files
./install-theme.sh --dry-run --apply-brand     # shows what would be applied, changes nothing
./install-theme.sh --apply-brand               # applies it (the theme folder is backed up first)
```

`themes/danke/local/` is carried over by every theme update, so your brand stays.

## The files

| File | Where it is shown | Size and rules |
|---|---|---|
| `logo.svg` | menu panel and login card, **light** mode | wide logo, about 4 : 1 (the placeholder is 180 × 44). Shown 44 px high in the panel (at most 180 px wide) and 60 px high on the login card. Dark text on a light background. Required |
| `logo-dark.svg` | the same places in **dark** mode | same size as `logo.svg`, light text for a dark background. Optional — without it `logo.svg` is used in both modes |
| `icon.svg` | browser tab (favicon) and the top bar on phones | square (the placeholder is 64 × 64), shown at 16 – 32 px: keep it simple, readable on light and dark backgrounds. Required |
| `icon-rail.svg` | top of the dark icon rail | square, shown at 30 × 30 px on a dark background in both modes: use a white or light version of the icon. Optional — without it `icon.svg` is used |

All four are plain SVG files with a `viewBox`; they are shown with `<img>`, so scripts and external references inside
an SVG do not run. Text inside an SVG is drawn with the visitor's fonts — convert the text of your logo to paths.

Optional PNG favicons for older browsers and home-screen icons, used when present (same file names as below):
`favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` (180 × 180),
`android-chrome-192x192.png`, `android-chrome-512x512.png`, `mstile-150x150.png`.
Files with other names are ignored.

## brand.json

```json
{
  "name": "My Hosting",
  "short_name": "My Hosting",
  "logo": "files",
  "accent": "#1F6FAF",
  "credit": true
}
```

| Key | Meaning |
|---|---|
| `name` | the brand name: page title, alt text of the logos, footer ("My Hosting · powered by ISPConfig"), login page. Must not contain `< > { } ' "`; write `&amp;` for `&`. Required with `"logo": "files"` |
| `short_name` | short form for home-screen icons (only used when PNG favicons are present). Default: `name` |
| `logo` | `"files"` (default) = the SVG files of this folder. `"core"` = keep the logo and favicons of the ISPConfig installation and only set name and colours |
| `accent` | the accent colour as `#RRGGBB` (buttons, links, active menu item); lighter and darker shades are derived from it. Leave the key out to keep the theme's own palette. Pick a colour on which white text is readable |
| `rail` | optional: background of the icon rail as `#RRGGBB`. The rail is dark in both modes and its text and icons stay light, so the colour must be dark: a colour on which the rail text would have a contrast below 4.5 : 1 is refused with a message, and nothing is changed |
| `credit` | `true` / `false`: the small maker credit in the footer and below the login card. A file `local/credit` holding `on` or `off` overrides it for this server |
| `credit_style` | wording of the credit: `"designer"` (default) = "Designed by AIDGeeks", `"product"` = "Danke theme · by AIDGeeks" |

The placeholder files of this kit are simple shapes made for this theme; replace them with your own artwork.
