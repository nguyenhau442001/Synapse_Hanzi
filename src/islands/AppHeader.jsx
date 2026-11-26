// App header island: brand, primary nav, quick search, streak/urgent badges, account menu, theme toggle.
// Renders the exact legacy markup into <header id="appHeader"> so existing CSS and id-based callers keep working.
import { render } from 'preact';
import { ArrowLeft, Search, Flame, Clock, User, Bookmark, CircleHelp, Share2, Download, Moon } from 'lucide-preact';
import { APP_VERSION } from './AppUtils';
import {
  HEADER_LABELS as L,
  HEADER_IDS as IDS,
  HEADER_NAV_ITEMS,
  HEADER_DEFAULT_SECTION,
  HEADER_LOGO_SRC,
  HEADER_LOGO_SIZE_PX,
  HEADER_ICON_SIZE_PX,
  HEADER_ICON_STROKE,
  HEADER_BACK_ICON_SIZE_PX,
  HEADER_BACK_ICON_STROKE,
  HEADER_THEME_ICON_SIZE_PX,
  DEFAULT_AVATAR_INITIAL,
} from './HeaderConstants';

function HeaderIcon({ icon: Icon, size = HEADER_ICON_SIZE_PX, strokeWidth = HEADER_ICON_STROKE, className = 'ds-icon' }) {
  return (
    <Icon
      class={className}
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden="true"
    />
  );
}

function HeaderBrand() {
  return (
    <div class="app-header-brand">
      <div class="app-brand-badge">
        <button
          type="button"
          id={IDS.BACK_BTN}
          class="global-back-btn"
          aria-label={L.BACK_ARIA}
          title={L.BACK_TITLE}
          hidden
        >
          <HeaderIcon
            icon={ArrowLeft}
            className="global-back-icon"
            size={HEADER_BACK_ICON_SIZE_PX}
            strokeWidth={HEADER_BACK_ICON_STROKE}
          />
          <span class="global-back-text">{L.BACK_TEXT}</span>
        </button>
        <button
          type="button"
          id={IDS.HOME_BTN}
          class="app-brand-home-btn"
          aria-label={L.HOME_BTN_ARIA}
          title={L.HOME_BTN_TITLE}
        >
          <img
            src={HEADER_LOGO_SRC}
            alt={L.BRAND_LOGO_ALT}
            class="app-brand-logo-img"
            width={HEADER_LOGO_SIZE_PX}
            height={HEADER_LOGO_SIZE_PX}
          />
        </button>
        <div
          class="app-brand-text-block"
          id={IDS.BRAND_TEXT}
          role="button"
          tabIndex={0}
          title={L.HOME_BTN_TITLE}
          aria-label={L.HOME_TEXT_ARIA}
        >
          <h1 id={IDS.TITLE}>{L.BRAND_TITLE}</h1>
          <p id={IDS.SUBTITLE}><span class="brand-en">{L.BRAND_SUBTITLE}</span></p>
        </div>
      </div>
    </div>
  );
}

function HeaderNav() {
  return (
    <nav
      class="header-primary-nav primary-tabs-group"
      id={IDS.NAV}
      role="tablist"
      aria-label={L.NAV_ARIA}
    >
      {HEADER_NAV_ITEMS.map(({ section, domId, label }) => {
        const isActive = section === HEADER_DEFAULT_SECTION;
        return (
          <button
            key={section}
            id={domId}
            class={isActive ? 'primary-tab active' : 'primary-tab'}
            type="button"
            role="tab"
            aria-pressed={String(isActive)}
            data-section={section}
          >
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function HeaderAccountMenu() {
  return (
    <div class="header-account-wrap">
      <button
        type="button"
        id={IDS.PROFILE_BTN}
        class="header-profile-btn"
        title={L.ACCOUNT_BTN_TITLE}
        aria-label={L.ACCOUNT_BTN_ARIA}
        aria-haspopup="menu"
        aria-expanded="false"
        aria-controls={IDS.ACCOUNT_MENU}
      >
        <span
          id={IDS.AVATAR}
          class="header-avatar-initial"
          aria-hidden="true"
        >
          {DEFAULT_AVATAR_INITIAL}
        </span>
      </button>

      <div
        id={IDS.ACCOUNT_MENU}
        class="header-account-menu"
        role="menu"
        aria-label={L.ACCOUNT_MENU_ARIA}
        hidden
      >
        <button
          type="button"
          id={IDS.MENU_PROFILE}
          class="header-menu-item"
          role="menuitem"
        >
          <HeaderIcon icon={User} />
          <span class="header-menu-label">{L.MENU_PROFILE}</span>
        </button>
        <button
          type="button"
          id={IDS.MENU_SAVED}
          class="header-menu-item header-badge-saved"
          role="menuitem"
          aria-label={L.MENU_SAVED_ARIA}
        >
          <span class="header-badge-icon" aria-hidden="true"><HeaderIcon icon={Bookmark} /></span>
          <span class="header-menu-label">{L.MENU_SAVED}</span>
          <span class="header-menu-pill" id={IDS.SAVED_COUNT}>0</span>
        </button>

        <div class="header-menu-divider" role="separator"></div>

        <button
          type="button"
          id={IDS.MENU_HELP}
          class="header-menu-item header-help-btn"
          role="menuitem"
          aria-label={L.MENU_HELP_ARIA}
        >
          <HeaderIcon icon={CircleHelp} />
          <span class="header-menu-label">{L.MENU_HELP}</span>
        </button>
        <button
          type="button"
          id={IDS.MENU_SHARE}
          class="header-menu-item header-share-btn"
          role="menuitem"
          aria-label={L.MENU_SHARE_ARIA}
        >
          <HeaderIcon icon={Share2} />
          <span class="header-menu-label">{L.MENU_SHARE}</span>
        </button>
        <button
          type="button"
          id={IDS.MENU_INSTALL}
          class="header-menu-item header-install-btn"
          role="menuitem"
          aria-label={L.MENU_INSTALL_ARIA}
        >
          <HeaderIcon icon={Download} />
          <span class="header-menu-label">{L.MENU_INSTALL}</span>
        </button>

        <div class="header-menu-divider" role="separator"></div>
        <div class="header-menu-version">
          {`${L.MENU_VERSION} `}
          <span class="brand-version footer-version">{`v${APP_VERSION}`}</span>
        </div>
      </div>
    </div>
  );
}

function HeaderActions() {
  return (
    <div class="app-header-actions">
      <button
        type="button"
        id={IDS.SEARCH_BTN}
        class="header-quick-search-btn header-quick-search-compact"
        aria-label={L.SEARCH_ARIA}
        title={L.SEARCH_TITLE}
      >
        <HeaderIcon icon={Search} className="hqs-icon" />
        <span class="hqs-placeholder">{L.SEARCH_PLACEHOLDER}</span>
        <kbd class="hqs-kbd" aria-hidden="true">
          <span class="hqs-kbd-mod">{L.SEARCH_MOD_MAC}</span>
          {L.SEARCH_KBD_KEY}
        </kbd>
      </button>

      <button
        type="button"
        id={IDS.STREAK_BTN}
        class="header-streak-badge is-zero"
        title={L.STREAK_DEFAULT}
        aria-label={L.STREAK_DEFAULT}
      >
        <span class="header-streak-icon" aria-hidden="true"><HeaderIcon icon={Flame} /></span>
        <span class="header-streak-count" id={IDS.STREAK_TEXT}>0</span>
      </button>

      <button
        type="button"
        id={IDS.URGENT_BTN}
        class="header-action-badge header-badge-urgent"
        title={L.URGENT_TITLE}
        aria-label={L.URGENT_TITLE}
      >
        <span class="header-badge-icon" aria-hidden="true"><HeaderIcon icon={Clock} /></span>
        <span class="header-badge-label">{L.URGENT_LABEL}</span>
        <span class="header-badge-count" id={IDS.URGENT_COUNT}>0</span>
      </button>

      <HeaderAccountMenu />

      <button
        type="button"
        id={IDS.THEME_TOGGLE}
        class="theme-toggle-btn"
        aria-label={L.THEME_ARIA_DEFAULT}
        title={L.THEME_TITLE_LIGHT}
      >
        <HeaderIcon icon={Moon} size={HEADER_THEME_ICON_SIZE_PX} />
      </button>
    </div>
  );
}

export function AppHeader() {
  return (
    <>
      <div class="app-header-left">
        <HeaderBrand />
        <HeaderNav />
      </div>
      <HeaderActions />
    </>
  );
}

/** Renders synchronously so every id-based caller mounted afterwards finds its element. */
export function mountAppHeader() {
  const root = document.getElementById(IDS.ROOT);
  if (root) render(<AppHeader />, root);
}
