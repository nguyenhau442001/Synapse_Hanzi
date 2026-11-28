// App header island: brand, primary nav, centered quick search, "today" chip (streak + urgent review)
// and the account menu (which also holds the light/dark switch). Styles: assets/css/app-header.css.
// State comes from HeaderStore signals; actions call the owning modules' window.* APIs.
import { render } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import {
  ArrowLeft,
  Search,
  Flame,
  Clock,
  ChevronDown,
  User,
  Bookmark,
  SunMoon,
  CircleHelp,
  Share2,
  Download,
  CloudCheck,
  CloudOff,
  CircleAlert,
  LoaderCircle,
  RefreshCw,
  LogOut,
  Trash2,
  Trophy,
} from 'lucide-preact';
import { APP_VERSION } from './AppUtils';
import { headerStats, headerUi, avatarInitialOf } from './HeaderStore.js';
import { authController, authState } from './AuthStore.js';
import { AUTH_LABELS as AL } from './AuthConstants.js';
import { runSync } from './SyncController.js';
import { describeSync } from './SyncStatus.js';
import { SYNC_LABELS as SL } from './SyncConstants.js';
import { LEAGUE_IDS, LEAGUE_LABELS as LL } from './LeagueConstants.js';
import { leagueBoard, leagueProfile, openLeague } from './LeagueService.js';

/** Icon per sync tone, matching the approved mockup. */
const SYNC_TONE_ICONS = Object.freeze({
  synced: CloudCheck,
  syncing: LoaderCircle,
  offline: CloudOff,
  error: CircleAlert,
});

/** Avatar status dot: shown for these tones only (none while syncing or for guests). */
const SYNC_DOT_TONES = Object.freeze(['synced', 'offline', 'error']);
import {
  HEADER_LABELS as L,
  HEADER_IDS as IDS,
  HEADER_NAV_ITEMS,
  HEADER_LOGO_SRC,
  HEADER_LOGO_SIZE_PX,
  HEADER_ICON_SIZE_PX,
  HEADER_ICON_STROKE,
  HEADER_CHEVRON_SIZE_PX,
  HEADER_BACK_ICON_SIZE_PX,
  HEADER_BACK_ICON_STROKE,
  MAC_PLATFORM_PATTERN,
} from './HeaderConstants.js';

/** Calls a window-exposed module API (legacy cross-module contract) if it exists. */
function callGlobal(name, ...args) {
  if (typeof window !== 'undefined' && typeof window[name] === 'function') window[name](...args);
}

const goHome = () => callGlobal('navigateToHome');
const goBack = () => window.SpaRouter?.navigateBack?.();
const openHistory = () => callGlobal('showHistoryModal');
const openDrawer = (tab) => callGlobal('openQuickAccessDrawer', tab);
const openTodayReviews = () => callGlobal('openTodayReviews');

/** Switches to `theme` through ThemeManager (which persists the manual override). */
function selectTheme(theme) {
  if (headerUi.value.theme !== theme) callGlobal('toggleTheme');
}

function isMacPlatform() {
  return typeof navigator !== 'undefined' && MAC_PLATFORM_PATTERN.test(navigator.platform);
}

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function HeaderIcon({ icon: Icon, size = HEADER_ICON_SIZE_PX, strokeWidth = HEADER_ICON_STROKE, className = 'ah-icon' }) {
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
    <div class="ah-brand">
      <button
        type="button"
        id={IDS.BACK_BTN}
        class="global-back-btn"
        aria-label={L.BACK_ARIA}
        title={L.BACK_TITLE}
        hidden={!headerUi.value.showBackButton}
        onClick={(e) => { e.preventDefault(); goBack(); }}
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
        class="ah-logo-btn"
        aria-label={L.HOME_BTN_ARIA}
        title={L.HOME_BTN_TITLE}
        onClick={goHome}
      >
        <img
          src={HEADER_LOGO_SRC}
          alt={L.BRAND_LOGO_ALT}
          class="ah-logo"
          width={HEADER_LOGO_SIZE_PX}
          height={HEADER_LOGO_SIZE_PX}
        />
      </button>
      <div
        class="ah-brand-text"
        id={IDS.BRAND_TEXT}
        role="button"
        tabIndex={0}
        title={L.HOME_BTN_TITLE}
        aria-label={L.HOME_TEXT_ARIA}
        onClick={goHome}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          goHome();
        }}
      >
        <h1
          id={IDS.TITLE}
          class="ah-title"
        >
          {L.BRAND_TITLE}
        </h1>
        <p
          id={IDS.SUBTITLE}
          class="ah-subtitle"
        >
          {L.BRAND_SUBTITLE}
        </p>
      </div>
    </div>
  );
}

function HeaderNav() {
  return (
    <nav
      class="ah-nav"
      id={IDS.NAV}
      role="tablist"
      aria-label={L.NAV_ARIA}
    >
      {HEADER_NAV_ITEMS.map(({ section, domId, label }) => {
        const isActive = section === headerUi.value.activeSection;
        return (
          <button
            key={section}
            id={domId}
            class={cx('ah-nav-tab', isActive && 'active')}
            type="button"
            role="tab"
            aria-pressed={String(isActive)}
            data-section={section}
            onClick={() => callGlobal('openSection', section)}
          >
            {label}
          </button>
        );
      })}
    </nav>
  );
}

function HeaderSearch() {
  return (
    <div class="ah-search-slot">
      <button
        type="button"
        id={IDS.SEARCH_BTN}
        class="ah-search"
        aria-label={L.SEARCH_ARIA}
        title={L.SEARCH_TITLE}
        onClick={() => callGlobal('openQuickSearchModal')}
      >
        <HeaderIcon icon={Search} />
        <span class="ah-search-placeholder">{L.SEARCH_PLACEHOLDER}</span>
        <kbd
          class="ah-kbd"
          aria-hidden="true"
        >
          {`${isMacPlatform() ? L.SEARCH_MOD_MAC : L.SEARCH_MOD_OTHER}${L.SEARCH_KBD_KEY}`}
        </kbd>
      </button>
    </div>
  );
}

function TodayChip() {
  const { streakDays, urgentCount } = headerStats.value;
  const streakLabel = L.streakLabel(streakDays);
  const urgentLabel = L.urgentLabel(urgentCount);
  return (
    <div
      class="ah-today"
      role="group"
      aria-label={L.TODAY_GROUP_ARIA}
    >
      <button
        type="button"
        id={IDS.STREAK_BTN}
        class={cx('ah-today-btn', 'ah-streak', streakDays > 0 ? null : 'is-zero')}
        title={streakLabel}
        aria-label={streakLabel}
        onClick={openHistory}
      >
        <HeaderIcon
          icon={Flame}
          className="ah-icon ah-streak-icon"
        />
        <span id={IDS.STREAK_TEXT}>{streakDays}</span>
      </button>
      <span
        class="ah-today-divider"
        aria-hidden="true"
      />
      <button
        type="button"
        id={IDS.URGENT_BTN}
        class={cx('ah-today-btn', 'ah-urgent')}
        title={urgentLabel}
        aria-label={urgentLabel}
        onClick={openTodayReviews}
      >
        <HeaderIcon icon={Clock} />
        <span class="ah-urgent-label">{L.URGENT_LABEL}</span>
        <span
          id={IDS.URGENT_COUNT}
          class={cx('ah-count', urgentCount > 0 ? null : 'is-zero')}
        >
          {urgentCount}
        </span>
      </button>
    </div>
  );
}

function ThemeSwitch() {
  const isDark = headerUi.value.theme === 'dark';
  return (
    <div class="ah-menu-row">
      <HeaderIcon icon={SunMoon} />
      <span class="ah-menu-label">{L.THEME_ROW}</span>
      <div
        class="ah-segment"
        role="group"
        aria-label={L.THEME_ROW}
      >
        <button
          type="button"
          class={cx('ah-segment-btn', !isDark && 'is-on')}
          aria-pressed={String(!isDark)}
          onClick={() => selectTheme('light')}
        >
          {L.THEME_LIGHT}
        </button>
        <button
          type="button"
          class={cx('ah-segment-btn', isDark && 'is-on')}
          aria-pressed={String(isDark)}
          onClick={() => selectTheme('dark')}
        >
          {L.THEME_DARK}
        </button>
      </div>
    </div>
  );
}

/** Google photo when signed in, else the initial letter; `large` is the menu header size. */
/** Avatar-menu entry for the weekly leaderboard: rank pill when joined, "Mới" when not yet. */
function LeagueMenuItem({ signedIn, onOpen }) {
  const optedIn = signedIn && leagueProfile.value.optedIn;
  const me = leagueBoard.value.me;
  let pill = null;
  if (optedIn && me && me.xp > 0) pill = LL.rankPill(me.rank);
  else if (signedIn && !optedIn) pill = LL.MENU_NEW_BADGE;
  return (
    <button
      type="button"
      id={LEAGUE_IDS.MENU_ITEM}
      class="ah-menu-item"
      role="menuitem"
      onClick={onOpen}
    >
      <HeaderIcon icon={Trophy} />
      <span class="ah-menu-label">{signedIn && !optedIn ? LL.MENU_JOIN : LL.MENU_BOARD}</span>
      {pill && <span class="ah-menu-pill">{pill}</span>}
    </button>
  );
}

function Avatar({ id, user, initial, large, dotTone }) {
  const className = cx('ah-avatar', large && 'ah-avatar-lg', user?.avatarUrl && 'has-photo');
  const showDot = SYNC_DOT_TONES.includes(dotTone);
  return (
    <span
      id={id}
      class={className}
      aria-hidden="true"
    >
      {user?.avatarUrl ? (
        <img
          class="ah-avatar-img"
          src={user.avatarUrl}
          alt=""
          referrerpolicy="no-referrer"
        />
      ) : initial}
      {showDot && <span class={cx('ah-sync-dot', `is-${dotTone}`)} />}
    </span>
  );
}

/** Sync status line in the account menu (signed-in users only). */
function SyncStatusRow({ view }) {
  return (
    <div
      class={cx('ah-sync-status', `is-${view.tone}`)}
      role="status"
    >
      <HeaderIcon
        icon={SYNC_TONE_ICONS[view.tone]}
        className={cx('ah-icon', view.tone === 'syncing' && 'ah-spin')}
      />
      <span class="ah-sync-status-text">{view.text}</span>
      {view.canRetry && (
        <button
          type="button"
          class="ah-sync-retry"
          onClick={() => runSync()}
        >
          {SL.RETRY}
        </button>
      )}
    </div>
  );
}

/** Guest call-to-action card shown at the top of the account menu. */
function GuestSyncCard({ onSignIn }) {
  const busy = authState.value.status === 'signing_in';
  return (
    <div class="ah-sync-card">
      <div class="ah-sync-card-head">
        <HeaderIcon
          icon={CloudCheck}
          className="ah-icon ah-sync-card-icon"
        />
        <span class="ah-sync-card-text">
          <span class="ah-sync-card-title">{AL.GUEST_CARD_TITLE}</span>
          <span class="ah-sync-card-body">{AL.GUEST_CARD_BODY}</span>
        </span>
      </div>
      <button
        type="button"
        class="ah-sync-card-btn"
        role="menuitem"
        disabled={busy}
        onClick={onSignIn}
      >
        {busy ? AL.SIGNING_IN : AL.GUEST_CARD_BUTTON}
      </button>
    </div>
  );
}

function AccountMenu() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const profileBtnRef = useRef(null);
  const { profileName, canInstall, activeDrawerTab } = headerUi.value;
  const { streakDays, urgentCount, savedCount } = headerStats.value;
  const { status, user } = authState.value;
  const signedIn = status === 'signed_in' && Boolean(user);
  const showGuestCard = authController.isConfigured && !signedIn;
  const displayName = signedIn ? (user.displayName || AL.SIGNED_IN_FALLBACK_NAME) : profileName;
  const initial = avatarInitialOf(displayName);
  const syncView = describeSync(authState.value);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      profileBtnRef.current?.focus();
    };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Every action item closes the menu after running its action.
  const runAndClose = (action) => () => {
    setOpen(false);
    action();
  };

  return (
    <div
      class="ah-account"
      ref={wrapRef}
    >
      <button
        type="button"
        ref={profileBtnRef}
        id={IDS.PROFILE_BTN}
        class={cx('ah-account-btn', open && 'is-open')}
        title={L.ACCOUNT_BTN_TITLE}
        aria-label={L.ACCOUNT_BTN_ARIA}
        aria-haspopup="menu"
        aria-expanded={String(open)}
        aria-controls={IDS.ACCOUNT_MENU}
        onClick={() => setOpen(!open)}
      >
        <Avatar
          id={IDS.AVATAR}
          user={signedIn ? user : null}
          initial={initial}
          dotTone={syncView?.tone}
        />
        <HeaderIcon
          icon={ChevronDown}
          size={HEADER_CHEVRON_SIZE_PX}
        />
      </button>

      <div
        id={IDS.ACCOUNT_MENU}
        class="ah-menu"
        role="menu"
        aria-label={L.ACCOUNT_MENU_ARIA}
        hidden={!open}
      >
        <div class="ah-menu-profile">
          <Avatar
            user={signedIn ? user : null}
            initial={initial}
            large
          />
          <span class="ah-menu-profile-text">
            <span class="ah-menu-profile-name">{displayName}</span>
            <span class="ah-menu-profile-meta">
              {signedIn && user.email ? user.email : L.profileSummary(streakDays, urgentCount)}
            </span>
          </span>
        </div>
        {showGuestCard && <GuestSyncCard onSignIn={runAndClose(authController.openLogin)} />}
        {syncView && <SyncStatusRow view={syncView} />}
        {signedIn && (
          <button
            type="button"
            id={IDS.MENU_SYNC_NOW}
            class="ah-menu-item"
            role="menuitem"
            disabled={syncView?.tone === 'syncing'}
            onClick={() => runSync()}
          >
            <HeaderIcon icon={RefreshCw} />
            <span class="ah-menu-label">{SL.SYNC_NOW}</span>
          </button>
        )}
        <LeagueMenuItem
          signedIn={signedIn}
          onOpen={runAndClose(openLeague)}
        />
        <div
          class="ah-menu-divider"
          role="separator"
        />
        <button
          type="button"
          id={IDS.MENU_PROFILE}
          class="ah-menu-item"
          role="menuitem"
          onClick={runAndClose(openHistory)}
        >
          <HeaderIcon icon={User} />
          <span class="ah-menu-label">{L.MENU_PROFILE}</span>
        </button>
        <button
          type="button"
          id={IDS.MENU_SAVED}
          class={cx('ah-menu-item', activeDrawerTab === 'saved' && 'is-active')}
          role="menuitem"
          aria-label={L.MENU_SAVED_ARIA}
          onClick={runAndClose(() => openDrawer('saved'))}
        >
          <HeaderIcon icon={Bookmark} />
          <span class="ah-menu-label">{L.MENU_SAVED}</span>
          <span
            class="ah-menu-pill"
            id={IDS.SAVED_COUNT}
          >
            {savedCount}
          </span>
        </button>
        <ThemeSwitch />
        <div
          class="ah-menu-divider"
          role="separator"
        />
        <button
          type="button"
          id={IDS.MENU_HELP}
          class="ah-menu-item"
          role="menuitem"
          aria-label={L.MENU_HELP_ARIA}
          onClick={runAndClose(() => callGlobal('openStudyHelpModal'))}
        >
          <HeaderIcon icon={CircleHelp} />
          <span class="ah-menu-label">{L.MENU_HELP}</span>
        </button>
        <button
          type="button"
          id={IDS.MENU_SHARE}
          class="ah-menu-item"
          role="menuitem"
          aria-label={L.MENU_SHARE_ARIA}
          onClick={runAndClose(() => callGlobal('shareApp'))}
        >
          <HeaderIcon icon={Share2} />
          <span class="ah-menu-label">{L.MENU_SHARE}</span>
        </button>
        <button
          type="button"
          id={IDS.MENU_INSTALL}
          class="ah-menu-item"
          role="menuitem"
          aria-label={L.MENU_INSTALL_ARIA}
          hidden={!canInstall}
          onClick={runAndClose(() => callGlobal('triggerInstallFlow'))}
        >
          <HeaderIcon icon={Download} />
          <span class="ah-menu-label">{L.MENU_INSTALL}</span>
        </button>
        {signedIn && (
          <button
            type="button"
            id={IDS.MENU_SIGN_OUT}
            class="ah-menu-item"
            role="menuitem"
            onClick={runAndClose(authController.openLogout)}
          >
            <HeaderIcon icon={LogOut} />
            <span class="ah-menu-label">{AL.MENU_SIGN_OUT}</span>
          </button>
        )}
        {signedIn && (
          <button
            type="button"
            id={IDS.MENU_DELETE_ACCOUNT}
            class="ah-menu-item ah-menu-item-danger"
            role="menuitem"
            onClick={runAndClose(authController.openDeleteAccount)}
          >
            <HeaderIcon icon={Trash2} />
            <span class="ah-menu-label">{AL.MENU_DELETE_ACCOUNT}</span>
          </button>
        )}
        <p class="ah-menu-version">
          {`${L.MENU_VERSION} `}
          <span class="footer-version">{`v${APP_VERSION}`}</span>
        </p>
      </div>
    </div>
  );
}

export function AppHeader() {
  return (
    <>
      <HeaderBrand />
      <HeaderNav />
      <HeaderSearch />
      <div class="ah-actions">
        <TodayChip />
        <AccountMenu />
      </div>
    </>
  );
}

/** Renders synchronously so every module mounted afterwards can rely on the header being in place. */
export function mountAppHeader() {
  const root = document.getElementById(IDS.ROOT);
  if (root) render(<AppHeader />, root);
}
