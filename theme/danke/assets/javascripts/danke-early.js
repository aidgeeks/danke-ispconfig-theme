/*
 * Danke — early boot (loaded synchronously in <head>, before any stylesheet).
 * Decides light/dark before the first paint so there is no flash of the wrong theme.
 *
 * ---------------------------------------------------------------------------
 * CONFIGURATION — behaviour switches of the theme. Logo, name, colour accent and the credit switch are NOT here:
 * they belong to the brand profile (brands/<id>/ or this server's local/ folder) and are applied by
 * install-theme.sh — see INSTALL.md, "Brand profiles".
 *   lang        'auto' → Portuguese when the ISPConfig UI language is Portuguese (Brazil "br"),
 *               English otherwise.  'pt' → always Portuguese, 'en' → always English.
 *   brandName   '' (default) → the brand name is what the SERVER printed from the brand profile (page <title>,
 *               logo texts, footer, login page — correct before any script runs). A non-empty value here only
 *               overrides it after the page has loaded (the tab title would change visibly) — leave it empty.
 *   creditText  maker credit shown small in the footer and below the login card (EN / PT) — the wording of brand
 *               profiles with "credit_style": "designer" (the default).
 *   creditProductText  the wording of profiles with "credit_style": "product" (the profile "neutral"):
 *               {product} = the theme's name, linked to projectUrl; {maker} = the maker's name, linked to creditUrl.
 *   projectUrl  the project page of the theme ("Danke" in the product credit links to it). THE ONE PLACE to change
 *               it once the project has its public page; '' = no link.
 *   showCredit  false hides the credit by script. Prefer the server-side switch ("credit" in brand.json, local/credit).
 *   creditUrl   the credit (in the product wording: the maker's name) links to this address (new tab, rel="noopener noreferrer"; a plain link — nothing is
 *               loaded from it). '' = plain text without a link.
 *   friendlyLabels  true → the module menu shows clear names ("Clients", "New client") instead of ISPConfig's
 *               "Edit Client" (= the list) / "Add Client". Display only; false shows ISPConfig's own texts.
 *   history     true → browser Back/Forward move between the pages opened inside the panel and a reload reopens
 *               the page you were on (only plain list/edit/view pages, never actions). false = ISPConfig's own
 *               behaviour (Back leaves the panel, reload opens the module's start page).
 *   syncModule  true → when a link inside the content opens a page of another module, the rail and the module
 *               menu follow (the same request a click on the module icon sends). false = menus stay as they were.
 * ---------------------------------------------------------------------------
 */
window.DK_CONFIG = window.DK_CONFIG || {
  lang: 'auto',
  brandName: '',
  creditText: { en: 'Designed by AIDGeeks', pt: 'Desenvolvido por AIDGeeks' },
  creditProductText: { en: '{product} theme · by {maker}', pt: 'Tema {product} · por {maker}' },
  showCredit: true,
  creditUrl: 'https://aidgeeks.com',
  projectUrl: 'https://github.com/aidgeeks/danke-ispconfig-theme',
  friendlyLabels: true,
  history: true,
  syncModule: true
};

(function () {
  var d = document.documentElement, t = null, c = window.DK_CONFIG || {};
  // Releases before r13 stored the same choices under another key prefix. Read those once and move them over, so
  // nobody loses the light/dark choice or the collapsed menu by the update. (The old prefix is spelled in two parts
  // on purpose: it is not a name of this theme any more.)
  try {
    var ls = window.localStorage, old = 's' + 'gh-';
    ['theme', 'panel'].forEach(function (k) {
      var v = ls.getItem(old + k);
      if (v !== null) { if (ls.getItem('dk-' + k) === null) ls.setItem('dk-' + k, v); ls.removeItem(old + k); }
    });
  } catch (e) { /* storage disabled */ }
  try { t = window.localStorage.getItem('dk-theme'); } catch (e) { t = null; }
  if (t !== 'light' && t !== 'dark') {
    var dark = false;
    try { dark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); } catch (e) { dark = false; }
    t = dark ? 'dark' : 'light';
    d.setAttribute('data-theme-source', 'system');
  } else {
    d.setAttribute('data-theme-source', 'user');
  }
  d.setAttribute('data-theme', t);
  // navigation layout known before the first paint (no jump): was the module menu panel collapsed by the user?
  // Every module has a panel (Home too, since fix round 5); "0" only if the last module really had no menu.
  try { if (window.localStorage.getItem('dk-panel') === 'collapsed') d.setAttribute('data-dk-panel', 'collapsed'); } catch (e) { /* storage disabled */ }
  try { d.setAttribute('data-dk-menu', window.sessionStorage.getItem('dk-menu') === '0' ? '0' : '1'); } catch (e) { d.setAttribute('data-dk-menu', '1'); }
  if (c.showCredit === false) d.setAttribute('data-dk-credit', 'off');   // CSS hides [data-dk-credit] elements
  // The page title is rendered by the server (templates/brand_name.htm) since fix round 8 — no title change here,
  // unless someone set an explicit brandName override above.
  if (c.brandName) { try { document.title = c.brandName; } catch (e) { /* keep the server title */ } }
})();
