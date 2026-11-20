/*
 * Danke — theme "danke" — UI behaviour for ISPConfig 3.3.x (latest tested: see TESTED-VERSIONS.md).
 * ("dk" / "DK" in file, class and variable names is only an internal prefix, not a brand.)
 * Purely additive: never changes form fields, names, CSRF inputs or ISPConfig handlers.
 * Hooks used: ISPConfig.registerHook('onAfterContentLoad') (public API), DOM observers on #topnav-container /
 * #sidebar (filled by ISPConfig.loadMenus()), jQuery's global ajaxSend / ajaxComplete (which navigation requests are
 * running; an older one is aborted when the user asks for something new — "navigation control" below),
 * thin wrappers around ISPConfig.loadContent / ISPConfig.capp (same arguments, same result; they only tell the
 * navigation control that the user asked for a new page), a jQuery.ajaxPrefilter that only DELAYS ISPConfig's own
 * success handlers of a module switch until menu + page have both arrived ("atomic switch", fix round 5), and the
 * browser History API (state only, the address stays index.php).
 * ISPConfig's own scripts (ispconfig.js, bootstrap, datetimepicker, modernizr, responsive) are loaded from
 * themes/default — this theme ships no copy of them (fix round 10); the one behaviour change the theme wants from
 * core's combo boxes (no select-on-blur) is made here, see "select2: no select-on-blur".
 * Requires jQuery (loaded by the shell before this file).
 */
(function (window, document, $) {
  'use strict';
  if (!$) return;

  var root = document.documentElement;

  /* ------------------------------------------------------------------ i18n */
  // New visible text added by the theme, in English and Portuguese. Edit here only.
  var STRINGS = {
    en: {
      'skip': 'Skip to content',
      'nav.label': 'Navigation',
      'nav.modules': 'Modules',
      'nav.open': 'Open menu',
      'nav.close': 'Close menu',
      'nav.toggle': 'Show or hide the menu',
      'nav.menu': 'Menu',
      'crumbs.label': 'You are here',
      'crumbs.more': 'Show the full path',
      'crumbs.loginas': 'Login as',
      'crumbs.relogin': 'Re-login',
      'list.filters': 'Filters',
      'list.rows': 'Rows per page',
      'theme.toggle': 'Toggle dark mode',
      'theme.light': 'Light mode',
      'theme.dark': 'Dark mode',
      'theme.system': 'Use system setting',
      'user.signedin': 'Signed in as',
      'login.title': 'Sign in to your control panel',
      'login.sub': 'Manage your websites, email, domains and databases.',
      'login.secure': 'Secure connection',
      'powered': 'powered by',
      'dash.eyebrow': 'Overview',
      'dash.quick': 'Quick actions',
      'dash.status': 'Server status',
      'dash.status.open': 'Open Monitor',
      'dash.status.all_ok': 'All servers are running normally.',
      'dash.status.attention': 'servers need attention',
      'dash.status.attention1': 'server needs attention',
      'dash.status.details': 'Details',
      'state.ok': 'OK',
      'state.info': 'Info',
      'state.warning': 'Warning',
      'state.critical': 'Critical',
      'state.error': 'Error',
      'state.unknown': 'Unknown',
      'count.unknown': 'unknown', 'count.unknown1': 'unknown',
      'count.info': 'notices', 'count.info1': 'notice',
      'count.warning': 'warnings', 'count.warning1': 'warning',
      'count.critical': 'critical', 'count.critical1': 'critical',
      'count.error': 'errors', 'count.error1': 'error',
      'dash.news': 'Latest news',
      'qa.website': 'New website',
      'qa.mailbox': 'New mailbox',
      'qa.database': 'New database',
      'qa.dnszone': 'New DNS zone',
      'qa.client': 'New client',
      'limits.showall': 'Show all limits',
      'limits.showkey': 'Show main resources',
      'home.account': 'Account',
      'home.settings': 'User settings',
      'home.logout': 'Logout',
      'nav.failed': 'The page could not be loaded. Nothing was changed \u2014 please try again.',
      'saved': 'Saved.',
      'dns.add': 'Add record',
      'dns.add.choose': 'Add record\u2026',
      'dns.more': 'More',
      'dns.more.label': 'More record types',
      'login.caps': 'Caps Lock is on',
      'reset.email.required': 'Enter your email address',
      'reset.email.invalid': 'Enter a valid email address',
      'reset.user.required': 'Enter your user name'
    },
    pt: {
      'skip': 'Ir para o conteúdo',
      'nav.label': 'Navegação',
      'nav.modules': 'Módulos',
      'nav.open': 'Abrir menu',
      'nav.close': 'Fechar menu',
      'nav.toggle': 'Mostrar ou ocultar o menu',
      'nav.menu': 'Menu',
      'crumbs.label': 'Está aqui',
      'crumbs.more': 'Mostrar o caminho completo',
      'crumbs.loginas': 'Entrar como',
      'crumbs.relogin': 'Voltar a entrar',
      'list.filters': 'Filtros',
      'list.rows': 'Linhas por página',
      'theme.toggle': 'Alternar modo escuro',
      'theme.light': 'Modo claro',
      'theme.dark': 'Modo escuro',
      'theme.system': 'Seguir o sistema',
      'user.signedin': 'Sessão iniciada como',
      'login.title': 'Entrar no seu painel de controlo',
      'login.sub': 'Gira os seus sites, e-mail, domínios e bases de dados.',
      'login.secure': 'Ligação segura',
      'powered': 'com tecnologia',
      'dash.eyebrow': 'Visão geral',
      'dash.quick': 'Ações rápidas',
      'dash.status': 'Estado dos servidores',
      'dash.status.open': 'Abrir Monitor',
      'dash.status.all_ok': 'Todos os servidores estão a funcionar normalmente.',
      'dash.status.attention': 'servidores precisam de atenção',
      'dash.status.attention1': 'servidor precisa de atenção',
      'dash.status.details': 'Detalhes',
      'state.ok': 'OK',
      'state.info': 'Info',
      'state.warning': 'Aviso',
      'state.critical': 'Crítico',
      'state.error': 'Erro',
      'state.unknown': 'Desconhecido',
      'count.unknown': 'desconhecidos', 'count.unknown1': 'desconhecido',
      'count.info': 'informações', 'count.info1': 'informação',
      'count.warning': 'avisos', 'count.warning1': 'aviso',
      'count.critical': 'críticos', 'count.critical1': 'crítico',
      'count.error': 'erros', 'count.error1': 'erro',
      'dash.news': 'Últimas notícias',
      'qa.website': 'Novo site',
      'qa.mailbox': 'Nova caixa de correio',
      'qa.database': 'Nova base de dados',
      'qa.dnszone': 'Nova zona DNS',
      'qa.client': 'Novo cliente',
      'limits.showall': 'Mostrar todos os limites',
      'limits.showkey': 'Mostrar recursos principais',
      'home.account': 'Conta',
      'home.settings': 'Defini\u00e7\u00f5es do utilizador',
      'home.logout': 'Sair',
      'nav.failed': 'N\u00e3o foi poss\u00edvel carregar a p\u00e1gina. Nada foi alterado \u2014 tente novamente.',
      'saved': 'Guardado.',
      'dns.add': 'Adicionar registo',
      'dns.add.choose': 'Adicionar registo\u2026',
      'dns.more': 'Mais',
      'dns.more.label': 'Mais tipos de registo',
      'login.caps': 'O Caps Lock est\u00e1 ativo',
      'reset.email.required': 'Introduza o seu endere\u00e7o de e-mail',
      'reset.email.invalid': 'Introduza um endere\u00e7o de e-mail v\u00e1lido',
      'reset.user.required': 'Introduza o seu nome de utilizador'
    }
  };
  // ISPConfig passes no language code to templates; the shell exposes a few strings that
  // ISPConfig already translated (#dk-lang-probe). These are the values of ISPConfig's two Portuguese wordbooks:
  // "br" (first line) and "pt" (second line — it leaves most of the shell's strings in English, so the panel is
  // recognised by the delete question and the login page by the user name label).
  var PT_MARKERS = ['Sair', 'Pesquisar', 'Fechar', 'Acessar', 'Usuário', 'Esqueceu a senha?', 'Senha', 'Você tem certeza que deseja remover este registro?',
    'Utilizador', 'Tem a certeza que deseja remover este registo?'];

  function detectLang() {
    var cfg = (window.DK_CONFIG && window.DK_CONFIG.lang) || 'auto';
    if (cfg === 'en' || cfg === 'pt') return cfg;
    var probe = document.getElementById('dk-lang-probe');
    if (probe) {
      var vals = [probe.getAttribute('data-a'), probe.getAttribute('data-b'), probe.getAttribute('data-c'), probe.getAttribute('data-d')];
      for (var i = 0; i < vals.length; i++) {
        if (vals[i] && PT_MARKERS.indexOf($.trim(vals[i])) !== -1) return 'pt';
      }
    }
    return 'en';
  }
  var LANG = detectLang();
  function t(key) { return (STRINGS[LANG] && STRINGS[LANG][key]) || STRINGS.en[key] || key; }

  function applyI18n(scope) {
    var $s = $(scope || document);
    $s.find('[data-dk-i18n]').each(function () { this.textContent = t(this.getAttribute('data-dk-i18n')); });
    $s.find('[data-dk-i18n-attr]').each(function () {
      var el = this;
      $.each(el.getAttribute('data-dk-i18n-attr').split(';'), function (_, pair) {
        var p = pair.split(':');
        if (p.length === 2) el.setAttribute($.trim(p[0]), t($.trim(p[1])));
      });
    });
  }

  /* ------------------------------------------------------ brand + credit */
  // Brand name, credit text/switch/link come from DK_CONFIG (danke-early.js). The templates already contain the
  // defaults, so nothing flashes; this only applies a changed configuration and the PT credit text.
  // The brand NAME, logos and the credit are printed by the server from the active brand profile (the generated
  // templates/brand_*.htm), so they are right before any script runs. DK_CONFIG.brandName is '' by default (= use the server's
  // name); a non-empty value still overrides the name in the page, as before.
  function applyBrand(scope) {
    var cfg = window.DK_CONFIG || {}, $s = $(scope || document);
    if (cfg.brandName) {
      $s.find('[data-dk-brand]').text(cfg.brandName);
      $s.find('[data-dk-brand-attr]').each(function () {
        var el = this;
        $.each(el.getAttribute('data-dk-brand-attr').split(';'), function (_, a) { a = $.trim(a); if (a) el.setAttribute(a, cfg.brandName); });
      });
    }
    // A profile that takes its name from ISPConfig gets the company name the way core passes it to templates:
    // with the separator of the page title ("Acme :: "). Show the name only.
    $s.find('[data-dk-company]').each(function () { this.textContent = this.textContent.replace(/\s*::\s*$/, ''); });
    var ct = cfg.creditText, text = '';
    if (typeof ct === 'string') text = ct; else if (ct) text = ct[LANG] || ct.en || '';
    var okUrl = function (u) { return u && /^https?:\/\//i.test(u) ? u : ''; };
    $s.find('[data-dk-credit]').each(function () {
      var $c = $(this), $t = $c.find('[data-dk-credit-text]');
      if ($c.attr('data-dk-credit-style') === 'product') {
        // "Danke theme · by AIDGeeks" (brand profiles with "credit_style": "product"): the two names are printed by
        // the server; here they get their links (project page, maker) and the sentence its language.
        var pt = cfg.creditProductText, tpl = typeof pt === 'string' ? pt : (pt && (pt[LANG] || pt.en)) || (LANG === 'pt' ? 'Tema {product} · por {maker}' : '{product} theme · by {maker}');
        if (cfg.showCredit === false) { $c.prop('hidden', true); return; }
        var names = { product: $.trim($t.find('[data-dk-credit-part="product"]').text()) || 'Danke', maker: $.trim($t.find('[data-dk-credit-part="maker"]').text()) || 'AIDGeeks' };
        var urls = { product: okUrl(cfg.projectUrl), maker: okUrl(cfg.creditUrl) };
        $t.empty();
        $.each(tpl.split(/(\{product\}|\{maker\})/), function (_, piece) {
          var k = piece === '{product}' ? 'product' : piece === '{maker}' ? 'maker' : '';
          if (!k) { if (piece) $t.append(document.createTextNode(piece)); return; }
          var $n = urls[k] ? $('<a target="_blank" rel="noopener noreferrer"></a>').attr('href', urls[k]) : $('<span></span>');
          $t.append($n.attr('data-dk-credit-part', k).text(names[k]));
        });
        return;
      }
      if (cfg.showCredit === false || !text) { $c.prop('hidden', true); return; }
      $t.text(text);
      // link (DK_CONFIG.creditUrl; '' = none): only http(s) URLs, opened in a new tab. Nothing is loaded from it.
      if (cfg.creditUrl && /^https?:\/\//i.test(cfg.creditUrl) && !$t.parent('a').length) {
        $t.wrap($('<a target="_blank" rel="noopener noreferrer"></a>').attr('href', cfg.creditUrl));
      }
    });
  }

  /* ------------------------------------------------------ separators of a wrapping line */
  // A line of parts joined by " · " (login page: "Secure connection · <brand> · powered by ISPConfig"; the brand text
  // of the panel footer) may wrap between its parts on a narrow screen. A "·" must not be left hanging at the end or
  // the start of a line then: it is taken out and the break is kept where the browser put it. Measured again on every
  // resize from the untouched layout, so the result does not depend on what was hidden before.
  function tidySeps(scope) {
    $(scope || document).find('[data-dk-seps]').each(function () {
      var kids = $(this).children().get(), i, j, a, b, prev, next;
      for (i = 0; i < kids.length; i++) { kids[i].classList.remove('dk-sep-off', 'dk-sep-break'); }
      var off = [], brk = [];
      for (i = 0; i < kids.length; i++) {
        if (!/(^|\s)dk-(foot|footer)-sep(\s|$)/.test(kids[i].className)) continue;
        prev = null; next = null;
        for (j = i - 1; j >= 0; j--) { if (kids[j].offsetParent !== null) { prev = kids[j]; break; } }
        for (j = i + 1; j < kids.length; j++) { if (kids[j].offsetParent !== null) { next = kids[j]; break; } }
        if (!prev || !next) { off.push(kids[i]); continue; }                   // nothing to separate
        a = prev.getBoundingClientRect(); b = next.getBoundingClientRect();
        if (b.top >= a.bottom - 1) brk.push(kids[i]);                          // the next part starts a new line
      }
      // a "·" at a line break becomes the break itself (full width, no height): the parts after it flow as before
      for (i = 0; i < off.length; i++) off[i].classList.add('dk-sep-off');
      for (i = 0; i < brk.length; i++) brk[i].classList.add('dk-sep-break');
    });
  }

  /* ------------------------------------------------------------ theme mode */
  var THEME_KEY = 'dk-theme';
  function storedTheme() { try { return window.localStorage.getItem(THEME_KEY); } catch (e) { return null; } }
  function systemTheme() {
    try { return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch (e) { return 'light'; }
  }
  function applyTheme(mode, source) {
    root.setAttribute('data-theme', mode);
    root.setAttribute('data-theme-source', source);
    $('[data-dk-theme-toggle]').attr('aria-pressed', mode === 'dark' ? 'true' : 'false');
    $('[data-dk-theme-set]').each(function () {
      var v = this.getAttribute('data-dk-theme-set');
      this.setAttribute('role', 'menuitemradio');
      this.setAttribute('aria-checked', (source === 'system' ? v === 'system' : v === mode) ? 'true' : 'false');
    });
    $('meta[name="theme-color"]').attr('content', mode === 'dark' ? '#0F1D33' : '#1F6FAF');
    themeCharts();
  }
  function setTheme(choice) {
    if (choice === 'system') {
      try { window.localStorage.removeItem(THEME_KEY); } catch (e) { /* storage disabled */ }
      applyTheme(systemTheme(), 'system');
    } else {
      try { window.localStorage.setItem(THEME_KEY, choice); } catch (e) { /* storage disabled */ }
      applyTheme(choice, 'user');
    }
  }
  function initTheme() {
    var s = storedTheme();
    if (s === 'light' || s === 'dark') applyTheme(s, 'user'); else applyTheme(systemTheme(), 'system');
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onChange = function () { if (root.getAttribute('data-theme-source') === 'system') applyTheme(systemTheme(), 'system'); };
      if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
    }
    $(document).on('click', '[data-dk-theme-toggle]', function (e) {
      e.preventDefault();
      setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
    $(document).on('click', '[data-dk-theme-set]', function (e) {
      e.preventDefault();
      setTheme(this.getAttribute('data-dk-theme-set'));
    });
  }

  /* ----------------------------------- navigation: drawer, panel, rail keys */
  // One toggle button: below 1200px it opens the drawer (rail + module menu), above it collapses the menu panel.
  var $toggle, lastFocus = null, PANEL_KEY = 'dk-panel', cappInDrawer = false;
  function navIsDrawer() { return window.matchMedia ? window.matchMedia('(max-width: 1199px)').matches : window.innerWidth < 1200; }
  function drawerOpen() { return $('body').hasClass('dk-nav-open'); }
  function panelCollapsed() { return root.getAttribute('data-dk-panel') === 'collapsed'; }
  function syncToggle() {
    if (!$toggle || !$toggle.length) return;
    var drawer = navIsDrawer();
    $toggle.attr('aria-expanded', (drawer ? drawerOpen() : !panelCollapsed()) ? 'true' : 'false');
    // fix round 7 (V7): as a drawer button it is the "Menu" button (hamburger icon, switched by CSS at the same
    // breakpoint); on desktop it collapses / expands the module panel (panel icon)
    var label = t(drawer ? 'nav.menu' : 'nav.toggle');
    if ($toggle.attr('aria-label') !== label) $toggle.attr('aria-label', label).attr('title', label);
  }
  function navFocusables() {
    return $('#dk-sidebar').find('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])').filter(':visible');
  }
  function openNav() {
    lastFocus = document.activeElement;
    $('body').addClass('dk-nav-open');
    $('.dk-scrim').prop('hidden', false);
    syncToggle();
    window.setTimeout(function () {
      var $f = navFocusables(), $cur = $f.filter('.is-active, .active').last();
      ($cur.length ? $cur : $f.first()).trigger('focus');
    }, 50);
  }
  function closeNav(restoreFocus) {
    if (!drawerOpen()) return;
    $('body').removeClass('dk-nav-open');
    $('.dk-scrim').prop('hidden', true);
    syncToggle();
    if (restoreFocus !== false && lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function setPanelCollapsed(on) {
    if (on) root.setAttribute('data-dk-panel', 'collapsed'); else root.removeAttribute('data-dk-panel');
    try { if (on) window.localStorage.setItem(PANEL_KEY, 'collapsed'); else window.localStorage.removeItem(PANEL_KEY); } catch (e) { /* storage disabled */ }
    syncToggle();
    fitCrumbs();
  }
  function initNav() {
    $toggle = $('.dk-nav-toggle');
    $toggle.on('click', function () {
      if (navIsDrawer()) { if (drawerOpen()) closeNav(); else openNav(); }
      else setPanelCollapsed(!panelCollapsed());
    });
    $(document).on('click', '[data-dk-nav-close]', function () { closeNav(); });
    // Keyboard (found in fix round 7): on list pages ISPConfig's document-level keypress handler turns EVERY Enter
    // into "submit the list filter" and cancels the key — so Enter on the Menu button, the theme toggle, the user
    // menu or a menu link did nothing there. Enter on the shell's own buttons / links stays with that control.
    $('.dk-topbar, #dk-sidebar').on('keypress', 'button, a[href]', function (e) { if (e.which === 13) e.stopPropagation(); });
    // the same for the two button groups the theme arranges inside the page (fix round 8): the DNS "Add record"
    // toolbar (on that tab core's handler would run the list filter instead) and the login-as confirmation card
    $('#pageContent').on('keypress', '.dk-dns-toolbar button, .dk-confirm button', function (e) { if (e.which === 13) e.stopPropagation(); });
    $(document).on('keydown', function (e) {
      if (e.key === 'Escape' || e.keyCode === 27) { closeNav(); return; }
      // focus trap while the drawer is open
      if ((e.key === 'Tab' || e.keyCode === 9) && drawerOpen() && navIsDrawer()) {
        var $f = navFocusables();
        if (!$f.length) return;
        var first = $f[0], last = $f[$f.length - 1], inside = $.contains(document.getElementById('dk-sidebar'), document.activeElement);
        if (!inside) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    // drawer: a page was chosen → close. A module was chosen → stay open and show that module's menu
    // (closed by the menu observer if the module turns out to have no menu, e.g. Home).
    $(document).on('click', '#dk-sidebar a[data-load-content], #dk-sidebar [data-dk-quick-module]', function () { if (navIsDrawer()) closeNav(false); });
    $(document).on('click', '#dk-sidebar a[data-capp]', function () { if (navIsDrawer() && drawerOpen()) cappInDrawer = true; });
    $(window).on('resize', function () { if (!navIsDrawer()) closeNav(false); syncToggle(); fitCrumbs(); tabsOverflow(document); });
    // rail: arrow keys / Home / End move between the modules (Tab works as usual)
    $(document).on('keydown', '#main-navigation a', function (e) {
      var k = e.key, $all = $('#main-navigation a'), i = $all.index(this), n = -1;
      if (k === 'ArrowDown' || k === 'ArrowRight') n = (i + 1) % $all.length;
      else if (k === 'ArrowUp' || k === 'ArrowLeft') n = (i - 1 + $all.length) % $all.length;
      else if (k === 'Home') n = 0;
      else if (k === 'End') n = $all.length - 1;
      if (n === -1) return;
      e.preventDefault();
      $all.eq(n).trigger('focus');
    });
    syncToggle();
    // loading indicator (fix round 4, S2): danke.css centres ISPConfig's #ajaxloader in the content area and needs the
    // real height of the top bar for that (two lines on phones). Position only — showing/hiding stays ISPConfig's.
    var bar = document.querySelector('.dk-topbar');
    if (bar && window.ResizeObserver) {
      new window.ResizeObserver(function () { root.style.setProperty('--content-y', bar.offsetHeight + 'px'); }).observe(bar);
    }
  }

  /* ------------------------- menus: active item, friendly labels, breadcrumb */
  var CFG = window.DK_CONFIG || {};
  var lastUrl = '';
  function urlPath(u) {
    if (!u) return '';
    u = String(u).replace(/^\.?\//, '');
    var q = u.indexOf('?');
    return q === -1 ? u : u.substring(0, q);
  }
  function urlParams(u) {
    var out = {}, q = String(u || '').indexOf('?');
    if (q === -1) return out;
    $.each(String(u).substring(q + 1).split('&'), function (_, kv) {
      if (!kv) return;
      var i = kv.indexOf('=');
      out[i === -1 ? kv : kv.substring(0, i)] = i === -1 ? '' : kv.substring(i + 1);
    });
    return out;
  }
  // Is the page shown right now an EXISTING record (…_edit.php?id=3, or a tab change that posts the form with id)?
  var lastData = '';
  function editingExisting() {
    var re = /(?:^|[?&])id=[1-9]\d*(?:&|$)/;
    if (re.test(lastUrl) || re.test(lastData)) return true;
    var v = $('#pageContent input[type="hidden"][name="id"]').first().val();
    return !!v && /^[1-9]\d*$/.test(v);
  }
  /**
   * Which menu link belongs to `url`? (pure function, also used by tools/test-nav.mjs)
   *  1. editing an existing record: the matching list link (x_edit.php?id=3 → x_list.php, i.e. "Edit Client",
   *     not "Add Client" which also points to x_edit.php);
   *  2. the link with exactly this URL;
   *  3. a link with the same path — the one whose own query parameters agree best with the URL
   *     (monitor/show_sys_state.php?state=server&server=… → "Overview" of the server group, not of the system group);
   *  4. a new record form without its own menu entry: the list link.
   * Returns the index in `links` or -1. Never more than one.
   */
  function pickActive(links, url, existing) {
    var full = String(url || '').replace(/^\.?\//, ''), path = urlPath(full);
    if (!path) return -1;
    var i, params = urlParams(full), listPath = path.replace(/_edit\.php$/, '_list.php');
    var exact = -1;
    for (i = 0; i < links.length && exact === -1; i++) if (links[i] === full) exact = i;
    function byPath(p) {
      var best = -1, bestScore = -1, fallback = -1;
      for (var k = 0; k < links.length; k++) {
        if (urlPath(links[k]) !== p) continue;
        if (fallback === -1) fallback = k;
        var lp = urlParams(links[k]), score = 0, conflict = false;
        for (var key in lp) {
          if (!Object.prototype.hasOwnProperty.call(lp, key)) continue;
          if (Object.prototype.hasOwnProperty.call(params, key)) { if (params[key] === lp[key]) score++; else conflict = true; }
        }
        if (!conflict && score > bestScore) { best = k; bestScore = score; }
      }
      return best !== -1 ? best : fallback;
    }
    var hit = -1;
    if (existing && listPath !== path) hit = byPath(listPath);
    // a tab change posts the form to plain x_edit.php (id in the form): that equals the "Add X" link exactly,
    // but the record exists → the list item wins. Otherwise an exact link always wins.
    if (exact !== -1 && !(hit !== -1 && !/[?&]id=/.test(links[exact]))) return exact;
    if (hit === -1) hit = byPath(path);
    if (hit === -1 && !existing && listPath !== path) hit = byPath(listPath);
    return hit;
  }
  function markActiveSubnav() {
    var $links = $('#sidebar li a[data-load-content]');
    if (!$links.length) return -1;
    var hrefs = $links.map(function () { return (this.getAttribute('data-load-content') || '').replace(/^\.?\//, ''); }).get();
    var idx = pickActive(hrefs, lastUrl, editingExisting());
    // no entry for this page (e.g. a DNS record form inside a zone): keep the current highlight
    if (idx === -1) { if ($links.filter('.is-active').length > 1) $links.removeClass('is-active').removeAttr('aria-current'); return -1; }
    $links.removeClass('is-active').removeAttr('aria-current');
    var $a = $links.eq(idx).addClass('is-active').attr('aria-current', 'page');
    // keep the active item visible inside the panel's scroll area
    var sc = $a.closest('.dk-panel-scroll')[0];
    if (sc && sc.scrollHeight > sc.clientHeight) {
      var r = $a[0].getBoundingClientRect(), sr = sc.getBoundingClientRect();
      if (r.top < sr.top + 4 || r.bottom > sr.bottom - 4) sc.scrollTop += r.top - sr.top - sc.clientHeight / 2;
    }
    return idx;
  }
  // Help is the last module: also in the DOM (tab / screen-reader order), not only visually (CSS order)
  function helpLast() {
    var $li = $('#main-navigation [data-module="help"]').closest('li');
    if ($li.length && $li.next('li').length) $li.appendTo($li.parent());
  }
  function activeModule() { return $('#main-navigation a.active').attr('data-module') || ''; }

  /* Friendly labels (display only — URLs, ids and ISPConfig's language files are untouched).
     ISPConfig calls the LIST "Edit X" and the empty form "Add X". The module menu shows a plain name for the
     list and "New x" for the form. Mapped by link target, so it works in every ISPConfig language.
     Unknown links keep ISPConfig's text. Off: DK_CONFIG.friendlyLabels = false.  (List: docs/OVERRIDES.md) */
  var FRIENDLY = {
    'client/client_list.php':          { en: 'Clients',          pt: 'Clientes' },
    'client/client_edit.php':          { en: 'New client',       pt: 'Novo cliente' },
    'client/reseller_list.php':        { en: 'Resellers',        pt: 'Revendedores' },
    'client/reseller_edit.php':        { en: 'New reseller',     pt: 'Novo revendedor' },
    'client/client_circle_list.php':   { en: 'Client circles',   pt: 'Círculos de clientes' },
    'client/domain_edit.php':          { en: 'New domain',       pt: 'Novo domínio' },
    'dns/dns_wizard.php':              { en: 'New DNS zone',     pt: 'Nova zona DNS' },
    'help/support_message_edit.php':   { en: 'New message',      pt: 'Nova mensagem' },
    'help/support_message_list.php':   { en: 'Messages',         pt: 'Mensagens' }
  };
  function friendlyLabel(link) {
    if (CFG.friendlyLabels === false) return '';
    var l = String(link || '').replace(/^\.?\//, '');
    if (l.indexOf('?') !== -1) return '';                 // only the plain list / empty form
    var f = FRIENDLY[l];
    return f ? (f[LANG] || f.en) : '';
  }
  function applyFriendlyLabels() {
    $('#sidebar li a[data-load-content]').each(function () {
      var $t = $(this).find('.dk-subnav-text').first();
      if (!$t.length || $t.attr('data-dk-orig') !== undefined) return;
      var f = friendlyLabel(this.getAttribute('data-load-content'));
      if (!f) return;
      var orig = $.trim($t.text());
      $t.attr('data-dk-orig', orig).text(f);
      if (orig && orig !== f) this.setAttribute('title', orig);     // ISPConfig's own name stays discoverable
    });
  }

  /* Menu icons (fix round 6, U1): every item of every module menu gets exactly one icon from the bundled icon font,
     chosen by its LINK TARGET (works in every ISPConfig language; titles are never read). First matching row wins.
     "New …" items (the empty x_edit.php form) get a plus variant. Anything unknown (add-on modules, future items)
     gets a keyword guess and finally MENU_ICON_FALLBACK — sidenav.tpl.htm already prints the icon element, so the
     label alignment never depends on this table.  (Documented in docs/OVERRIDES.md) */
  var MENU_ICON_FALLBACK = 'bi-circle', MENU_ICON_NEW = 'bi-plus-circle', MENU_ICON_EXTERNAL = 'bi-box-arrow-up-right';
  var MENU_ICONS = [
    // Client
    [/^client\/client_list\.php/, 'bi-people'],                 [/^client\/client_edit\.php/, 'bi-person-plus'],
    [/^client\/reseller_list\.php/, 'bi-person-badge'],         [/^client\/reseller_edit\.php/, 'bi-person-add'],
    [/^client\/client_circle_/, 'bi-collection'],               [/^client\/client_message\.php/, 'bi-send'],
    [/^client\/client_template_/, 'bi-files'],                  [/^client\/message_template_/, 'bi-envelope-paper'],
    [/^client\/domain_list\.php/, 'bi-globe'],                  [/^client\/domain_edit\.php/, 'bi-plus-circle'],
    [/^client\/gdpr_/, 'bi-shield-lock'],
    // Sites
    [/^sites\/web_(vhost_domain|childdomain)_\w+\.php\?.*type=subdomain/, 'bi-diagram-2'],
    [/^sites\/web_(vhost_domain|childdomain)_\w+\.php\?.*type=aliasdomain/, 'bi-link-45deg'],
    [/^sites\/web_vhost_domain_edit\.php$/, 'bi-plus-circle'],  [/^sites\/web_(vhost_domain|childdomain)_/, 'bi-globe2'],
    [/^sites\/database_user_/, 'bi-database-lock'],             [/^sites\/database_quota_stats/, 'bi-database-check'],
    [/^sites\/database_edit\.php$/, 'bi-database-add'],         [/^sites\/database_/, 'bi-database'],
    [/^sites\/ftp_sites_stats/, 'bi-bar-chart-steps'],          [/^sites\/ftp_user_/, 'bi-folder-symlink'],
    [/^sites\/webdav_user_/, 'bi-hdd-network'],                 [/^sites\/web_folder_user_/, 'bi-person-lock'],
    [/^sites\/web_folder_/, 'bi-lock'],                         [/^sites\/shell_user_/, 'bi-terminal'],
    [/^sites\/cron_/, 'bi-clock'],                              [/^sites\/web_sites_stats/, 'bi-bar-chart'],
    [/^sites\/user_quota_stats/, 'bi-pie-chart'],               [/^sites\/aps_update_/, 'bi-arrow-repeat'],
    [/^sites\/aps_installed/, 'bi-box-seam'],                   [/^sites\/aps_/, 'bi-box'],
    // Email
    [/^mail\/mail_domain_catchall_/, 'bi-inboxes'],             [/^mail\/mail_aliasdomain_/, 'bi-link-45deg'],
    [/^mail\/mail_domain_/, 'bi-globe'],                        [/^mail\/mail_user_stats/, 'bi-bar-chart'],
    [/^mail\/mail_user_edit\.php$/, 'bi-envelope-plus'],        [/^mail\/mail_user_/, 'bi-envelope'],
    [/^mail\/mail_alias_/, 'bi-envelope-at'],                   [/^mail\/mail_forward_/, 'bi-forward'],
    [/^mail\/mail_mailinglist_/, 'bi-megaphone'],               [/^mail\/spamfilter_whitelist_/, 'bi-check-circle'],
    [/^mail\/spamfilter_blacklist_/, 'bi-slash-circle'],        [/^mail\/spamfilter_users_/, 'bi-person-gear'],
    [/^mail\/spamfilter_policy_/, 'bi-sliders'],                [/^mail\/mail_get_/, 'bi-cloud-download'],
    [/^mail\/xmpp_domain_/, 'bi-chat-dots'],                    [/^mail\/xmpp_user_/, 'bi-chat'],
    [/^mail\/user_quota_stats/, 'bi-pie-chart'],                [/^mail\/mail_whitelist_/, 'bi-check2-circle'],
    [/^mail\/mail_blacklist_/, 'bi-x-circle'],                  [/^mail\/mail_content_filter_/, 'bi-funnel'],
    [/^mail\/mail_transport_/, 'bi-signpost-split'],            [/^mail\/mail_relay_domain_/, 'bi-arrow-left-right'],
    [/^mail\/mail_relay_recipient_/, 'bi-person-check'],
    // Mailuser (mailbox owner login)
    [/^mailuser\/index\.php/, 'bi-envelope'],                   [/^mailuser\/.*autoresponder/, 'bi-reply'],
    [/^mailuser\/.*_cc_/, 'bi-envelope-plus'],                  [/^mailuser\/.*filter_/, 'bi-funnel'],
    [/^mailuser\/.*password/, 'bi-key'],                        [/^mailuser\/.*spamfilter/, 'bi-shield'],
    // DNS
    [/^dns\/dns_wizard\.php/, 'bi-node-plus'],                  [/^dns\/dns_import\.php/, 'bi-upload'],
    [/^dns\/dns_template_/, 'bi-files'],                        [/^dns\/dns_slave_/, 'bi-diagram-2'],
    [/^dns\/dns_soa_/, 'bi-diagram-3'],
    // Tools
    [/^tools\/user_settings\.php/, 'bi-person-gear'],           [/^tools\/import_/, 'bi-box-arrow-in-down'],
    [/^tools\/resync\.php/, 'bi-arrow-repeat'],                 [/^tools\/security_check\.php/, 'bi-shield-check'],
    [/^tools\/dns_import_/, 'bi-box-arrow-in-down'],            // "PDNS Tupa" import: a menu item of ISPConfig 3.3.1 / 3.3.2 only
    // Monitor
    [/^monitor\/show_sys_state\.php\?.*state=server/, 'bi-hdd-rack'],  [/^monitor\/show_sys_state\.php/, 'bi-speedometer2'],
    [/^monitor\/dataloghistory_/, 'bi-clock-history'],          [/^monitor\/datalog_/, 'bi-list-task'],
    [/^monitor\/log_list\.php/, 'bi-journal-text'],             [/^monitor\/show_data\.php\?.*type=cpu_info/, 'bi-cpu'],
    [/^monitor\/show_data\.php\?.*type=system_update/, 'bi-arrow-repeat'],
    [/^monitor\/show_data\.php\?.*type=raid_state/, 'bi-hdd-stack'],
    [/^monitor\/show_data\.php\?.*type=server_load/, 'bi-activity'],
    [/^monitor\/show_data\.php\?.*type=disk_usage/, 'bi-hdd'],
    [/^monitor\/show_data\.php\?.*type=database_size/, 'bi-database'],
    [/^monitor\/show_data\.php\?.*type=mem_usage/, 'bi-memory'],
    [/^monitor\/show_data\.php\?.*type=services/, 'bi-toggles'],
    [/^monitor\/show_data\.php\?.*type=openvz/, 'bi-box'],
    [/^monitor\/show_data\.php\?.*type=mailq/, 'bi-inboxes'],
    [/^monitor\/show_data\.php\?.*type=rkhunter/, 'bi-bug'],
    [/^monitor\/show_data\.php\?.*type=fail2ban/, 'bi-ban'],
    [/^monitor\/show_data\.php\?.*type=iptables/, 'bi-bricks'],
    [/^monitor\/show_monit\.php/, 'bi-heart-pulse'],            [/^monitor\/show_munin\.php/, 'bi-graph-up'],
    [/^monitor\/show_log\.php\?.*log=log_mail_(warn|err)/, 'bi-envelope-exclamation'],
    [/^monitor\/show_log\.php\?.*log=log_mail/, 'bi-envelope'],
    [/^monitor\/show_log\.php\?.*log=log_ispc_cron/, 'bi-clock'],
    [/^monitor\/show_log\.php\?.*log=log_(freshclam|clamav)/, 'bi-shield-check'],
    [/^monitor\/show_log\.php\?.*log=log_letsencrypt/, 'bi-patch-check'],
    [/^monitor\/show_(log|data)\.php/, 'bi-file-text'],
    // System
    [/^admin\/users_/, 'bi-people'],                            [/^admin\/remote_user_/, 'bi-plug'],
    [/^admin\/server_config_/, 'bi-gear'],                      [/^admin\/server_ip_map_/, 'bi-shuffle'],
    [/^admin\/server_ip_/, 'bi-ethernet'],                      [/^admin\/server_php_/, 'bi-filetype-php'],
    [/^admin\/server_/, 'bi-hdd-rack'],                         [/^admin\/directive_snippets_/, 'bi-code-slash'],
    [/^admin\/firewall_/, 'bi-shield'],                         [/^admin\/system_config_/, 'bi-sliders'],
    [/^admin\/extension_install_/, 'bi-puzzle-fill'],           [/^admin\/extension_/, 'bi-puzzle'],
    [/^admin\/remote_action_osupdate/, 'bi-arrow-repeat'],      [/^admin\/remote_action_ispcupdate/, 'bi-arrow-up-circle'],
    [/^admin\/language_/, 'bi-translate'],                      [/^admin\/software_/, 'bi-box'],
    // Help
    [/^help\/support_message_edit\.php/, 'bi-envelope-plus'],   [/^help\/support_message_/, 'bi-chat-left-text'],
    [/^help\/faq_sections_/, 'bi-folder'],                      [/^help\/faq_/, 'bi-question-circle'],
    [/^help\/version\.php/, 'bi-info-circle'],
    // VServer
    [/^vm\/openvz_vm_/, 'bi-pc-display'],                       [/^vm\/openvz_ostemplate_/, 'bi-disc'],
    [/^vm\/openvz_template_/, 'bi-files'],                      [/^vm\/openvz_ip_/, 'bi-ethernet'],
    // keyword guesses for add-on modules / future items (file name only)
    [/^[^?]*\/[^/?]*(stats|statistic|traffic)/, 'bi-bar-chart'], [/^[^?]*\/[^/?]*backup/, 'bi-archive'],
    [/^[^?]*\/[^/?]*quota/, 'bi-pie-chart'],                     [/^[^?]*\/[^/?]*(firewall|security)/, 'bi-shield'],
    [/^[^?]*\/[^/?]*update/, 'bi-arrow-repeat'],                 [/^[^?]*\/[^/?]*cron/, 'bi-clock'],
    [/^[^?]*\/[^/?]*template/, 'bi-files'],                      [/^[^?]*\/[^/?]*(database|db_)/, 'bi-database'],
    [/^[^?]*\/[^/?]*dns/, 'bi-diagram-3'],                       [/^[^?]*\/[^/?]*domain/, 'bi-globe'],
    [/^[^?]*\/[^/?]*mail/, 'bi-envelope'],                       [/^[^?]*\/[^/?]*(shell|ssh)/, 'bi-terminal'],
    [/^[^?]*\/[^/?]*ftp/, 'bi-folder-symlink'],                  [/^[^?]*\/[^/?]*(invoice|billing|payment)/, 'bi-receipt'],
    [/^[^?]*\/[^/?]*log/, 'bi-file-text'],                       [/^[^?]*\/[^/?]*(setting|config)/, 'bi-gear'],
    [/^[^?]*\/[^/?]*(user|client|reseller)[^/?]*_edit\.php$/, 'bi-person-plus'],
    [/^[^?]*\/[^/?]*(user|client|reseller)/, 'bi-people']
  ];
  /** icon class for a menu link (pure function, also used by tools/test-r7.mjs). opts.external: opens outside the panel */
  function menuIcon(link, external) {
    var l = String(link || '').replace(/^\.?\//, '');
    if (external || /^[a-z][a-z0-9+.-]*:/i.test(l) || l.indexOf('//') === 0) return MENU_ICON_EXTERNAL;
    for (var i = 0; i < MENU_ICONS.length; i++) if (MENU_ICONS[i][0].test(l)) return MENU_ICONS[i][1];
    if (/_edit\.php$/.test(l)) return MENU_ICON_NEW;            // an empty form = "New …"
    return MENU_ICON_FALLBACK;
  }
  function applyMenuIcons() {
    $('#sidebar li > a').each(function () {
      var a = this, $inner = $(a).children('.dk-subnav-inner').first(), $i = $(a).find('i.dk-subnav-icon');
      if (!$.trim($(a).text())) return;                           // image-only entries keep their image
      if ($i.length > 1) { $i.slice(1).remove(); $i = $i.first(); }
      if (!$i.length) {                                           // a menu rendered by another template (add-on, custom_menu.htm)
        $i = $('<i class="bi dk-subnav-icon" aria-hidden="true"></i>');
        if ($inner.length) $inner.prepend($i); else $(a).addClass('dk-subnav-flex').prepend($i);
      }
      var link = a.getAttribute('data-load-content'), ext = !link;
      var cls = menuIcon(link || a.getAttribute('href') || '', ext && a.getAttribute('href') !== '#');
      if ($i.attr('data-dk-icon') === cls) return;
      $i.attr('class', 'bi dk-subnav-icon ' + cls).attr('data-dk-icon', cls);
    });
  }

  // Menu panel state. Every module has a panel: ISPConfig's module menu, or — on Home, where ISPConfig only prints
  // the "latest news" list (shown as a dashboard card instead) — the Home panel built below. So the content starts
  // at the same x on every module (fix round 5, T2). data-dk-menu="0" is only left for a module with no menu at all.
  var menusSeen = false;
  function homePanel() {
    var $side = $('#sidebar');
    return activeModule() === 'dashboard' && !$side.find('.dk-navgroup').length;
  }
  function updateMenuState() {
    var $side = $('#sidebar');
    if (!$side.length) return;
    if ($side.children().length) menusSeen = true;
    if (!menusSeen) return;                    // menus not loaded yet: keep what danke-early.js assumed
    var home = homePanel();
    $side.toggleClass('dk-news-moved', home); // ISPConfig's dashboard side menu = the news list: not shown in the panel
    var has = home || $side.find('li, select, a').length > 0;
    root.setAttribute('data-dk-menu', has ? '1' : '0');
    try { window.sessionStorage.setItem('dk-menu', has ? '1' : '0'); } catch (e) { /* storage disabled */ }
    if (cappInDrawer && !has) closeNav(false);
    buildHomeNav();
  }
  /* Home panel (fix round 3: drawer only; fix round 5: always). The dashboard module has no menu of its own, so its
     panel is built here from what is already on the page: Overview (the dashboard), the quick actions this user's
     modules allow, Monitor → server status (users with the Monitor module), Account → user settings + logout. */
  function homeItem(label, icon) {
    // same markup as a module menu item (sidenav.tpl.htm): icon + label inside .dk-subnav-inner
    var $in = $('<div class="dk-subnav-inner"></div>');
    $in.append($('<i class="bi dk-subnav-icon" aria-hidden="true"></i>').addClass(icon || MENU_ICON_FALLBACK));
    return $('<a href="#"></a>').append($in.append($('<span class="dk-subnav-text"></span>').text(label)));
  }
  function homeGroup(title, items) {
    if (!items.length) return null;
    var $ul = $('<ul></ul>'), $g = $('<div class="dk-navgroup"></div>');
    $.each(items, function (_, $a) { $ul.append($('<li></li>').append($a)); });
    if (title) $g.append($('<h3 class="dk-navgroup-title"></h3>').text(title));
    return $g.append($ul);
  }
  function buildHomeNav() {
    var nav = document.getElementById('dk-home-nav');
    if (!nav) return;
    var $nav = $(nav);
    if (!homePanel()) { if (!nav.hidden || nav.firstChild) $nav.prop('hidden', true).attr('data-dk-key', '').empty(); return; }
    var mods = {}, modKeys = [];
    $('#main-navigation [data-module]').each(function () { mods[this.getAttribute('data-module')] = $.trim($(this).find('.title').text()); modKeys.push(this.getAttribute('data-module')); });
    var onDash = urlPath(lastUrl) === 'dashboard/dashboard.php' || !lastUrl;
    // rebuilt only when something it shows has changed (keeps keyboard focus inside the panel)
    var key = modKeys.join(',') + '|' + (onDash ? 1 : 0) + '|' + LANG;
    if ($nav.attr('data-dk-key') === key && !nav.hidden) return;
    var quick = function (label, icon, mod, page) { return homeItem(label, icon).attr('data-dk-quick-module', mod).attr('data-dk-quick-page', page); };
    var $over = homeItem(t('dash.eyebrow'), 'bi-grid-1x2').attr('data-load-content', 'dashboard/dashboard.php');
    if (onDash) $over.addClass('is-active').attr('aria-current', 'page');
    var qa = [], mon = [], acc = [];
    $.each(QUICK, function (_, q) { if (mods[q.module] !== undefined) qa.push(quick(t(q.key), menuIcon(q.page), q.module, q.page)); });
    if (mods.monitor !== undefined) mon.push(quick(t('dash.status'), menuIcon('monitor/show_sys_state.php?state=system'), 'monitor', 'monitor/show_sys_state.php?state=system'));
    if (mods.tools !== undefined) acc.push(quick(t('home.settings'), menuIcon('tools/user_settings.php'), 'tools', 'tools/user_settings.php'));
    // logout = ISPConfig's own logout target (and its translated word, taken from the user menu)
    var $lo = $('#logout-button');
    if ($lo.length) {
      var word = $.trim($lo.clone().find('.sr-only, i').remove().end().text()) || t('home.logout');
      acc.push(homeItem(word, 'bi-box-arrow-right').attr('data-load-content', $lo.attr('data-load-content') || 'login/logout.php'));
    }
    $nav.empty().attr('aria-label', mods.dashboard || 'Home').attr('data-dk-key', key);
    $.each([homeGroup('', [$over]), homeGroup(t('dash.quick'), qa), homeGroup(mods.monitor || 'Monitor', mon), homeGroup(t('home.account'), acc)],
      function (_, $g) { if ($g) $nav.append($g); });
    $nav.prop('hidden', false);
  }

  /* Breadcrumb: Module › Group › Item, on a record › record name › active tab. Every part but the last is a link. */
  var recordNames = {};
  var NAME_FIELDS = ['domain', 'origin', 'email', 'company_name', 'contact_name', 'username', 'database_name', 'database_user',
    'server_name', 'hostname', 'name', 'template_name', 'source', 'subject', 'title'];
  function recordId() {
    var m = /(?:^|[?&])id=([1-9]\d*)(?:&|$)/.exec(lastUrl) || /(?:^|[?&])id=([1-9]\d*)(?:&|$)/.exec(lastData);
    if (m) return m[1];
    var v = $('#pageContent input[type="hidden"][name="id"]').first().val();
    return v && /^[1-9]\d*$/.test(v) ? v : '';
  }
  // Page heading without the form description ISPConfig may put into the same <h1>.
  function pageHeading() {
    var $h = $('#pageContent .page-header h1, #pageContent > h1, #pageContent > h2').first();
    if (!$h.length) return '';
    var $c = $h.clone();
    $c.find('.pageForm_description').remove();
    return $.trim($c.text().replace(/\s+/g, ' '));
  }
  // ISPConfig names the record in the heading of forms that have a record name: "<Form title> - <record name>"
  // (tform_actions::onShow: "Database - c3_velora", "Web Domain - example.com"). The part after the first " - ".
  function headingRecord(h) {
    var i = String(h || '').indexOf(' - ');
    return i > 0 ? $.trim(h.substring(i + 3)) : '';
  }
  function recordName(key) {
    var $pc = $('#pageContent'), name = headingRecord(pageHeading());
    // forms without a record name in the heading: read it from the form —
    // mailbox: local part + domain select
    var $lp = $pc.find('input[name="email_local_part"]'), $ed = $pc.find('select[name="email_domain"]');
    if (!name && $lp.length && $.trim($lp.val())) name = $.trim($lp.val()) + ($ed.length && $ed.val() ? '@' + $.trim($ed.find('option:selected').text()) : '');
    for (var i = 0; !name && i < NAME_FIELDS.length; i++) {
      var $f = $pc.find('input[type="text"][name="' + NAME_FIELDS[i] + '"], input:not([type])[name="' + NAME_FIELDS[i] + '"]').first();
      if (!$f.length) continue;
      name = $.trim($f.val());
      // a prefix printed in front of the field belongs to the name (database "c3_" + "velora")
      var $pre = $f.prevAll('.input-group-addon').first(), pre = $pre.length ? $.trim($pre.text()) : '';
      if (name && pre && pre !== '@' && pre.length <= 24) name = pre + name;
    }
    // Client → Info: "Company Name: …" / "Contact Name: …" list
    if (!name) $pc.find('.tab-pane > .page-header > div > ul > li').slice(0, 2).each(function () {
      var m = /^[^:]+:\s*(.+)$/.exec($.trim($(this).text()));
      if (!name && m) name = $.trim(m[1]);
    });
    if (name) recordNames[key] = name;
    return name || recordNames[key] || '';
  }
  function crumbParts() {
    var parts = [], $mod = $('#main-navigation a.active'), mod = $mod.attr('data-module') || '';
    var modTitle = $.trim($mod.find('.title').text());
    if (!modTitle) return parts;
    // fix round 9 (B1): the "login as" / "re-login" confirmation cards (login/login_as.php, login/logout.php) have
    // no menu entry — the trail of the page they were opened from must not stay. "Client › Login as" / "Re-login".
    var $confirm = $('#pageContent > .dk-confirm');
    if ($confirm.length) {
      return $confirm.find('.wf_actions [data-load-content*="logout.php"]').length
        ? [{ text: t('crumbs.relogin') }]
        : [{ text: modTitle, capp: mod }, { text: t('crumbs.loginas') }];
    }
    parts.push({ text: modTitle, capp: mod });
    var path = urlPath(lastUrl), urlMod = path.split('/')[0];
    // while the menus of another module are still shown (cross-module link, before the sync) only the module is certain
    if (urlMod && urlMod !== mod && $('#main-navigation [data-module="' + urlMod + '"]').length) return parts;
    var $a = $('#sidebar li a.is-active').first();
    if ($a.length && $('#sidebar').hasClass('dk-news-moved')) $a = $();
    var link = '', exact = false;
    if ($a.length) {
      link = ($a.attr('data-load-content') || '').replace(/^\.?\//, '');
      var $grp = $a.closest('.dk-navgroup'), gtitle = $.trim($grp.find('.dk-navgroup-title').first().text());
      var first = $grp.find('li a[data-load-content]').first().attr('data-load-content') || '';
      if (gtitle) parts.push({ text: gtitle, load: first });
      parts.push({ text: $.trim($a.find('.dk-subnav-text').first().text() || $a.text()), load: link });
      exact = urlPath(link) === path;
    }
    var id = editingExisting() ? recordId() : '', heading = pageHeading(), $tabs = $('#pageContent .nav-tabs > li');
    if (id && /_edit\.php$/.test(path)) {
      var key = path + '#' + id;
      // (a menu entry that IS one record, e.g. System → Interface Config = …_edit.php?id=1, needs no record part)
      if (!/[?&]id=/.test(link)) parts.push({ text: recordName(key) || heading || ('#' + id), load: path + '?id=' + id });
      if ($tabs.length > 1) { var tab = $.trim($tabs.filter('.active').first().text()); if (tab) parts.push({ text: tab }); }
    } else if (!exact && heading && $a.length) {
      parts.push({ text: heading });           // a page without its own menu entry (e.g. new record from a list button)
    }
    // drop repeats ("Tools › User Settings › User Settings", "Clients › Clients")
    var out = [];
    $.each(parts, function (_, p) {
      if (!p.text) return;
      if (out.length && out[out.length - 1].text.toLowerCase() === p.text.toLowerCase()) { if (out.length > 1) out[out.length - 1] = p; return; }
      out.push(p);
    });
    return out;
  }
  function updateContext() {
    $('#dk-module-label').text($.trim($('#main-navigation a.active .title').text()));
    var $ol = $('#dk-crumbs > ol');
    if (!$ol.length) return;
    var parts = crumbParts();
    $ol.empty();
    $(nav0()).removeClass('is-expanded');
    $.each(parts, function (i, p) {
      var $li = $('<li></li>'), last = i === parts.length - 1;
      // phones show "… › last two parts": the earlier parts are marked, a "…" button stands for them
      if (parts.length > 2 && i < parts.length - 2) $li.addClass('dk-crumb-early');
      if (parts.length > 2 && i === parts.length - 2) {
        $ol.append($('<li class="dk-crumb-more"></li>').append($('<button type="button" data-dk-crumb-more>\u2026</button>').attr('aria-label', t('crumbs.more')).attr('title', t('crumbs.more'))));
      }
      if (last) $li.append($('<span aria-current="page"></span>').text(p.text).attr('title', p.text));
      else if (p.capp) $li.append($('<a href="#"></a>').attr('data-dk-crumb-module', p.capp).text(p.text));
      else if (p.load) $li.append($('<a href="#"></a>').attr('data-load-content', p.load).text(p.text).attr('title', p.text));
      else $li.append($('<span></span>').text(p.text));
      $ol.append($li);
    });
    fitCrumbs();
  }
  function nav0() { return document.getElementById('dk-crumbs'); }
  $(document).on('click', '[data-dk-crumb-more]', function () {
    $(nav0()).addClass('is-expanded').find('a').first().trigger('focus');
  });
  // natural widths first; shorten the middle parts only if the trail really does not fit
  function fitCrumbs() {
    var nav = document.getElementById('dk-crumbs');
    if (!nav) return;
    $(nav).removeClass('is-tight');
    var ol = nav.firstElementChild;
    if (ol && ol.scrollWidth > nav.clientWidth) $(nav).addClass('is-tight');
  }
  // module crumb = what a click on the module icon does (the active icon itself has no data-capp)
  $(document).on('click', '[data-dk-crumb-module]', function (e) {
    e.preventDefault();
    if (!window.ISPConfig || navBlocked()) return;
    ISPConfig.capp(this.getAttribute('data-dk-crumb-module'));
  });

  /* ------------------------------------------------- navigation control (fix round 4)
     ISPConfig loads the page (content) and the menus (nav.php top + side) with separate requests, and a module
     switch is a third one before them (capp.php → "now load this page"). Their answers can arrive in any order.
     ISPConfig's only protection is "ignore clicks while a request is running" — so a fast second click is lost
     (finding R2) — and r3/r4 of this theme made it worse: its "module follows the content" check ran as soon as
     the new menus were in, saw the OLD page still on screen and switched the module back (finding R1).

     Rules now:
     1. One navigation generation counter (nav.gen). Every user navigation — module icon, menu item, link or
        button in the content, breadcrumb, quick action, Back/Forward — starts a new generation and ABORTS the
        requests of the older one (module switch, menus, page). So no old answer can arrive later, ISPConfig's
        request counter is back at 0 and it accepts the new click: the LAST thing the user asked for wins.
        Not aborted, not overtaken: a running save (POST) or action/delete request — there ISPConfig's own
        "wait until it is done" stays in force.
     2. Consistency guard: only when NOTHING is in flight any more, compare the module of the page on screen
        (first part of its path; dashboard/ = Home) with the module the rail and the menu panel show. If they
        differ, send what the module icon sends (capp.php?mod=…, answer ignored) and reload the menus — at most
        twice per generation, never in a loop. (DK_CONFIG.syncModule = false turns the guard off.)
     3. After an aborted module switch the server may be on another module than the screen (the switch was
        processed, its menus never arrived): one quiet capp.php for the module on screen puts the session right
        (the menus on screen are already correct, nothing is reloaded).
     The theme's background requests (server status card) are `global: false`: not counted here, never part of a
     generation, and they never touch module, menu or history. ISPConfig's data-log poll and keepalive likewise. */
  var nav = { gen: 0, reqs: [], sync: null, tries: 0, triesGen: -1, dirty: false, srv: '', timer: 0 };   // srv: module last asked of the server
  var NAV_SEL = 'a[data-load-content],button[data-load-content],a[data-capp],button[data-capp],[data-dk-crumb-module],[data-dk-quick-module]';
  // what kind of request is this for the navigation? '' = none of its business (polls, form helpers, JSON)
  function reqKind(o) {
    var type = String(o.type || 'GET').toUpperCase(), u = String(o.url || '').replace(/^\.?\//, '').replace(/([?&])_=\d+/, '$1').replace(/[?&]$/, ''), p = urlPath(u);
    var dt = o.dataTypes && o.dataTypes[0] ? o.dataTypes[0] : (o.dataType || '');
    if (dt === 'json' || dt === 'script' || /^(keepalive|datalogstatus)\.php$/.test(p) || /ajax/i.test(p)) return '';
    if (type !== 'GET') return 'block';                       // save, tab change, list filter
    if (p === 'capp.php') return 'capp';
    if (p === 'nav.php') return 'menu';
    if (!/^[a-z0-9_]+\/[a-z0-9_]+\.php$/i.test(p)) return '';
    return ACTION_RE.test(u) ? 'block' : 'page';              // delete / action / login-as … : plain page view
  }
  // GET requests that DO something (never aborted, never overtaken)
  var ACTION_RE = /(_del\.php|delete|remove|logout|login_as|_action|resync|message_ack|[?&]_csrf|token|[?&]hide=|[?&]action=)/i;
  function navPending() { return nav.reqs.length > 0 || !!nav.sync || !!tx; }
  function navBlocked() { for (var i = 0; i < nav.reqs.length; i++) if (nav.reqs[i].kind === 'block') return true; return false; }
  function beginIntent() {
    nav.gen++;
    if (txDrop()) nav.dirty = true;                            // answers of a half-arrived switch: never applied
    var list = nav.reqs.slice(), i;
    for (i = 0; i < list.length; i++) {
      var r = list[i];
      if (r.kind === 'block' || r.xhr.readyState === 4) continue;
      if (r.kind === 'capp') nav.dirty = true;                 // the server may or may not have switched already
      r.xhr.dkAbort = true;
      try { r.xhr.abort(); } catch (e) { /* already finished */ }
    }
    if (nav.sync) { var sx = nav.sync; nav.sync = null; nav.dirty = true; sx.dkAbort = true; try { sx.abort(); } catch (e2) { /* finished */ } }
    busy();
  }

  /* ------------------------------------------------- atomic module switch (fix round 5, T1)
     A module switch is three answers (page, side menu, rail). ISPConfig writes each one into the page the moment it
     arrives, so for a moment the rail showed the new module over the old menu, or the new menu beside the old page.
     Now the OLD rail, panel, breadcrumb and page stay exactly as they are until ALL answers of the switch are in;
     then ISPConfig's own success handlers run one after the other in a single frame (requestAnimationFrame) —
     rail, menu, page, and with them the theme's breadcrumb / active item / Home panel.
     How, without touching ispconfig.js: a jQuery.ajaxPrefilter wraps the `success` option of ISPConfig's menu and
     page requests (GET only; never saves or actions). The wrapper calls the original handler unchanged — at once
     when the answer stands alone (a page inside the same module, a redirect), later when it belongs to a switch.
     - A new user navigation (generation counter) drops the answers that are being held: never applied.
     - One answer fails → the others are dropped/aborted too: the old state stays, ISPConfig's error handler has
       run for the failed request, and a short message says that nothing was changed.
     - A page of another module opened by a link / Back / Forward: the module is switched FIRST (capp.php, what the
       module icon sends), then page + menus are requested together and applied together.
     While answers are held ISPConfig's request counter stays up (its loader keeps turning, clicks on forms wait). */
  var tx = null, TX_KINDS = { page: 1, menu: 1, capp: 1 };
  function hasOldState() { return !!lastUrl && !!activeModule(); }
  function txSiblings(xhr) {
    var n = 0;
    for (var i = 0; i < nav.reqs.length; i++) if (nav.reqs[i].xhr !== xhr && TX_KINDS[nav.reqs[i].kind]) n++;
    return n;
  }
  function busy() {
    var on = !!tx;
    for (var i = 0; !on && i < nav.reqs.length; i++) if (nav.reqs[i].kind === 'capp' || nav.reqs[i].kind === 'menu') on = true;
    if (on && hasOldState()) root.setAttribute('data-dk-switching', '1'); else root.removeAttribute('data-dk-switching');
  }
  function txDrop() {
    var t0 = tx;
    if (!t0) return false;
    tx = null;
    // their success handlers will never run: take them out of ISPConfig's request counter (as its error path does)
    for (var i = 0; i < t0.held.length; i++) { try { ISPConfig.hideLoadIndicator(); } catch (e) { /* counter only */ } }
    busy();
    return true;
  }
  function txFlush() {
    var t0 = tx;
    if (!t0) return;
    tx = null;
    t0.held.sort(function (a, b) { return a.order - b.order; });       // rail, menu, page
    for (var i = 0; i < t0.held.length; i++) {
      try { t0.held[i].run(); } catch (e) { (function (err) { window.setTimeout(function () { throw err; }, 0); })(e); }
    }
    busy();
    scheduleGuard();
  }
  function txSchedule() {
    if (!tx || tx.due) return;
    tx.due = true;
    var t0 = tx, go = function () { if (tx === t0) txFlush(); };
    if (window.requestAnimationFrame && !document.hidden) window.requestAnimationFrame(go);
    window.setTimeout(go, 120);                                // a hidden tab gets no animation frame
  }
  // an answer of ISPConfig's page / menu request has arrived: apply now, or keep until the switch is complete
  function txArrive(xhr, kind, o, run) {
    var text = String((xhr && xhr.responseText) || '');
    // nothing on screen yet (first load), or an answer that only starts the next request: at once
    if (!hasOldState() || (kind === 'page' && /HEADER_REDIRECT:|URL_REDIRECT:/.test(text))) { run(); return; }
    var isTop = kind === 'menu' && /(^|[?&])nav=top/.test(String(o.url || '') + '&' + (typeof o.data === 'string' ? o.data : ''));
    var item = { run: run, order: kind === 'page' ? 3 : (isTop ? 1 : 2) }, others = txSiblings(xhr);
    if (kind === 'page' && !tx && !others && CFG.syncModule !== false) {
      // a page of another module arrived on its own (redirect after a save, a URL the click wrapper did not see):
      // keep it, switch the module, load the menus — then everything together
      var sw = needSwitch(o.url);
      if (sw && sw.menus) { tx = { held: [item], wait: true }; busy(); quietCapp(sw.mod, true); return; }
    }
    if (!tx && !others) { run(); return; }                     // stands alone
    if (!tx) tx = { held: [] };
    tx.held.push(item);
    busy();
    if (!others && !tx.wait) txSchedule();
  }
  // one answer of a switch failed (not: aborted by us): nothing of that switch is applied
  function txFail(xhr) {
    if (!hasOldState()) return;
    var list = nav.reqs.slice();
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (r.xhr === xhr || !TX_KINDS[r.kind] || r.xhr.readyState === 4) continue;
      r.xhr.dkAbort = true;
      try { r.xhr.abort(); } catch (e) { /* already finished */ }
    }
    txDrop();
    nav.dirty = true;                                          // the server may have switched: the guard puts it right
    notify(t('nav.failed'));
    busy();
    scheduleGuard();
  }
  $(document).ajaxError(function (e, xhr, o, err) {
    if (!coreLoad || !xhr || xhr.dkAbort || err === 'abort' || xhr.statusText === 'abort' || !o || o.global === false) return;
    if (TX_KINDS[reqKind(o)]) txFail(xhr);
  });
  $.ajaxPrefilter(function (o, orig, xhr) {
    if (!coreLoad || o.global === false || typeof o.success !== 'function') return;
    var kind = reqKind(o);
    if (kind !== 'page' && kind !== 'menu') return;
    var apply = o.success;
    o.success = function (data, status, jq) {
      var self = this, args = arguments;
      txArrive(jq || xhr, kind, o, function () { return apply.apply(self, args); });
    };
  });
  // Does opening `url` need the module switched first? → { mod, menus } (menus: the menus on screen are another
  // module's) or null. Same module but the server may be elsewhere after an aborted switch → switch, keep the menus.
  function needSwitch(url) {
    var p = urlPath(url), m = p.split('/')[0], cur = activeModule();
    if (!m || !cur || !inRail(m) || !/^[a-z0-9_]+\/[a-z0-9_]+\.php$/i.test(p)) return null;
    if (m === cur) return nav.dirty || (nav.srv && nav.srv !== m) ? { mod: m, menus: false } : null;
    var linked = false;                                        // a page the current module menu itself links to stays
    $('#sidebar li a[data-load-content]').each(function () { if (urlPath(this.getAttribute('data-load-content')) === p) linked = true; });
    return linked ? null : { mod: m, menus: true };
  }
  // switch the module the way the module icon does (capp.php), then load the page (+ menus) — applied together
  function switchThenLoad(mod, page, menus) {
    var g = nav.gen;
    $.ajax({ type: 'GET', url: 'capp.php', data: 'mod=' + encodeURIComponent(mod), dataType: 'html',
      beforeSend: function () { ISPConfig.showLoadIndicator(); }, complete: function () { ISPConfig.hideLoadIndicator(); } })
      .done(function () {
        if (g !== nav.gen) return;                             // the user clicked something else meanwhile
        (coreLoad || ISPConfig.loadContent).call(ISPConfig, page);
        if (menus !== false) ISPConfig.loadMenus();
      });
  }
  // short message for a failed navigation (ISPConfig.reportError is empty in 3.3.x)
  // … and, kind "ok", the short confirmation of a save that ISPConfig answers without any message (fix round 13)
  var noteTimer = 0;
  function notify(msg, kind) {
    var $n = $('#dk-toast'), ok = kind === 'ok';
    if (!$n.length) $n = $('<div id="dk-toast" class="dk-toast"></div>').appendTo(document.body);
    $n.attr('role', ok ? 'status' : 'alert').toggleClass('dk-toast--ok', ok).text(msg).prop('hidden', false);
    window.clearTimeout(noteTimer);
    noteTimer = window.setTimeout(function () { $n.prop('hidden', true); }, ok ? 4000 : 7000);
  }

  /* ------------------------------------------------- a save that is answered with "reload the page" (fix round 13, R1)
     Tools → User Settings: when the Design changed, core answers the save with nothing but
         <script type="text/javascript">document.location.reload();</script>
     (tools/user_settings.php, onAfterUpdate) and relies on the page inserting and running it. The theme does not
     leave that to chance: an answer of a page request (GET or POST) that consists of exactly that script is taken
     as "reload the whole page" the moment it arrives — before the navigation control could hold it back for a
     module switch or drop it for a newer click, and without first emptying the page. The old page stays, dimmed
     and with ISPConfig's loader, until the browser has the new one. If the reload cannot be started, core's own
     handler runs as before (it inserts the script).
     Same form, Design not changed: core redirects to the form itself and says nothing. The theme then shows a short
     "Saved." — only when the answer really is the form without an error box, and not for a tab change. */
  var RELOAD_RE = /^\s*<script\b[^>]*>\s*(?:document|window)\.location\.reload\(\s*(?:true)?\s*\)\s*;?\s*<\/script>\s*$/i;
  var reloading = false;
  function fullReload() {
    if (reloading) return true;
    try {
      reloading = true;
      root.setAttribute('data-dk-reloading', '1');
      window.location.reload();
      return true;
    } catch (e) {
      reloading = false;
      root.removeAttribute('data-dk-reloading');
      return false;
    }
  }
  function settingsSaved(o, text) {
    var d = typeof o.data === 'string' ? o.data : '';
    if (/(^|&)next_tab=[^&]/.test(d)) return;                  // a tab change, not the Save button
    if (/(HEADER|URL|LOGIN)_REDIRECT:/.test(text)) return;     // session ended, or sent somewhere else
    var $pc = $('#pageContent');
    if (!$pc.find('select[name="app_theme"]').length) return;  // the answer is not the settings form
    var failed = $pc.find('.alert-danger, #errorMsg').filter(function () { return $.trim($(this).text()) !== ''; }).length > 0;
    if (!failed) notify(t('saved'), 'ok');
  }
  $.ajaxPrefilter(function (o, orig, xhr) {
    if (o.global === false || typeof o.success !== 'function' || !document.getElementById('pageContent')) return;
    var dt = o.dataTypes && o.dataTypes[0] ? o.dataTypes[0] : (o.dataType || '');
    if (dt === 'json' || dt === 'script') return;
    var p = urlPath(String(o.url || '').replace(/^\.?\//, ''));
    if (!/^[a-z0-9_]+\/[a-z0-9_]+\.php$/i.test(p)) return;    // module pages only (not nav.php, capp.php, polls)
    var isPost = String(o.type || 'GET').toUpperCase() === 'POST', apply = o.success;
    o.success = function (data, status, jq) {
      var x = jq || xhr, text = String((x && x.responseText) || (typeof data === 'string' ? data : ''));
      if (RELOAD_RE.test(text) && fullReload()) return;
      var r = apply.apply(this, arguments);
      if (isPost && p === 'tools/user_settings.php') { try { settingsSaved(o, text); } catch (e) { /* the notice is optional */ } }
      return r;
    };
  });
  // Is ISPConfig.loadContent / capp being called from a user action right now (inline onclick, click handler)
  // and not from the answer of a request (redirect after a module switch or a save)?
  var gest = null;
  function markGesture(e) { gest = e; window.setTimeout(function () { if (gest === e) gest = null; }, 0); }
  function takeGesture() {
    var g = gest;
    if (!g || (window.event && window.event !== g)) return false;
    gest = null;
    return true;
  }
  var coreLoad = null, coreCapp = null;
  function initNavControl() {
    if (!window.ISPConfig || !document.getElementById('dk-sidebar') || coreLoad) return;
    coreLoad = ISPConfig.loadContent; coreCapp = ISPConfig.capp;
    ISPConfig.loadContent = function (page) {
      if (takeGesture() && !navBlocked()) {
        beginIntent();
        // a plain page of another module: switch the module first, so page + menus arrive and are applied together
        var sw = arguments.length < 2 && CFG.syncModule !== false && safeUrl(String(page || '').replace(/^\.?\//, '')) ? needSwitch(page) : null;
        if (sw) { switchThenLoad(sw.mod, page, sw.menus); return; }
      }
      return coreLoad.apply(this, arguments);
    };
    ISPConfig.capp = function () { if (takeGesture() && !navBlocked()) beginIntent(); return coreCapp.apply(this, arguments); };
    if (!document.addEventListener) return;
    $.each(['click', 'mouseup', 'keydown', 'keypress', 'keyup', 'change', 'touchend'], function (_, type) {
      document.addEventListener(type, markGesture, true);                                        // first listener of the event …
      window.addEventListener(type, function (e) { if (gest === e) gest = null; }, false);       // … and the last one
    });
    // capture phase = before ISPConfig's own click handlers (which drop the click while requests are running)
    document.addEventListener('click', function (e) {
      var el = e.target && e.target.closest ? e.target : null;
      if (!el) return;
      var icon = el.closest('#main-navigation a[data-module]');
      if (icon && !icon.hasAttribute('data-capp')) {
        // the icon the rail shows as active has no action in ISPConfig. While a switch to another module is still
        // running (rail not updated yet), or the page on screen belongs to another module, it is a real request.
        e.preventDefault();                                    // (href="#": no stray history entry)
        var mod = icon.getAttribute('data-module');
        if (navBlocked() || !(navPending() || (contentModule() && contentModule() !== mod))) return;
        beginIntent();
        coreCapp.call(ISPConfig, mod);
        return;
      }
      if (!el.closest(NAV_SEL)) return;
      if (navPending() && !navBlocked()) beginIntent();
    }, true);
  }
  $(document).ajaxComplete(function (e, xhr) {
    for (var i = nav.reqs.length - 1; i >= 0; i--) if (nav.reqs[i].xhr === xhr) nav.reqs.splice(i, 1);
    busy();
    scheduleGuard();
  });
  function scheduleGuard() {
    if (nav.timer) return;
    nav.timer = window.setTimeout(function () { nav.timer = 0; guard(); }, 0);   // after the DOM observers of this answer
  }
  function contentModule() { return urlPath(lastUrl).split('/')[0] || ''; }
  function inRail(mod) { return !!mod && $('#main-navigation [data-module="' + mod + '"]').length > 0; }
  // Which module does the menu panel show? The module most of its links point into; ISPConfig's dashboard module
  // has no menu items, only the "latest news" block. '' = cannot tell.
  function panelModule() {
    var $side = $('#sidebar'), cnt = {}, best = '', n = 0;
    $side.find('li a[data-load-content]').each(function () {
      var m = urlPath(this.getAttribute('data-load-content')).split('/')[0];
      if (m) { cnt[m] = (cnt[m] || 0) + 1; if (cnt[m] > n) { n = cnt[m]; best = m; } }
    });
    if (best) return inRail(best) ? best : '';
    return $side.children('header').length && !$side.find('.dk-navgroup').length && inRail('dashboard') ? 'dashboard' : '';
  }
  function quietCapp(mod, reloadMenus) {
    var g = nav.gen, x = $.ajax({ type: 'GET', url: 'capp.php', data: 'mod=' + encodeURIComponent(mod), dataType: 'html', global: false, timeout: 20000 });
    nav.sync = x; nav.dirty = false; nav.srv = mod;
    x.always(function () {
      if (nav.sync === x) nav.sync = null;
      if (g !== nav.gen) return;                               // the user has moved on meanwhile
      if (tx && tx.wait) {                                     // a held page is waiting for these menus
        if (x.status !== 200) { txFail(x); return; }
        tx.wait = false;
      }
      if (reloadMenus) ISPConfig.loadMenus(); else scheduleGuard();
    });
  }
  function guard() {
    if (!window.ISPConfig || !coreLoad || navPending()) return;
    var want = contentModule(), rail = activeModule();
    if (!want || !rail || !inRail(want)) return;               // menus not loaded yet / not a module page (login/…)
    var panel = panelModule(), ok = rail === want && (!panel || panel === want);
    if (!ok && (!panel || panel === rail)) {
      // a page of another module that the current module menu itself links to stays where it is
      $('#sidebar li a[data-load-content]').each(function () { if (urlPath(this.getAttribute('data-load-content')) === urlPath(lastUrl)) ok = true; });
    }
    // screen consistent. Server too? Not sure after an aborted switch, or when the last switch asked for another
    // module (its menus were aborted before they arrived): one quiet request puts the session right.
    if (ok) { if (rail === want && (nav.dirty || (nav.srv && nav.srv !== want))) quietCapp(want, false); return; }
    if (CFG.syncModule === false) return;
    if (nav.triesGen !== nav.gen) { nav.triesGen = nav.gen; nav.tries = 0; }
    if (nav.tries >= 2) return;                                // asked twice for this page and it did not help: leave it
    nav.tries++;
    quietCapp(want, true);
  }

  /* Browser history. ISPConfig loads every page by AJAX into one document and has no history handling: Back
     leaves the panel, a reload opens the module's start page. Here every plain page view (GET of a list / form /
     view page — never deletes, actions or anything with a CSRF token) becomes a history entry; Back/Forward load
     that URL again through ISPConfig.loadContent, and a reload reopens it. Off: DK_CONFIG.history = false. */
  var HIST_OK = !!(window.history && window.history.pushState) && CFG.history !== false;
  var restoreGen = -1, histReady = false, histCur = null, histSeq = 0;
  function currentUser() { return $.trim($('.dk-user-name').first().text()); }
  function safeUrl(u) {
    u = String(u || '');
    if (!/^[a-z0-9_]+\/[a-z0-9_]+\.php(\?[A-Za-z0-9_\-.,%|=&\[\]+:@]*)?$/i.test(u)) return false;
    if (/^(login|nav|capp|keepalive|datalogstatus)\b/i.test(u)) return false;
    return !/(_del\.php|delete|remove|logout|login_as|_action|resync|import|export|message_ack|ajax|update_packagelist|osupdate|ispcupdate|_csrf|token|[?&]hide=)/i.test(u);   // hide= : the donation box "Hide" link changes a setting
  }
  function validState(st) { return st && st.dk === 1 && st.user === currentUser() && safeUrl(st.url) ? st : null; }
  function histRecord(url, isGet) {
    if (!HIST_OK || !currentUser() || !document.getElementById('dk-sidebar')) return;
    var wasRestoring = restoreGen === nav.gen; restoreGen = -1;
    if (!isGet || !safeUrl(url)) return;
    var st = { dk: 1, url: url, user: currentUser(), n: ++histSeq }, cur = window.history.state;
    try {
      if (!histReady || wasRestoring || (cur && cur.dk === 1 && cur.url === url)) window.history.replaceState(st, '');
      else window.history.pushState(st, '');
    } catch (e) { /* history unavailable: ISPConfig's own behaviour */ }
    histReady = true; histCur = st;
  }
  function initHistory() {
    if (!HIST_OK || !document.getElementById('dk-sidebar')) return;
    // reload / return to this document: reopen the page that was shown (ISPConfig.loadInitContent reads data-startpage)
    var st = validState(window.history.state), pc = document.getElementById('pageContent');
    if (st && pc && currentUser()) { pc.setAttribute('data-startpage', st.url); histSeq = st.n || 0; }
    window.addEventListener('popstate', function (e) {
      var s = validState(e.state);
      if (!s) {
        // an entry without our state: ISPConfig's href="#" links (tabs, some buttons) add a bare "#" entry.
        // Give it the page that is shown, so Back/Forward over it has somewhere to go.
        if (!e.state && histCur) {
          histCur = { dk: 1, url: histCur.url, user: histCur.user, n: ++histSeq };
          try { window.history.replaceState(histCur, ''); } catch (err) { /* ignore */ }
        }
        return;
      }
      if (!window.ISPConfig) return;
      if (histCur && histCur.url === s.url) {
        // a "#" twin of the page that is already shown: keep going in the same direction, so one Back is one page
        var dir = (s.n || 0) < (histCur.n || 0) ? -1 : 1;
        histCur = s;
        try { window.history.go(dir); } catch (err) { /* ignore */ }
        return;
      }
      histCur = s;
      closeNav(false);
      beginIntent();                           // Back/Forward is a user navigation: older requests are dropped
      restoreGen = nav.gen;
      var sw = coreLoad && CFG.syncModule !== false ? needSwitch(s.url) : null;
      if (sw) switchThenLoad(sw.mod, s.url, sw.menus);         // another module: switch first, apply page + menus together
      else (coreLoad || ISPConfig.loadContent).call(ISPConfig, s.url);
    });
    // a page restored from the browser's back/forward cache shows an old state of the session: load it fresh
    window.addEventListener('pageshow', function (e) { if (e.persisted) window.location.reload(); });
  }
  // What was really requested? The hook only gets the base URL (and for the first page always "dashboard/dashboard.php").
  var sent = {};
  $(document).ajaxSend(function (e, xhr, o) {
    if (!o || !o.url) return;
    var u = String(o.url).replace(/([?&])_=\d+/, '$1').replace(/[?&]$/, '');
    sent[urlPath(u)] = { type: String(o.type || 'GET').toUpperCase(), url: u.replace(/^\.?\//, '') };
    var kind = reqKind(o);
    if (kind) { nav.reqs.push({ xhr: xhr, kind: kind, gen: nav.gen }); busy(); }
    if (kind === 'capp') { var cm = /[?&]mod=([^&]*)/.exec(u); if (cm) nav.srv = decodeURIComponent(cm[1]); }
  });
  var firstLoad = true;
  function resolveLoad(url, data) {
    url = String(url || '').replace(/^\.?\//, '');
    var isGet = !data || data === '&[object Object]';
    if (firstLoad) {
      firstLoad = false;
      // ISPConfig.loadInitContent() reports 'dashboard/dashboard.php' whatever it loaded (data-startpage)
      var sp = $('#pageContent').attr('data-startpage');
      // (not when the dashboard itself was requested meanwhile — a fast click during the first load)
      if (sp && url === 'dashboard/dashboard.php' && !sent['dashboard/dashboard.php'] && !$('#pageContent [data-dk-dash]').length) url = String(sp).replace(/^\.?\//, '');
    }
    var s = sent[urlPath(url)];
    if (s) { isGet = s.type === 'GET'; if (isGet && urlPath(s.url) === urlPath(url)) url = s.url; }
    return { url: url, isGet: isGet };
  }

  function observe(id, fn) {
    var el = document.getElementById(id);
    if (!el || !window.MutationObserver) return;
    new window.MutationObserver(function () { fn(); }).observe(el, { childList: true });
  }

  /* ------------------------------------------------------- quick actions */
  // Home panel "Quick actions" (fix round 6, U3: the panel is the only place — the dashboard card is gone).
  // Icons come from the menu icon table (menuIcon(page)), so they match the module menus.
  var QUICK = [
    { module: 'sites',  page: 'sites/web_vhost_domain_edit.php', key: 'qa.website' },
    { module: 'mail',   page: 'mail/mail_user_edit.php',          key: 'qa.mailbox' },
    { module: 'sites',  page: 'sites/database_edit.php',          key: 'qa.database' },
    { module: 'dns',    page: 'dns/dns_wizard.php',               key: 'qa.dnszone' },
    { module: 'client', page: 'client/client_edit.php',           key: 'qa.client' }
  ];
  function initQuickActions() {
    // (also used by the "Open Monitor" link of the server status card)
    $(document).on('click', '[data-dk-quick-module]', function (e) {
      e.preventDefault();
      if (!window.ISPConfig || navBlocked()) return;           // a save is running: ISPConfig's "wait" rule
      var mod = this.getAttribute('data-dk-quick-module'), page = this.getAttribute('data-dk-quick-page');
      beginIntent();
      // switch module the same way the module bar does (capp.php), then open the page; applied together with the menus
      switchThenLoad(mod, page, true);
    });
  }

  /* --------------------------------------------- list decoration (badges) */
  var MONO_COLUMNS = ['ip_address', 'ipv6_address', 'data', 'dir', 'document_root', 'username', 'login',
    'database_name', 'database_user', 'origin', 'ns', 'mbox', 'source', 'destination', 'server_name', 'hostname'];
  var WIDE_COLUMNS = ['source', 'destination', 'company_name', 'contact_name'];
  var NOWRAP_COLUMNS = ['email', 'domain', 'origin', 'login', 'username', 'server_id', 'ns', 'mbox'];
  // Break opportunities (<wbr>) after separators inside a cell's text; the text itself is unchanged (a <wbr> is not
  // copied, textContent stays the same). A run without any separator that is longer than 24 characters (a DNS
  // label may have 63, a DKIM key has hundreds) gets one every 16 characters, so one odd value cannot stretch
  // the column.
  function softBreaks(cell, re) {
    if (cell.getAttribute('data-dk-wbr')) return;
    cell.setAttribute('data-dk-wbr', '1');
    var nodes = [], w = document.createTreeWalker(cell, 4, null, false), n;   // 4 = NodeFilter.SHOW_TEXT
    while ((n = w.nextNode())) if ($.trim(n.nodeValue) && !$(n.parentNode).closest('.dk-badge').length) nodes.push(n);
    $.each(nodes, function (_, node) {
      var pieces = [];
      $.each(node.nodeValue.split(re), function (i, part) {
        // split() with a capturing group: text, separator, text, separator, … — the separator ends its piece
        if (i % 2 === 1) { pieces[pieces.length - 1] += part; return; }
        pieces.push(part);
      });
      var out = [];
      $.each(pieces, function (_, p) {
        var cur = '';
        $.each(p.match(/\S+|\s+/g) || [], function (_, tok) {
          if (tok.length <= 24 || /\s/.test(tok)) { cur += tok; return; }
          for (var i = 0; i < tok.length; i += 16) { if (i) { out.push(cur); cur = ''; } cur += tok.substr(i, 16); }
        });
        out.push(cur);
      });
      if (out.length < 2) return;
      var frag = document.createDocumentFragment();
      $.each(out, function (i, p) { if (i) frag.appendChild(document.createElement('wbr')); frag.appendChild(document.createTextNode(p)); });
      node.parentNode.replaceChild(frag, node);
    });
  }
  function decorateTables(scope) {
    $(scope).find('table.table').each(function () {
      var $table = $(this);
      var $heads = $table.find('thead tr').first().children('th, td');
      $heads.each(function (idx) {
        var col = this.getAttribute('data-column');
        if (!col) return;
        var $cells = $table.find('tbody tr:not(.tbl_row_noresults)').find('> td:eq(' + idx + ')');
        if (!$cells.length) return;
        // yes/no columns: learn the translated labels from the filter <select name="search_<col>">
        var $filter = $table.find('thead select[name="search_' + col + '"]');
        var map = {};
        if ($filter.length) {
          $filter.find('option').each(function () {
            var v = this.value, txt = $.trim($(this).text());
            // most lists use y/n, the DNS lists Y/N (dns_soa.list.php, dns_a.list.php)
            var lv = String(v).toLowerCase();
            if (txt && (lv === 'y' || lv === 'n')) map[txt] = lv;
          });
        }
        if (!$.isEmptyObject(map)) {
          $cells.each(function () {
            var $target = $(this).children('a').length === 1 ? $(this).children('a') : $(this);
            if ($target.find('.dk-badge').length) return;
            var txt = $.trim($target.text());
            if (map[txt]) {
              // keep child elements (DNS zones: DNSSEC key icon inside the same link), replace only the text
              var $keep = $target.children().detach();
              $target.empty().append($('<span class="dk-badge"></span>').addClass(map[txt] === 'y' ? 'dk-badge--on' : 'dk-badge--off').text(txt));
              if ($keep.length) $target.append(' ').append($keep);
            }
          });
        } else if (col === 'type' && $table.find('thead select[name="search_type"]').length && /dns\//.test($cells.find('a').attr('data-load-content') || '')) {
          $cells.each(function () {
            var $a = $(this).children('a');
            if (!$a.length || $a.find('.dk-badge').length) return;
            var txt = $.trim($a.text());
            if (txt) $a.empty().append($('<span class="dk-badge dk-badge--type"></span>').text(txt));
          });
        }
        var isDnsRecords = col === 'name' && $table.find('thead select[name="search_type"]').length > 0 && $table.find('thead th[data-column="data"]').length > 0;
        if (MONO_COLUMNS.indexOf(col) !== -1 || isDnsRecords) $cells.addClass('dk-cell-mono');   // DNS records: name AND data
        // fix round 9 (D3): host names wrap at dots / hyphens, never mid-word — DNS records NAME (+ soft break
        // opportunities in DATA, which may still wrap anywhere when a long TXT / DKIM value needs it)
        if (isDnsRecords) $cells.addClass('dk-cell-host').each(function () { softBreaks(this, /([.\-_])(?=[^\s.\-_])/); });
        if (col === 'data' && $table.find('thead select[name="search_type"]').length && $table.find('thead th[data-column="name"]').length) {
          $cells.addClass('dk-cell-data').each(function () { softBreaks(this, /([.\-_:;])(?=[^\s.\-_:;])/); });
        }
        if (WIDE_COLUMNS.indexOf(col) !== -1) $cells.addClass('dk-col-wide');
        if (NOWRAP_COLUMNS.indexOf(col) !== -1) $cells.addClass('dk-col-nowrap');
      });
    });
  }

  /* Phone card lists (fix round 3, P5). Below 600px danke.css shows every list row as a stacked card. The markup stays
     ISPConfig's table; here the cells only get what CSS needs: data-label (the column header), the key column
     (card title), the action cell, empty cells, and a "Filters" button that opens the header/filter row. */
  var PRIMARY_COLUMNS = ['domain', 'email', 'origin', 'company_name', 'database_name', 'database_user', 'username', 'name', 'source',
    'hostname', 'server_name', 'template_name', 'subject', 'title', 'login', 'contact_name', 'ip_address'];
  var NOT_PRIMARY = ['active', 'id', 'client_id', 'domain_id', 'sys_groupid', 'server_id', 'type', 'ttl', 'aux', 'locked', 'customer_no'];
  function headLabel(th) {
    var $c = $(th).clone();
    $c.find('select, input, button, .select2-container').remove();
    return $.trim($c.text().replace(/\s+/g, ' '));
  }
  function cardTables(scope) {
    $(scope).find('.table-wrapper table.table').each(function () {
      var $table = $(this), $thead = $table.children('thead.dark');
      if (!$thead.length) return;
      var $hrow = $thead.children('tr').first(), $frow = $thead.children('tr').eq(1);
      var labels = [], cols = [], limitTh = null;
      $hrow.children('th, td').each(function () {
        var span = parseInt(this.getAttribute('colspan'), 10) || 1;
        labels.push(headLabel(this)); cols.push(this.getAttribute('data-column') || '');
        for (var k = 1; k < span; k++) { labels.push(''); cols.push(''); }
        if ($(this).find('select.search_limit, select[name="search_limit"]').length) limitTh = this;
      });
      if (labels.length < 2) return;
      // key column: a known name column, else the first real data column, else the first column
      var primary = -1, i;
      for (i = 0; i < PRIMARY_COLUMNS.length && primary === -1; i++) primary = cols.indexOf(PRIMARY_COLUMNS[i]);
      for (i = 0; i < cols.length && primary === -1; i++) if (cols[i] && NOT_PRIMARY.indexOf(cols[i]) === -1 && !$thead.find('select[name="search_' + cols[i] + '"]').length) primary = i;
      if (primary === -1) primary = 0;
      $table.children('tbody').children('tr:not(.tbl_row_noresults)').each(function () {
        var $tds = $(this).children('td');
        $tds.each(function (idx) {
          var $td = $(this);
          if (labels[idx] && idx !== primary) this.setAttribute('data-label', labels[idx]); else this.removeAttribute('data-label');
          $td.toggleClass('dk-cell-primary', idx === primary);
          var actions = idx === $tds.length - 1 && idx !== primary && !labels[idx] && $td.find('.btn, button').length > 0;
          $td.toggleClass('dk-cell-actions', actions);
          $td.toggleClass('dk-cell-empty', !actions && idx !== primary && !$td.children().length && !$.trim($td.text().replace(/\u00a0/g, ' ')));
        });
      });
      $table.addClass('dk-cards');
      // filter row → labelled fields; rows-per-page select of the header joins them
      if (limitTh) { $(limitTh).addClass('dk-th-limit').attr('data-label', t('list.rows')); }
      var active = 0;
      if ($frow.length) {
        $frow.children('td, th').each(function (idx) {
          if (labels[idx]) this.setAttribute('data-label', labels[idx]);
          $(this).find('input[type="text"], input:not([type]), select').each(function () { if ($(this).val()) active++; });
        });
      }
      if (!$frow.find('input, select').length && !limitTh) return;
      var $tools = $table.prev('.dk-list-tools');
      if (!$tools.length) {
        $tools = $('<div class="dk-list-tools"></div>').append(
          $('<button type="button" class="btn btn-default btn-sm" data-dk-filter-toggle aria-expanded="false"></button>')
            .append('<i class="bi bi-funnel" aria-hidden="true"></i>').append($('<span></span>').text(t('list.filters'))).append('<span class="dk-filter-count"></span>'));
        $tools.insertBefore($table);
      }
      // a filter is set: show the block open, so it is obvious why the list is short
      $tools.find('.dk-filter-count').text(active ? String(active) : '');
      if (active) { $table.addClass('dk-filters-open'); $tools.find('[data-dk-filter-toggle]').attr('aria-expanded', 'true'); }
    });
  }
  $(document).on('click', '[data-dk-filter-toggle]', function () {
    var $t = $(this).closest('.dk-list-tools').next('table').toggleClass('dk-filters-open');
    this.setAttribute('aria-expanded', $t.hasClass('dk-filters-open') ? 'true' : 'false');
  });

  /* Tab row (P7): when the tabs do not fit, the row scrolls sideways. Mark which edge has more tabs (CSS fades
     that edge) and bring the active tab into view. */
  function tabsEdges(sc) {
    var max = sc.scrollWidth - sc.clientWidth, x = sc.scrollLeft;
    $(sc).toggleClass('can-scroll-left', max > 1 && x > 1).toggleClass('can-scroll-right', max > 1 && x < max - 1);
  }
  function tabsOverflow(scope) {
    $(scope).find('.dk-tabs-scroller').each(function () {
      var sc = this, $act = $(sc).find('.nav-tabs > li.active').first();
      if (!sc.dkTabs) {
        sc.dkTabs = true;
        sc.addEventListener('scroll', function () { tabsEdges(sc); }, { passive: true });
        if ($act.length && sc.scrollWidth > sc.clientWidth) {
          var a = $act[0].getBoundingClientRect(), s = sc.getBoundingClientRect();
          if (a.left < s.left + 40 || a.right > s.right - 40) sc.scrollLeft += (a.left + a.width / 2) - (s.left + s.width / 2);
        }
      }
      tabsEdges(sc);
    });
  }

  /* ------------------------------------------------------- limits tiles */
  var KEY_LIMITS = ['limit_web_domain', 'limit_web_quota', 'limit_maildomain', 'limit_mailbox', 'limit_mailquota',
    'limit_database', 'limit_database_quota', 'limit_dns_zone', 'limit_ftp_user', 'limit_client'];
  function decorateLimits(scope) {
    $(scope).find('[data-dk-limits]').each(function () {
      var $box = $(this), $tiles = $box.find('.dk-tile'), others = 0;
      $tiles.each(function () {
        var key = KEY_LIMITS.indexOf(this.getAttribute('data-field')) !== -1;
        $(this).toggleClass('is-key', key);
        if (!key) others++;
      });
      var keys = $tiles.length - others;
      // collapse only if there is something to hide and enough key tiles to show
      if (others > 0 && keys >= 3) {
        $box.addClass('is-collapsible');
        $box.find('[data-dk-limits-toggle]').prop('hidden', false);
      }
    });
  }
  $(document).on('click', '[data-dk-limits-toggle]', function () {
    var $box = $(this).closest('[data-dk-limits]').toggleClass('is-expanded');
    $(this).attr('aria-expanded', $box.hasClass('is-expanded') ? 'true' : 'false');
  });

  /* ----------------------------------------------------- forms: unit rows */
  // Core templates print units as loose text beside a half-width field (<div class="col-sm-3 input-sm">&nbsp;MB</div>).
  // Only classes are added here (no element is moved or wrapped); danke.css draws the unit as a joined addon.
  var UNIT_RE = /^(?:[KMGT]?B|[KMGT]iB|%|s|ms|sec|min|h|px)$/i;
  // Core templates with unbalanced markup (fix round 7, V3). System → Main Config → Misc: the "Left Admin Dashlets"
  // row has no <div class="form-group"> around label + field, and its closing </div> ends the tab pane early, so
  // the rows after it are no longer inside the pane. Repaired in the DOM only (same nodes, same form, same order):
  //  1. a label.control-label + its field column that are not inside a .form-group get one;
  //  2. what follows the (single) tab pane inside .tab-content is moved back into the pane.
  function repairForms(scope) {
    $(scope).find('label.control-label[class*="col-"]').each(function () {
      var $l = $(this);
      if ($l.parent().is('.form-group')) return;
      var $f = $l.next('div[class*="col-"]');
      if (!$f.length) return;
      $l.add($f).wrapAll('<div class="form-group dk-repaired"></div>');
    });
    $(scope).find('.tab-content').each(function () {
      var $panes = $(this).children('.tab-pane');
      if ($panes.length !== 1) return;
      var pane = $panes[0], n = pane.nextSibling, next;
      if (!$(pane).nextAll('.form-group, div, fieldset').length) return;
      while (n) { next = n.nextSibling; pane.appendChild(n); n = next; }   // native move: scripts are not run again
    });
  }
  function decorateForms(scope) {
    try { repairForms(scope); } catch (e) { /* the page stays as ISPConfig printed it */ }
    $(scope).find('.form-group > div.col-sm-3.input-sm').each(function () {
      var $hint = $(this);
      if ($hint.hasClass('dk-unit') || $hint.hasClass('dk-hint-empty')) return;
      if ($hint.children().length) return;                       // real content (links, inputs): leave alone
      var txt = $.trim($hint.text().replace(/\u00a0/g, ' '));
      if (!txt) { $hint.addClass('dk-hint-empty'); return; }
      var $field = $hint.prev('div[class*="col-sm-"]');
      if (!UNIT_RE.test(txt) || !$field.length) return;
      if ($field.children().length !== 1 || !$field.children('input.form-control').length) return;
      $field.addClass('dk-has-unit');
      $hint.addClass('dk-unit').text(txt);
      $hint.parent().addClass('dk-unit-row');
    });
  }

  /* --------------------------------------------- select2: no select-on-blur */
  // ISPConfig's own ispconfig.js (loaded from themes/default, never copied into this theme since r11) creates every
  // combo box with `selectOnBlur: true`: clicking away from an open list selects the entry the pointer happened to
  // rest on — a list filter then filters, a form select changes its value (live audit A2, decision 1 of fix
  // round 1). The theme turns that off for every select2 ISPConfig creates, without touching core's file:
  //   1. $.fn.select2 is wrapped once (select2 is loaded after this file, so at DOM ready, before ISPConfig's first
  //      init): an options object always leaves here with selectOnBlur: false, whatever the caller asked for;
  //      method calls ('val', 'destroy', …) pass through unchanged.
  //   2. safety net: after each content / menu load every existing instance gets opts.selectOnBlur = false
  //      (select2 3.x reads the option at blur time), so an instance created before the wrapper is covered too.
  function patchSelect2() {
    var orig = $.fn.select2;
    if (!orig) return false;
    if (orig.dkNoBlurSelect) return true;
    var wrapped = function (first) {
      var args = Array.prototype.slice.call(arguments);
      if (args.length === 0 || $.isPlainObject(first)) args[0] = $.extend({}, first, { selectOnBlur: false });
      return orig.apply(this, args);
    };
    $.extend(wrapped, orig);             // defaults, ajaxDefaults, locales, the classes select2 exposes
    wrapped.dkNoBlurSelect = true;
    if (wrapped.defaults) wrapped.defaults.selectOnBlur = false;
    $.fn.select2 = wrapped;
    return true;
  }
  function select2NoBlurSelect(scope) {
    try {
      patchSelect2();
      $(scope || document).find('select, input').each(function () {
        var s2 = $(this).data('select2');
        if (s2 && s2.opts) s2.opts.selectOnBlur = false;
      });
    } catch (e) { /* core's behaviour stays */ }
  }
  patchSelect2();                        // a no-op here on the panel (select2 not loaded yet); see the boot block

  /* --------------------------------------------- select2: mark current value */
  // select2 3.x has one class (.select2-highlighted) for "pointed at" and "keyboard position" and none for the
  // current value of a single select. Mark the current value so the open list can show it with a check.
  function markSelectedResult(el) {
    try {
      var $el = $(el);
      if (!$el.data('select2') || $el.prop('multiple')) return;
      var val = $el.val();
      $('.select2-drop-active .select2-results .select2-result').each(function () {
        var d = $(this).data('select2-data');
        $(this).toggleClass('dk-selected', !!d && val !== null && val !== '' && String(d.id) === String(val));
      });
    } catch (e) { /* cosmetic only */ }
  }
  // The open list is attached to its box as one panel (danke.css §17). A list wider than the box (narrow filter
  // selects) gets a class so its free corner can be rounded.
  function markDropWidth(el) {
    try {
      var s2 = $(el).data('select2');
      if (!s2 || !s2.dropdown || !s2.container) return;
      s2.dropdown.toggleClass('dk-drop-wide', s2.dropdown.outerWidth() > s2.container.outerWidth() + 1);
    } catch (e) { /* cosmetic only */ }
  }
  $(document).on('select2-open select2-loaded', function (e) { markSelectedResult(e.target); markDropWidth(e.target); });

  /* ------------------------------------------------------------ charts */
  // Monitor → System State and the dashboard "metrics" dashlet create Chart.js charts in the core templates
  // (white canvas, white legend swatch, default dark text). Without touching those templates:
  // colours come from the theme tokens, the legend swatch gets the series colour, charts follow the theme toggle.
  function cssVar(name, fallback) {
    var v = '';
    try { v = $.trim(window.getComputedStyle(root).getPropertyValue(name)); } catch (e) { v = ''; }
    return v || fallback;
  }
  function withAlpha(hex, a) {
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
    return m ? 'rgba(' + parseInt(m[1], 16) + ', ' + parseInt(m[2], 16) + ', ' + parseInt(m[3], 16) + ', ' + a + ')' : hex;
  }
  // Phones (fix round 7, V1): the core templates give the canvases height="30" (aspect ratio 10:1) — fine on a wide
  // screen, a 30px line at 390px. Below 768px the chart fills a box with a fixed height instead (danke.css
  // .dk-chart-box); from 768px up the chart is exactly as ISPConfig sizes it. The legend stays above the plot.
  // Leaving the phone layout the chart gets ISPConfig's own aspect ratio back (remembered before the first switch).
  var CHART_COMPACT = '(max-width: 767px)';
  function chartsCompact() { try { return !!(window.matchMedia && window.matchMedia(CHART_COMPACT).matches); } catch (e) { return false; } }
  function sizeChart(chart, compact) {
    var box = chart.canvas.parentNode;
    if (!box || !$(chart.canvas).closest('#pageContent').length) return false;
    var was = $(box).hasClass('dk-chart-box');
    if (!was && !compact) return false;                       // desktop, never switched: untouched
    if (was && compact && chart.options.maintainAspectRatio === false) return false;
    if (!chart.$dkRatio) chart.$dkRatio = chart.aspectRatio || (chart.height ? chart.width / chart.height : 10);
    $(box).toggleClass('dk-chart-box', compact);
    chart.options.maintainAspectRatio = !compact;
    if (!compact) chart.options.aspectRatio = chart.$dkRatio;
    var lg = chart.options.plugins && chart.options.plugins.legend;
    if (lg) lg.position = 'top';
    return true;
  }
  function themeCharts() {
    var C = window.Chart;
    if (!C || !C.defaults) return;
    var compact = chartsCompact();
    try {
      var text = cssVar('--c-text-muted', '#4A4E50'), grid = cssVar('--c-border', '#D5DEE5'), line = cssVar('--c-accent', '#3BA899');
      C.defaults.color = text;
      C.defaults.borderColor = grid;
      if (C.defaults.font) { C.defaults.font.family = cssVar('--font-sans', 'sans-serif'); C.defaults.font.size = 12; }
      $.each(C.instances || {}, function (_, chart) { try {
        if (!chart || !chart.canvas || !chart.options) return;
        $.each((chart.data && chart.data.datasets) || [], function (_, ds) {
          ds.borderColor = line; ds.backgroundColor = withAlpha(line, 0.18); ds.pointBackgroundColor = line; ds.pointBorderColor = line;
        });
        var labels = chart.options.plugins && chart.options.plugins.legend && chart.options.plugins.legend.labels;
        if (labels) {
          labels.color = text;
          var orig = labels.generateLabels;
          if (typeof orig === 'function' && !orig.dkWrapped) {
            var wrapped = function (ch) {
              var items = orig.call(this, ch) || [];
              $.each(items, function (_, it) {
                var ds = ch.data.datasets[it.datasetIndex] || {};
                it.fillStyle = ds.backgroundColor; it.strokeStyle = ds.borderColor; it.lineWidth = 1;
                it.pointStyle = undefined; it.fontColor = C.defaults.color;
              });
              return items;
            };
            wrapped.dkWrapped = true;
            labels.generateLabels = wrapped;
          }
        }
        // Axis colours: Chart.js copies the defaults into each chart's scale options when the chart is created, so a
        // chart drawn in light mode kept the light grid after a live switch to dark (fix round 5, T3) — set them per scale.
        $.each(chart.options.scales || {}, function (_, sc) {
          if (!sc) return;
          if (sc.grid) { sc.grid.color = grid; sc.grid.tickColor = grid; }
          if (sc.border) sc.border.color = grid;
          if (sc.ticks) { sc.ticks.color = text; sc.ticks.backdropColor = 'transparent'; }
          if (sc.title) sc.title.color = text;
        });
        var resized = sizeChart(chart, compact);
        chart.update('none');
        if (resized) chart.resize();
      } catch (e) { /* this chart stays as ISPConfig drew it */ } });
    } catch (e) { /* charts stay as ISPConfig drew them */ }
  }

  /* ------------------------------------------------------- monitor pages */
  var STATE_CLASS = { 'alert-success': 'ok', 'alert-warning': 'warning', 'alert-danger': 'critical', 'alert-info': 'info' };
  var STATE_BADGE = { ok: 'dk-badge--on', info: 'dk-badge--off', unknown: 'dk-badge--off', warning: 'dk-badge--warn', critical: 'dk-badge--err', error: 'dk-badge--err' };
  var STATE_RANK = { ok: 0, unknown: 1, info: 2, warning: 3, critical: 4, error: 5 };
  // the five numbers core prints after the state word, always in this order (show_sys_state.php::_getServerState)
  var COUNT_ORDER = ['unknown', 'info', 'warning', 'critical', 'error'];
  // an ISPConfig language key that was not translated (fix round 11, S1): $app->lng() loads the wordbook of the
  // SESSION module, so a Monitor page fetched while the session is in another module comes back with raw keys
  var RAW_KEY = /[a-z]+(?:_[a-z]+)+_txt/i;
  function noRawKey(s) { s = $.trim(String(s == null ? '' : s)); return RAW_KEY.test(s) ? '' : s; }
  // "(Ubuntu 22.04.5 LTS (Jammy Jellyfish)) ISPConfig 3.3.2p1" → ["Ubuntu 22.04.5 LTS (Jammy Jellyfish)", "ISPConfig 3.3.2p1"]
  function splitServerMeta(rest) {
    rest = $.trim(rest);
    if (rest.charAt(0) !== '(') return ['', rest];
    for (var i = 0, depth = 0; i < rest.length; i++) {
      var c = rest.charAt(i);
      if (c === '(') depth++;
      else if (c === ')' && --depth === 0) return [$.trim(rest.slice(1, i)), $.trim(rest.slice(i + 1))];
    }
    return ['', ''];                                             // unbalanced: show nothing rather than half a bracket
  }
  // Read one server block printed by monitor/show_sys_state.php (_getServerState) as DATA — nothing here depends on
  // the language of the answer (it may be English, translated, or raw keys):
  //   alert class + the word after the first colon = core's state; the last bracket of the first <p> = five counts
  //   by position (unknown, info, warning, critical, error); the link = server id|name; <h3> = "… name (OS) ISPConfig x".
  // state = the worst of core's state and the non-zero counts: core files e.g. pending package updates under
  // "warning" while it rates the server "info" (system_update), so its own state word can understate the counts.
  function readServerState(alertEl) {
    var $a = $(alertEl), core = 'info';
    $.each(STATE_CLASS, function (cls, st) { if ($a.hasClass(cls)) core = st; });
    var $h = $a.find('h3').first().clone(); $h.find('.dk-badge').remove();
    var title = $.trim($h.text()), line = $.trim($a.find('p').first().text());
    var word = /:\s*([a-z_]+)\s*\(/i.exec(line);                 // the raw state word ISPConfig prints (ok, warning, critical, error…)
    if (word && STATE_RANK[word[1].toLowerCase()] !== undefined) core = word[1].toLowerCase();
    var counts = null, par = /\(([^()]*)\)\s*$/.exec(line);
    if (par) {
      var nums = [], parts = par[1].split(',');
      if (parts.length === COUNT_ORDER.length) $.each(parts, function (_, part) { var n = /^\s*(\d+)(?!\d)/.exec(part); if (n) nums.push(+n[1]); });
      if (nums.length !== COUNT_ORDER.length) nums = $.map(par[1].match(/\d+/g) || [], Number);   // a wording with a comma inside
      if (nums.length === COUNT_ORDER.length) { counts = {}; $.each(COUNT_ORDER, function (i, k) { counts[k] = nums[i]; }); }
    }
    var state = core;
    if (counts) $.each(COUNT_ORDER, function (_, k) { if (counts[k] > 0 && STATE_RANK[k] > STATE_RANK[state]) state = k; });
    var link = $a.find('a[data-load-content*="state=server"]').first().attr('data-load-content') || '';
    var name = '', rest = '', viaLink = /[?&]server=[^|&]*\|([^&]+)/.exec(link);
    if (viaLink) { try { name = decodeURIComponent(viaLink[1]); } catch (e) { name = viaLink[1]; } }
    var at = name ? title.indexOf(name) : -1;
    if (at >= 0) rest = title.slice(at + name.length);
    else { var m = /^[^:]+:\s*(\S+)\s*(.*)$/.exec(title); name = name || (m ? m[1] : title); rest = m ? m[2] : ''; }
    var meta = $.grep($.map(splitServerMeta(rest), noRawKey), function (x) { return x !== ''; }).join(' · ');
    return { state: state, core: core, counts: counts, attention: STATE_RANK[state] >= STATE_RANK.warning,
      name: noRawKey(name), meta: meta, link: link };
  }
  // "2 critical, 1 warning" — our own words (EN/PT), worst first, only what is not zero
  function countText(counts) {
    if (!counts) return '';
    var out = [];
    $.each(COUNT_ORDER.slice().reverse(), function (_, k) { var n = counts[k]; if (n > 0) out.push(n + ' ' + t('count.' + k + (n === 1 ? '1' : ''))); });
    return out.join(', ');
  }
  function stateBadge(state) {
    return $('<span class="dk-badge"></span>').addClass(STATE_BADGE[state] || 'dk-badge--off').text(t('state.' + state));
  }
  function decorateMonitor(scope) {
    $(scope).find('.stateview .alert').each(function () {
      var $h = $(this).find('h3').first();
      if (!$h.length || $h.find('.dk-badge').length) return;
      $h.append(stateBadge(readServerState(this).state));
    });
  }

  /* ----------------------------------------------------------- dashboard */
  function hasModule(name) { return $('#main-navigation [data-module="' + name + '"]').length > 0; }
  // Limits card: hidden when every limit is unlimited (admin) — then the dashboard uses the admin order.
  function dashboardLayout(pc) {
    var $dash = $(pc).find('[data-dk-dash]');
    if (!$dash.length) return $dash;
    var real = false;
    $dash.find('[data-dk-limits]').each(function () {
      var $box = $(this), $tiles = $box.find('.dk-tile');
      var limited = $tiles.filter(':not(.is-unlimited)').length > 0;
      $box.closest('.dk-dashlet').prop('hidden', $tiles.length > 0 && !limited);
      if (limited) real = true;
    });
    $dash.toggleClass('dk-dash--limits', real);
    return $dash;
  }
  // Latest news: ISPConfig puts it into the side menu of the dashboard module (custom_menu.htm). Show it as a
  // dashboard card instead (same links), and hide the copy in the sidebar while the dashboard is open.
  function dashboardNews() {
    var $box = $('#pageContent [data-dk-news]'), $side = $('#sidebar');
    var $links = $side.children('ul').children('li').children('a[target="_blank"]');
    var isNewsMenu = $side.children('header').length === 1 && !$side.find('.dk-navgroup').length;
    if (!$box.length) return;
    // fix round 7 (V4): with an empty feed ISPConfig's template class still prints ONE row with an empty link
    // (no date, no title, href="") — only rows that say something count as news
    $links = $links.filter(function () { return $.trim($(this).text()) !== ''; });
    if (!isNewsMenu || !$links.length) { $box.prop('hidden', true).empty(); return; }
    var $list = $('<ul class="dk-news-list"></ul>');
    $links.each(function () {
      var $a = $(this), date = $.trim($a.children('b').first().text());
      var title = $.trim($a.clone().children('b, br').remove().end().text());
      $('<li class="dk-news-item"></li>').append(
        $('<a target="_blank" rel="noopener noreferrer"></a>').attr('href', $a.attr('href'))
          .append($('<span class="dk-news-date"></span>').text(date)).append(document.createTextNode(title))
      ).appendTo($list);
    });
    var head = $.trim($side.children('header').first().text()) || t('dash.news');
    $box.empty()
      .append($('<div class="dk-card-head"></div>').append($('<h2 class="dk-card-title"></h2>').text(head)))
      .append($list).prop('hidden', false);
  }
  // Server status: read from what ISPConfig already serves to this user — monitor/show_sys_state.php?state=system,
  // the page behind Monitor → Overview — and summarise it. No extra server code. Any failure → no card.
  var statusReq = null;
  function dashboardStatus() {
    var $box = $('#pageContent [data-dk-status]');
    if (!$box.length || $box.attr('data-dk-loaded') || statusReq || !hasModule('monitor')) return;
    $box.attr('data-dk-loaded', '1');
    statusReq = $.ajax({ type: 'GET', url: 'monitor/show_sys_state.php', data: 'state=system', dataType: 'html', global: false, timeout: 15000 })
      .done(function (html) {
        var servers = [];
        try {
          // DOMParser: inert document — the chart <script> of that page is NOT executed, no images are loaded
          var doc = new window.DOMParser().parseFromString(String(html), 'text/html');
          $(doc).find('.stateview .alert').each(function () { servers.push(readServerState(this)); });
        } catch (e) { servers = []; }
        var $now = $('#pageContent [data-dk-status]');
        if (!servers.length || !$now.length) return;
        renderStatus($now, servers);
      })
      .always(function () { statusReq = null; });
  }
  function renderStatus($box, servers) {
    var bad = 0, $list = $('<ul class="dk-status-list"></ul>');
    $.each(servers, function (_, sv) {
      if (sv.attention) bad++;
      var $li = $('<li class="dk-status-item"></li>').attr('data-dk-state', sv.state).append(stateBadge(sv.state));
      if (sv.name) $li.append($('<span class="dk-status-name dk-mono"></span>').text(sv.name));
      if (sv.meta) $li.append($('<span class="dk-status-meta"></span>').text(sv.meta));
      // "Details" → Monitor → this server's overview (the link core prints; opened like a quick action: module first)
      if (/^monitor\/show_sys_state\.php\?state=server&server=/.test(sv.link) && safeUrl(sv.link)) {
        $li.append($('<a href="#" class="dk-status-link"></a>').attr('data-dk-quick-module', 'monitor').attr('data-dk-quick-page', sv.link)
          .attr('aria-label', t('dash.status.details') + (sv.name ? ': ' + sv.name : '')).text(t('dash.status.details')));
      }
      var detail = sv.state === 'ok' ? '' : countText(sv.counts);
      if (detail) $li.append($('<span class="dk-status-detail"></span>').text(detail));
      $list.append($li);
    });
    var summary = bad === 0 ? t('dash.status.all_ok') : bad + ' ' + t(bad === 1 ? 'dash.status.attention1' : 'dash.status.attention');
    $box.empty()
      .append($('<div class="dk-card-head"></div>')
        .append($('<h2 class="dk-card-title"></h2>').text(t('dash.status')))
        .append($('<button type="button" class="btn btn-default btn-sm"></button>')
          .attr('data-dk-quick-module', 'monitor').attr('data-dk-quick-page', 'monitor/show_sys_state.php?state=system').text(t('dash.status.open'))))
      .append($('<p class="dk-status-summary"></p>').text(summary))
      .append($list);
    // last line of defence: whatever is in the card, a raw language key is never shown — that part is taken out
    $box.find('.dk-status-item > span:not(.dk-badge), .dk-status-summary').each(function () { if (RAW_KEY.test($(this).text())) $(this).remove(); });
    $box.prop('hidden', false);
  }
  // ISPConfig's donation dashlet ("Support ISPConfig and get the Manual") is always the last thing on the dashboard.
  // The dashlet itself is moved unchanged, so its "Hide" link (dashboard/dashboard.php?hide=donate) keeps working.
  // ISPConfig 3.3.1's dashlet has other markup than 3.3.2 / 3.3.3 (no .dashlet-donate class, a white inline
  // background, a "More" <button> + <p id="description"> toggled by an inline script that binds to EVERY button on
  // the page). It is brought to the newer structure — same texts, same two links — so one style and one behaviour
  // serve all releases: class added, inline white removed, description inside <details>/<summary> like 3.3.3 prints
  // it. Taking the id off the description also makes core's page-wide button handler a no-op (it looks the id up).
  function normalizeDonate($dash) {
    $dash.find('a[data-load-content="dashboard/dashboard.php?hide=donate"]').each(function () {
      var $box = $(this).closest('.dk-dashlet > div');
      if (!$box.length || $box.hasClass('dashlet-donate')) return;
      $box.addClass('dashlet-donate').css('background-color', '');
      var $desc = $box.find('#description').first(), $more = $box.find('h4 > button').first();
      if (!$desc.length || !$more.length) return;
      var $details = $('<details></details>').append($('<summary class="btn btn-link btn-xs"></summary>').text($.trim($more.text())));
      $more.remove();
      $box.children('h4').first().after($details);
      $details.append($desc.removeAttr('id').css('display', ''));
      $box.children('p').filter(function () { return $.trim($(this).text()) === '' && !$(this).children().length; }).remove();   // the stray <p> of core's unclosed tag
    });
  }
  function dashboardDonate($dash) {
    var $slot = $dash.find('[data-dk-donate]').first();
    if (!$slot.length) return;
    try { normalizeDonate($dash); } catch (e) { /* the dashlet stays as core printed it */ }
    $dash.find('.dashlet-donate').each(function () {
      var $d = $(this).closest('.dk-dashlet');
      if ($d.length && !$.contains($slot[0], $d[0])) $slot.append($d);
    });
  }
  function decorateDashboard(pc) {
    var $dash = dashboardLayout(pc);
    if (!$dash.length) return;
    dashboardDonate($dash);
    dashboardNews();
    dashboardStatus();
  }

  /* ------------------------------------------- fix round 8: confirmation card, DNS toolbar, login flow */
  // A1 — "login as" / "re-login as admin or logout" (login/login_as.php, login/logout.php). Core prints four <br>,
  // one or two lines of loose text, the hidden login fields and a .wf_actions button row straight into the page.
  // The SAME nodes are regrouped into a centred card: first line = heading, further lines = text, then the button
  // row (untouched: core's buttons, values, data-submit-form / data-load-content). The hidden fields stay where
  // they are — inside #pageForm, which is what the confirm button submits.
  function confirmCard(pc) {
    var $pc = $(pc);
    if (!$pc.children('input[type="hidden"][name="login_as"]').length || $pc.children('.dk-confirm').length) return;
    var $actions = $pc.children('.wf_actions').first();
    if (!$actions.length) return;
    var lines = [];
    $pc.contents().each(function () { if (this.nodeType === 3 && $.trim(this.nodeValue)) lines.push(this); });
    if (!lines.length) return;
    var back = /logout\.php/.test($actions.find('[data-load-content]').attr('data-load-content') || '');
    var $card = $('<div class="dk-confirm" role="group" aria-labelledby="dk-confirm-title"></div>');
    $card.append($('<div class="dk-confirm-icon" aria-hidden="true"></div>').append($('<i class="bi"></i>').addClass(back ? 'bi-arrow-return-left' : 'bi-person-check')));
    $.each(lines, function (i, node) {
      node.nodeValue = $.trim(node.nodeValue);
      var el = i === 0 ? $('<h2 class="dk-confirm-title" id="dk-confirm-title"></h2>')[0] : $('<p class="dk-confirm-text"></p>')[0];
      el.appendChild(node);                                   // the text node itself is moved, not copied
      $card.append(el);
    });
    $pc.children('br').remove();                              // core's spacing / line breaks between the loose lines
    $card.insertBefore($actions).append($actions);
  }

  // D2 — DNS records tab: core prints one button per record type (21 of them, .dns-record-btn, each with
  // data-load-content="dns/dns_<type>_edit.php?zone=…"). They become an "Add record" toolbar: the common types stay
  // visible (in this order), the others move into a "More" menu, and phones get one select with every type.
  // The buttons are core's own elements (moved, never rebuilt): class, text and target are unchanged, a click still
  // runs core's data-load-content handler. The select "clicks" the matching button.
  var DNS_COMMON = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'CAA'];
  var dnsMenuSeq = 0;
  function dnsToolbar(pc) {
    $(pc).find('.buttons.topbuttons').each(function () {
      var $bar = $(this), $btns = $bar.children('button.dns-record-btn[data-load-content]');
      if ($bar.hasClass('dk-dns-toolbar') || $btns.length < 2) return;
      var common = [], rest = [];
      $.each(DNS_COMMON, function (_, type) {
        $btns.each(function () { if ($.trim($(this).text()).toUpperCase() === type && $.inArray(this, common) === -1) { common.push(this); return false; } });
      });
      $btns.each(function () { if ($.inArray(this, common) === -1) rest.push(this); });
      var id = 'dk-dns-more-' + (++dnsMenuSeq);
      $bar.addClass('dk-dns-toolbar').attr({ role: 'group', 'aria-label': t('dns.add') });
      $bar.prepend($('<span class="dk-dns-toolbar-label" aria-hidden="true"></span>').text(t('dns.add')));
      $.each(common, function (_, b) { $bar.append(b); });
      if (rest.length > 1) {
        var $menu = $('<div class="dk-dns-more-menu" role="menu" hidden></div>').attr({ id: id, 'aria-label': t('dns.more.label') });
        $.each(rest, function (_, b) { $(b).attr({ role: 'menuitem', tabindex: '-1' }); $menu.append(b); });
        $bar.append($('<div class="dk-dns-more"></div>')
          .append($('<button type="button" class="btn btn-default dk-dns-more-btn" aria-haspopup="true" aria-expanded="false"></button>')
            .attr({ 'aria-controls': id, title: t('dns.more.label') }).append(document.createTextNode(t('dns.more') + ' ')).append('<i class="bi bi-chevron-down" aria-hidden="true"></i>'))
          .append($menu));
      } else {
        $.each(rest, function (_, b) { $bar.append(b); });
      }
      // phones: one select (kept native — core's select2 skips .chosen-select), every type, common ones first
      var $sel = $('<select class="form-control chosen-select dk-dns-add-select"></select>').attr('aria-label', t('dns.add'));
      $sel.append($('<option value=""></option>').text(t('dns.add.choose')));
      $.each(common.concat(rest), function (_, b) { $sel.append($('<option></option>').attr('value', b.getAttribute('data-load-content')).text($.trim($(b).text()))); });
      $bar.append($sel);
    });
  }
  function dnsMenuItems($more) { return $more.find('.dk-dns-more-menu .dns-record-btn'); }
  function dnsMenuOpen($more, focusIndex) {
    var $menu = $more.find('.dk-dns-more-menu'), $btn = $more.find('.dk-dns-more-btn');
    $menu.prop('hidden', false).removeClass('dk-align-right');
    $btn.attr('aria-expanded', 'true');
    // keep the menu inside the window: attach it to the right edge of the button when it would stick out
    var r = $menu[0].getBoundingClientRect();
    if (r.right > (window.innerWidth || document.documentElement.clientWidth) - 8) $menu.addClass('dk-align-right');
    if (focusIndex !== undefined) { var $it = dnsMenuItems($more); $it.eq(focusIndex < 0 ? $it.length - 1 : focusIndex).trigger('focus'); }
  }
  function dnsMenuClose($more, refocus) {
    $more = $more || $('.dk-dns-more');
    $more.each(function () {
      var $m = $(this), $btn = $m.find('.dk-dns-more-btn');
      if ($btn.attr('aria-expanded') !== 'true') return;
      $m.find('.dk-dns-more-menu').prop('hidden', true);
      $btn.attr('aria-expanded', 'false');
      if (refocus) $btn.trigger('focus');
    });
  }
  function initDnsToolbar() {
    $(document).on('click', '.dk-dns-more-btn', function () {
      var $more = $(this).closest('.dk-dns-more');
      if ($(this).attr('aria-expanded') === 'true') dnsMenuClose($more); else dnsMenuOpen($more);
    });
    $(document).on('keydown', '.dk-dns-more-btn', function (e) {
      var $more = $(this).closest('.dk-dns-more');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); dnsMenuOpen($more, e.key === 'ArrowDown' ? 0 : -1); }
      else if (e.key === 'Escape') { if ($(this).attr('aria-expanded') === 'true') { e.stopPropagation(); dnsMenuClose($more, true); } }
    });
    $(document).on('keydown', '.dk-dns-more-menu .dns-record-btn', function (e) {
      var $more = $(this).closest('.dk-dns-more'), $it = dnsMenuItems($more), i = $it.index(this), n = $it.length, to = -1;
      // Bootstrap 3's dropdown script listens for keys on every [role="menu"] and would "click" the menu itself
      // (↑ ↓ Esc Space) — this menu is handled here alone.
      e.stopPropagation();
      switch (e.key) {
        case 'ArrowDown': case 'ArrowRight': to = (i + 1) % n; break;
        case 'ArrowUp': case 'ArrowLeft': to = (i - 1 + n) % n; break;
        case 'Home': to = 0; break;
        case 'End': to = n - 1; break;
        case 'Escape': e.preventDefault(); dnsMenuClose($more, true); return;
        case 'Tab': dnsMenuClose($more); return;               // Tab leaves the menu (focus moves on by itself)
        default: return;
      }
      e.preventDefault();
      $it.eq(to).trigger('focus');
    });
    // a click anywhere else closes the menu; a click on an entry closes it and goes on to core's handler
    $(document).on('click', function (e) { if (!$(e.target).closest('.dk-dns-more-btn').length) dnsMenuClose(); });
    // phones: the select opens the form of the chosen type by clicking core's own button
    $(document).on('change', 'select.dk-dns-add-select', function () {
      var url = this.value, $bar = $(this).closest('.dk-dns-toolbar');
      this.selectedIndex = 0;
      if (!url) return;
      var $b = $bar.find('.dns-record-btn').filter(function () { return this.getAttribute('data-load-content') === url; }).first();
      if ($b.length) $b[0].click();
    });
  }

  // L3 / L4 — login flow. The core templates stay as they are; small repairs only:
  //  · otp.htm prints "code sent to …" as loose text after the button → wrapped so it can be spaced and centred;
  //  · the OTP field tells browsers / password managers what it is (one-time code);
  //  · password fields get a Caps Lock hint (shown only while Caps Lock is on).
  function tidyLogin(scope) {
    var $body = $(scope).find('.dk-login-body');
    if (!$body.length) return;
    $body.find('fieldset').contents().each(function () {
      if (this.nodeType !== 3 || !$.trim(this.nodeValue) || $(this.parentNode).is('.dk-login-note')) return;
      $(this).wrap('<span class="dk-login-note"></span>');
    });
    $body.find('input#code[name="code"]').each(function () { if (!this.getAttribute('autocomplete')) this.setAttribute('autocomplete', 'one-time-code'); });
    $body.find('input[type="password"]').each(function () {
      if (this.getAttribute('data-dk-caps')) return;
      var hid = 'dk-caps-' + (this.id || this.name);
      this.setAttribute('data-dk-caps', hid);
      var $hint = $('<p class="dk-caps-hint" role="status" hidden></p>').attr('id', hid)
        .append('<i class="bi bi-capslock" aria-hidden="true"></i>').append($('<span></span>').text(t('login.caps')));
      var $after = $(this).parent('.input-group');
      $hint.insertAfter($after.length ? $after : $(this));
    });
  }
  function initLogin() {
    if (!$('.dk-login-body').length) return;
    var caps = function (e) {
      var el = e.target, on;
      if (!el || !el.getAttribute || !el.getAttribute('data-dk-caps')) return;
      try { on = e.type !== 'focusout' && !!(e.originalEvent && e.originalEvent.getModifierState && e.originalEvent.getModifierState('CapsLock')); } catch (x) { on = false; }
      if (e.type === 'focusin') return;                         // a focus event carries no key state: wait for a key / click
      $('#' + el.getAttribute('data-dk-caps')).prop('hidden', !on);
    };
    $(document).on('keydown keyup mousedown focusout', '.dk-login-body input[type="password"]', caps);
  }

  /* ------------------------------------------------ fix round 9: login-flow messages (P1 / P2)
     Core's login templates print every "msg" as alert-success (green tick) and every "error" as alert-danger. On
     the password reset page "msg" is either the deliberately neutral answer (pw_reset_request_txt — the same
     whether or not the account exists) or pw_error_noinput, which core also sends for a FILLED form when the user
     name is "admin". Neither may look like a confirmation, and the second must not tell that the user is special.
     The alert is classified by the language string the page received (core's EN / PT texts below, taken from
     login/lib/lang/en.lng, br.lng, pt.lng):
       info     pw_reset_request_txt — neutral style, text unchanged
       neutral  pw_error_noinput     — neutral style AND the neutral text (what any other filled form gets)
       success  pw_reset, pw_reset_act
       danger   every error
     A "msg" with an unknown text (other language, changed wording) is neutral info; an "error" is always danger.
     Only class / role / (for "neutral") the text of the alert element change — no request, no form field value. */
  var LOGIN_MSG = {
    pw_reset_request_txt: ['info', ['If the username and email address belong to an account, a password reset link has been sent to the email address. Please visit the link to confirm your password reset request.']],
    pw_error_noinput: ['neutral', ['Please enter email address and username.',
      'Favor informar nome do usu\u00e1rio e email v\u00e1lidos.',
      'Favor informar nome de utilizador e endere\u00e7o de correio v\u00e1lidos.']],
    pw_reset: ['success', ['The password has been reset and sent to your email address.',
      'Senha redefinida! Ela ser\u00e1 enviada para voc\u00ea no email cadastrado no sistema.',
      'Senha restabelecida! Ser-lhe-\u00e1 enviada para o correio eletr\u00f4nico registado no sistema.']],
    pw_reset_act: ['success', ['You have been sent a password reset link. Please visit the link to confirm your password reset request.',
      'Voc\u00ea receber\u00e1 um link de ativa\u00e7\u00e3o. Por favor, acesse o link de ativa\u00e7\u00e3o para confirmar sua nova senha.',
      'You have been sent an activation link. Please visit the link to confirm your password request.']],
    pw_error: ['danger', ['Username or email address does not match.',
      'Nome do usu\u00e1rio ou email n\u00e3o coincidem.',
      'Nome de utilizador ou correio eletr\u00f4nico n\u00e3o coincidem.']],
    user_regex_error: ['danger', ['Username contains unallowed characters or is longer than 64 characters.',
      'O nome do usu\u00e1rio cont\u00e9m menos de 1 ou mais de 64 caracteres ou cont\u00e9m caracteres inv\u00e1lidos.',
      'O nome de utilizador cont\u00e9m mais de 64 caracteres ou cont\u00e9m caracteres inv\u00e1lidos.']],
    email_error: ['danger', ['Email contains unallowed characters or has an invalid format.',
      'O email cont\u00e9m caracteres n\u00e3o permitidos ou formato \u00e9 inv\u00e1lido.',
      'Email contains unallowed characters or has a invalid format.']],
    pw_error_length: ['danger', ['The password length is < 1 or > 256 characters.',
      'Tamanho da senha n\u00e3o pode ser maior do que 64 caracteres.']],
    pw_reset_error_smtp_connection: ['danger', ['There was a connection problem when trying to send an email pertaining to your password reset request.',
      'Ocorreu um problema de conex\u00e3o ao tentar enviar um email referente \u00e0 sua solicita\u00e7\u00e3o de redefini\u00e7\u00e3o de senha.']],
    lost_password_function_disabled_txt: ['danger', ['The lost password function is not available for this user.',
      'Fun\u00e7\u00e3o "redefinir senha" indispon\u00edvel para este usu\u00e1rio.']],
    lost_password_function_wait_txt: ['danger', ['You cannot request a new password yet. Please wait a few minutes.',
      'Voc\u00ea n\u00e3o pode requisitar uma nova senha ainda. Por favor, aguarde alguns minutos.',
      'You cannot request a new password, yet. Please wait a few minutes.']],
    lost_password_function_expired_txt: ['danger', ['This activation link has expired. Please request a new one.',
      'Este link de ativa\u00e7\u00e3o expirou. Por favor, fa\u00e7a uma nova requisi\u00e7\u00e3o.']],
    lost_password_function_denied_txt: ['danger', ['This activation link is not valid.',
      'Este link de ativa\u00e7\u00e3o n\u00e3o \u00e9 v\u00e1lido.']],
    error_user_password_empty: ['danger', ['Username or Password empty.',
      'Usu\u00e1rio ou senha est\u00e1 vazio.',
      'Utilizador ou Senha em branco.']],
    error_user_password_incorrect: ['danger', ['Username or Password wrong.',
      'Usu\u00e1rio e/ou senha incorreto.',
      'Utilizador ou Senha inv\u00e1lida(o).']],
    error_user_blocked: ['danger', ['User is blocked.',
      'O usu\u00e1rio est\u00e1 bloqueado.',
      'O utilizador est\u00e1 bloqueado.']],
    error_user_too_many_logins: ['danger', ['Too many failed login attempts. Please retry after 15 minutes',
      'V\u00e1rias tentativas de acesso incorretas, fa\u00e7a uma nova tentativa dentro de 15 minutos.',
      'V\u00e1rias tentativas de logins inv\u00e1lidas, fa\u00e7a uma nova tentativa dentro de 15 minutos.']],
    error_maintenance_mode: ['danger', ['This ISPConfig installation is currently under maintenance. We should be back shortly. Thank you for your patience.',
      'Esta instala\u00e7\u00e3o do ISPConfig atualmente est\u00e1 sob manuten\u00e7\u00e3o. N\u00f3s retornaremos em breve. Obrigado por sua paci\u00eancia.']],
    error_password_empty: ['danger', ['Password cannot be empty.',
      'A senha n\u00e3o pode estar vazia.']],
    error_password_too_short: ['danger', ['Password must be at least 8 characters long.',
      'A senha deve ter pelo menos 8 caracteres.']],
    error_passwords_do_not_match: ['danger', ['Passwords do not match.',
      'As senhas n\u00e3o coincidem.']],
    error_password_same_as_current: ['danger', ['New password must be different from your current password.',
      'A nova senha deve ser diferente da atual.',
      'A nova senha deve ser diferente da sua senha atual.']],
    error_password_change_failed: ['danger', ['Failed to change password. Please try again.',
      'Falha ao alterar a senha. Tente novamente.']]
  };
  var loginMsgIndex = null;
  function normMsg(s) { return $.trim(String(s == null ? '' : s).replace(/\s+/g, ' ')).toLowerCase(); }
  // text = what core printed, kind = 'msg' (core's alert-success) | 'error' (core's alert-danger)
  // → { key: language key or '', cls: 'info' | 'success' | 'danger', text: replacement text or '' }
  function classifyLoginMsg(text, kind) {
    if (!loginMsgIndex) {
      loginMsgIndex = {};
      $.each(LOGIN_MSG, function (key, def) { $.each(def[1], function (i, str) { var k = normMsg(str); if (!loginMsgIndex[k]) loginMsgIndex[k] = { key: key, cls: def[0], i: i }; }); });
    }
    var hit = loginMsgIndex[normMsg(text)];
    if (kind === 'error') return { key: hit ? hit.key : '', cls: 'danger', text: '' };
    if (!hit) return { key: '', cls: 'info', text: '' };
    if (hit.cls === 'neutral') {
      var neutral = LOGIN_MSG.pw_reset_request_txt[1];
      return { key: hit.key, cls: 'info', text: neutral[hit.i] || neutral[0] };
    }
    return { key: hit.key, cls: hit.cls, text: '' };
  }
  function loginMessages(scope) {
    $(scope).find('.dk-login-body > .alert').each(function () {
      if (this.getAttribute('data-dk-msg')) return;
      var $a = $(this), kind = $a.hasClass('alert-danger') ? 'error' : 'msg';
      var r = classifyLoginMsg($a.text(), kind);
      this.setAttribute('data-dk-msg', r.key || 'unknown');
      if (kind === 'error') return;                           // core's errors stay exactly as printed (red)
      $a.removeClass('alert-success alert-info alert-warning alert-danger').addClass('alert-' + r.cls);
      if (r.cls === 'info') this.setAttribute('role', 'status');
      if (r.text) $a.text(r.text);
      // after a request the form starts empty again (also when the browser restored the values)
      if (r.cls === 'info') $a.siblings('form[action$="password_reset.php"]').find('input#email, input#username').val('');
    });
  }
  // Password reset form: an empty / half-filled form is answered in the page (a message under the field) and is not
  // sent. Attributes only (type, required, autocomplete …) — names, ids and values of core's fields are untouched.
  function resetForm(scope) {
    $(scope).find('.dk-login-body form[action$="password_reset.php"]').each(function () {
      if (this.getAttribute('data-dk-reset')) return;
      this.setAttribute('data-dk-reset', '1');
      this.noValidate = true;                                 // the theme's own inline messages instead of browser bubbles
      $(this).find('input#email').attr({ type: 'email', required: 'required', autocomplete: 'email', inputmode: 'email', autocapitalize: 'none', spellcheck: 'false' });
      $(this).find('input#username').attr({ required: 'required', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false' });
    });
  }
  function resetFieldProblem(input) {
    var v = $.trim(input.value);
    if (!v) return input.name === 'email' ? 'reset.email.required' : 'reset.user.required';
    if (input.name === 'email' && ((input.validity && input.validity.typeMismatch) || !/^[^@\s]+@[^@\s]+$/.test(v))) return 'reset.email.invalid';
    return '';
  }
  function resetFieldMessage(input, key) {
    var id = 'dk-err-' + input.name, $m = $('#' + id);
    if (!key) {
      $m.remove(); input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby');
      return;
    }
    if (!$m.length) $m = $('<p class="dk-field-error" role="alert"></p>').attr('id', id).insertAfter(input);
    $m.text(t(key));
    input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', id);
  }
  function initResetForm() {
    $(document).on('submit', 'form[data-dk-reset]', function (e) {
      var first = null;
      $(this).find('input#email, input#username').each(function () {
        var key = resetFieldProblem(this);
        resetFieldMessage(this, key);
        if (key && !first) first = this;
      });
      if (first) { e.preventDefault(); first.focus(); }       // nothing is sent
    });
    $(document).on('input', 'form[data-dk-reset] input[aria-invalid]', function () { if (!resetFieldProblem(this)) resetFieldMessage(this, ''); });
  }

  /* ------------------------------------------------------- misc helpers */
  function labelLoginFields(scope) {
    // login/templates/*.htm use placeholders only: add a visible label (does not touch the input)
    $(scope).find('.dk-login-body input.form-control[placeholder][id]').each(function () {
      if ($('label[for="' + this.id + '"]').length) return;
      $('<label class="dk-field-label"></label>').attr('for', this.id).text(this.getAttribute('placeholder')).insertBefore(this);
    });
  }
  function avatarInitial() {
    $('.dk-avatar[data-dk-initial]').each(function () {
      var n = $.trim(this.getAttribute('data-dk-initial') || '');
      this.textContent = n ? n.charAt(0).toUpperCase() : '?';
      this.setAttribute('data-dk-ready', '1');
    });
  }
  function onContent(url, data) {
    var pc = document.getElementById('pageContent'), load = null;
    if (url) {
      load = resolveLoad(url, typeof data === 'string' ? data : '');
      lastUrl = load.url; lastData = typeof data === 'string' && data !== '&[object Object]' ? data : '';
    }
    select2NoBlurSelect(document);
    if (pc) {
      applyI18n(pc);
      decorateTables(pc);
      cardTables(pc);
      tabsOverflow(pc);
      decorateForms(pc);
      try { confirmCard(pc); dnsToolbar(pc); } catch (e) { /* the page stays as ISPConfig printed it */ }
      decorateLimits(pc);
      decorateMonitor(pc);
      decorateDashboard(pc);
      themeCharts();
    }
    markActiveSubnav();
    updateMenuState();
    buildHomeNav();
    updateContext();
    if (load) { histRecord(load.url, load.isGet); scheduleGuard(); }
    labelLoginFields(document);
    tidyLogin(document);
    resetForm(document);
    loginMessages(document);
  }
  function onSideNav() {
    select2NoBlurSelect(document.getElementById('sidebar'));
    applyFriendlyLabels();
    applyMenuIcons();
    markActiveSubnav();
    if ($('#pageContent [data-dk-dash]').length) dashboardNews();
    updateMenuState();
    updateContext();
    cappInDrawer = false;
  }

  /* ------------------------------------------------------------ boot */
  initTheme();
  $(function () {
    patchSelect2();                      // select2.min.js is loaded by now; ISPConfig.loadInitContent() runs after this handler
    root.setAttribute('lang', LANG === 'pt' ? 'pt' : 'en');
    applyI18n(document);
    applyBrand(document);
    tidySeps(document);                  // after the texts are final (language, brand name)
    $(window).on('resize', function () { tidySeps(document); });
    if (document.fonts && document.fonts.ready && document.fonts.ready.then) document.fonts.ready.then(function () { tidySeps(document); });
    themeCharts();                       // Chart.js is loaded after this file: set its defaults before the first chart
    try {                                // charts change their sizing model at the phone breakpoint (V1)
      var cmq = window.matchMedia(CHART_COMPACT);
      if (cmq.addEventListener) cmq.addEventListener('change', themeCharts); else if (cmq.addListener) cmq.addListener(themeCharts);
    } catch (e) { /* no matchMedia: charts keep ISPConfig's size */ }
    initNav();
    initQuickActions();
    avatarInitial();
    labelLoginFields(document);
    tidyLogin(document);
    resetForm(document);
    loginMessages(document);
    initLogin();
    initResetForm();
    initDnsToolbar();
    initNavControl();
    initHistory();                       // before ISPConfig.loadInitContent() (inline script, runs after this handler)
    helpLast();
    onSideNav();
    observe('topnav-container', function () { helpLast(); updateMenuState(); updateContext(); dashboardStatus(); scheduleGuard(); });
    observe('sidebar', function () { menusSeen = true; onSideNav(); });
    // keyboard access for the datalog chip (it is a <div data-toggle="modal">)
    $(document).on('keydown', '.notification[role="button"]', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $(this).trigger('click'); }
    });
    // busy state for assistive tech
    $(document).ajaxStart(function () { $('#pageContent').attr('aria-busy', 'true'); })
               .ajaxStop(function () { $('#pageContent').attr('aria-busy', 'false'); });
  });
  if (window.ISPConfig && ISPConfig.registerHook) {
    ISPConfig.registerHook('onAfterContentLoad', function (name, params) { onContent(params && params.url, params && params.data); });
  }

  // small public surface for debugging / preview
  window.DK = { lang: LANG, t: t, RELOAD_RE: RELOAD_RE, serverState: readServerState, loginMsg: classifyLoginMsg, setTheme: setTheme, decorate: onContent, pickActive: pickActive, friendly: FRIENDLY, safeUrl: safeUrl, menuIcon: menuIcon, menuIconFallback: MENU_ICON_FALLBACK,
    crumbs: function () { return $.map(crumbParts(), function (p) { return p.text; }); }, url: function () { return lastUrl; },
    nav: function () { return { gen: nav.gen, pending: nav.reqs.length + (nav.sync ? 1 : 0) + (tx ? 1 : 0), held: tx ? tx.held.length : 0, content: contentModule(), rail: activeModule(), panel: panelModule() }; } };
})(window, document, window.jQuery);
