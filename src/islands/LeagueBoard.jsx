// Weekly leaderboard UI (approved Design canvas mockup v3): board dialog with podium, list,
// personal card / mobile sticky bar, 3-step join flow, leave confirmation, XP chip and toasts.
// Styles: assets/css/league.css. State: LeagueService.js signals.

import { render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { Check, ChevronDown, ChevronUp, Lock, X } from 'lucide-preact';
import { authController, authState } from './AuthStore.js';
import {
  LEAGUE_AVATARS,
  LEAGUE_ICON_SIZE_PX,
  LEAGUE_IDS,
  LEAGUE_JOIN_STEPS,
  LEAGUE_LABELS as L,
  LEAGUE_MEDALS,
  LEAGUE_NICKNAME_MAX,
  LEAGUE_NUMBER_LOCALE,
  LEAGUE_PODIUM_ORDER,
  LEAGUE_PODIUM_SIZE,
  LEAGUE_SMALL_ICON_SIZE_PX,
} from './LeagueConstants.js';
import {
  avatarById,
  cardsForXp,
  cleanNickname,
  leagueTimeUntilReset,
  leagueWeekNo,
  leagueWeekOfYear,
  leagueWeekRange,
} from './LeagueCore.js';
import {
  closeLeague,
  leagueBoard,
  leagueProfile,
  leagueToast,
  leagueView,
  leagueWeekOffset,
  leagueXpFlash,
  leaveLeague,
  loadBoard,
  saveLeagueProfile,
  setLeagueWeekOffset,
} from './LeagueService.js';

const numberFormat = new Intl.NumberFormat(LEAGUE_NUMBER_LOCALE);
const fmt = (value) => numberFormat.format(value);
const cx = (...names) => names.filter(Boolean).join(' ');

/** Same entry point as the home screen's primary study button. */
function startStudying() {
  closeLeague();
  const btn = document.getElementById('todayPrimaryActionBtn');
  const action = btn?.dataset?.action || 'new';
  if (action === 'review' && typeof window.openTodayReviews === 'function') window.openTodayReviews();
  else if (typeof window.selectLevel === 'function') window.selectLevel(btn?.dataset?.level || 'hsk1');
}

function Seal({ avatar, size = 'md', mine = false, medal = null }) {
  const info = avatarById(avatar);
  return (
    <span
      class={cx('lg-seal', `lg-seal--${size}`, mine && 'is-mine', medal && `lg-medal-${medal}`)}
      aria-hidden="true"
    >
      {info.glyph}
    </span>
  );
}

// ---------- Board parts ----------

function Podium({ entries, uid }) {
  const top = entries.slice(0, LEAGUE_PODIUM_SIZE);
  if (!top.length) return null;
  return (
    <div class="lg-podium">
      {LEAGUE_PODIUM_ORDER.filter((index) => top[index]).map((index) => {
        const entry = top[index];
        const medal = LEAGUE_MEDALS[index];
        return (
          <div
            key={entry.uid}
            class={cx('lg-podium-col', `lg-podium-col--${index + 1}`)}
          >
            <Seal
              avatar={entry.avatar}
              size={index === 0 ? 'xl' : 'lg'}
              mine={entry.uid === uid || index === 0}
              medal={medal}
            />
            <span class="lg-podium-name">{entry.nickname}</span>
            <span class="lg-podium-xp lg-num">{fmt(entry.xp)} XP</span>
            <div class={cx('lg-plinth', `lg-medal-${medal}`)}>
              <span class="lg-disc lg-num">{index + 1}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Rows({ entries, uid }) {
  const rest = entries.slice(LEAGUE_PODIUM_SIZE);
  if (!rest.length) return null;
  return (
    <ol
      class="lg-rows"
      start={LEAGUE_PODIUM_SIZE + 1}
    >
      {rest.map((entry, i) => {
        const mine = entry.uid === uid;
        return (
          <li
            key={entry.uid}
            class={cx('lg-row', mine && 'is-mine')}
          >
            <span class="lg-row-rank lg-num">{LEAGUE_PODIUM_SIZE + i + 1}</span>
            <Seal
              avatar={entry.avatar}
              mine={mine}
            />
            <span class="lg-row-name">{entry.nickname}{mine ? L.YOU_SUFFIX : ''}</span>
            <span class="lg-row-xp lg-num">{fmt(entry.xp)}</span>
          </li>
        );
      })}
    </ol>
  );
}

function StandingText({ me }) {
  if (me.rank === 1) return <span class="lg-standing-head">{L.LEADING}</span>;
  if (me.xp === 0) return <span class="lg-standing-head">{L.NO_XP_YET}</span>;
  return <span class="lg-standing-head is-accent lg-num">{L.xpAmount(fmt(me.needToOvertake))}</span>;
}

/** Desktop personal card: the XP needed to overtake is the focal number. */
function PersonalCard({ me, profile }) {
  const above = me.above;
  const progress = above && above.xp > 0 ? Math.min(100, Math.round((me.xp / above.xp) * 100)) : 100;
  return (
    <section class="lg-card lg-me">
      <div class="lg-me-head">
        <Seal
          avatar={profile.avatar}
          size="lg"
          mine
        />
        <span class="lg-me-id">
          <span class="lg-me-name">{profile.nickname}</span>
          <span class="lg-muted lg-num">{L.rankLine(me.rank, fmt(me.xp))}</span>
        </span>
      </div>
      {above && me.xp > 0 ? (
        <>
          <div class="lg-me-focus">
            <span class="lg-muted">{L.ONLY_NEED}</span>
            <span class="lg-me-need lg-num">{L.xpAmount(fmt(me.needToOvertake))}</span>
            <span class="lg-me-target">{L.toOvertake(above.nickname, me.rank - 1)}</span>
          </div>
          <div class="lg-gap">
            <div class="lg-gap-track">
              <Seal
                avatar={profile.avatar}
                size="xs"
                mine
              />
              <div
                class="lg-bar"
                role="progressbar"
                aria-valuemin="0"
                aria-valuemax={String(above.xp)}
                aria-valuenow={String(me.xp)}
              >
                <span style={{ width: `${progress}%` }} />
              </div>
              <Seal
                avatar={above.avatar}
                size="xs"
              />
            </div>
          </div>
          <button
            type="button"
            class="lg-btn lg-btn--primary"
            onClick={startStudying}
          >
            {L.studyToOvertake(fmt(cardsForXp(me.needToOvertake)), above.nickname)}
          </button>
        </>
      ) : (
        <>
          <div class="lg-me-focus">
            <StandingText me={me} />
            {me.rank === 1 && me.below && <span class="lg-me-target">{L.leadBy(me.below.nickname, fmt(me.leadBy))}</span>}
            {me.xp === 0 && <span class="lg-me-target">{L.START_WITH_ONE}</span>}
          </div>
          <button
            type="button"
            class="lg-btn lg-btn--primary"
            onClick={startStudying}
          >
            {me.rank === 1 ? L.KEEP_RANK : L.START}
          </button>
        </>
      )}
    </section>
  );
}

/** Mobile bar outside the scroll area, above the iOS home indicator. */
function StickyBar({ me, profile }) {
  const above = me.above;
  let head = L.LEADING;
  let sub = me.below ? L.leadBy(me.below.nickname, fmt(me.leadBy)) : '';
  let cta = L.KEEP_RANK;
  if (me.xp === 0) {
    head = L.NO_XP_YET;
    sub = L.START_WITH_ONE;
    cta = L.START;
  } else if (above) {
    head = L.remainingXp(fmt(me.needToOvertake));
    sub = L.overtakeShort(above.nickname);
    cta = L.STUDY_NOW;
  }
  return (
    <div class="lg-sticky">
      <span class="lg-sticky-rank lg-num">{me.xp === 0 ? L.EMPTY_VALUE : me.rank}</span>
      <Seal
        avatar={profile.avatar}
        mine
        medal={me.rank <= LEAGUE_PODIUM_SIZE && me.xp > 0 ? LEAGUE_MEDALS[me.rank - 1] : null}
      />
      <span class="lg-sticky-text">
        <span class={cx('lg-sticky-head lg-num', above && me.xp > 0 && 'is-accent')}>{head}</span>
        <span class="lg-sticky-sub">{sub}</span>
      </span>
      <button
        type="button"
        class={cx('lg-btn', me.rank === 1 && me.xp > 0 ? 'lg-btn--quiet' : 'lg-btn--primary')}
        onClick={startStudying}
      >
        {cta}
      </button>
    </div>
  );
}

function XpRules() {
  const [open, setOpen] = useState(false);
  return (
    <section class="lg-card lg-rules">
      <button
        type="button"
        class="lg-rules-toggle"
        aria-expanded={String(open)}
        aria-controls={LEAGUE_IDS.RULES_PANEL}
        onClick={() => setOpen(!open)}
      >
        <span class="lg-rules-text">
          <span class="lg-strong">{L.XP_RULES}</span>
          {!open && <span class="lg-muted">{L.XP_RULES_SUMMARY}</span>}
        </span>
        {open ? <ChevronUp size={LEAGUE_ICON_SIZE_PX} /> : <ChevronDown size={LEAGUE_ICON_SIZE_PX} />}
      </button>
      <dl
        id={LEAGUE_IDS.RULES_PANEL}
        class="lg-rules-list"
        hidden={!open}
      >
        {L.XP_RULE_ROWS.map(([label, xp]) => (
          <div
            key={label}
            class="lg-rules-row"
          >
            <dt>{label}</dt>
            <dd class="lg-num">{xp}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function NotOnBoard({ signedIn }) {
  return (
    <section class="lg-card lg-invite">
      <span
        class="lg-seal lg-seal--md lg-seal--empty"
        aria-hidden="true"
      />
      <span class="lg-invite-text">
        <span class="lg-strong">{L.NOT_ON_BOARD}</span>
        <span class="lg-muted">{signedIn ? L.NOT_ON_BOARD_HINT : L.GUEST_HINT}</span>
      </span>
      <button
        type="button"
        class="lg-btn lg-btn--primary"
        onClick={signedIn ? () => { leagueView.value = 'join'; } : () => { closeLeague(); authController.openLogin(); }}
      >
        {signedIn ? L.JOIN : L.SIGN_IN_TO_JOIN}
      </button>
    </section>
  );
}

function LeftNotice() {
  return (
    <section class="lg-card lg-left">
      <span class="lg-strong">{L.LEFT_TITLE}</span>
      <span class="lg-muted">{L.LEFT_BODY}</span>
      <button
        type="button"
        class="lg-link"
        onClick={() => { leagueView.value = 'join'; }}
      >
        {L.REJOIN}
      </button>
    </section>
  );
}

function PrivacyFooter({ optedIn }) {
  return (
    <p class="lg-footer">
      {L.PRIVACY_FOOTER}
      {optedIn && (
        <>
          {' '}
          <button
            type="button"
            class="lg-link"
            onClick={() => { leagueView.value = 'edit'; }}
          >
            {L.CHANGE_NICKNAME}
          </button>
          {' · '}
          <button
            type="button"
            class="lg-link"
            onClick={() => { leagueView.value = 'leave'; }}
          >
            {L.LEAVE}
          </button>
        </>
      )}
    </p>
  );
}

// ---------- Join / edit ----------

function JoinFlow({ edit }) {
  const profile = leagueProfile.value;
  const [step, setStep] = useState(edit ? 2 : 1);
  const [nickname, setNickname] = useState(profile.nickname || authState.value.user?.displayName?.split(' ').pop() || '');
  const [avatar, setAvatar] = useState(profile.avatar);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const valid = Boolean(cleanNickname(nickname));
  const seal = avatarById(avatar);
  const flowRef = useRef(null);

  // Move focus to the step that just opened, so keyboard and screen-reader users follow along.
  useEffect(() => {
    flowRef.current?.querySelector('.lg-step.is-active')?.focus();
  }, [step]);

  async function submit() {
    setBusy(true);
    setError('');
    const ok = await saveLeagueProfile(nickname, avatar);
    setBusy(false);
    if (!ok) {
      setError(L.ERROR_JOIN);
      return;
    }
    leagueView.value = 'board';
    loadBoard({ force: true });
  }

  const onPrimary = () => {
    if (step === 1) setStep(2);
    else if (step === 2 && !edit) setStep(3);
    else submit();
  };
  const primaryLabel = busy ? L.JOINING : step === 1 || (step === 2 && !edit) ? L.CONTINUE : edit ? L.SAVE : L.CONFIRM_JOIN;

  return (
    <div
      class="lg-join"
      ref={flowRef}
    >
      <div class="lg-join-head">
        {!edit && <span class="lg-muted lg-num">{L.stepOf(step, LEAGUE_JOIN_STEPS)}</span>}
        <h2
          id={LEAGUE_IDS.JOIN_TITLE}
          class="lg-join-title"
        >
          {edit ? L.CHANGE_NICKNAME : L.JOIN_TITLE}
        </h2>
      </div>

      {!edit && (
        <JoinStep
          number={1}
          step={step}
          title={L.STEP_BENEFITS}
          summary={L.STEP_BENEFITS_SUMMARY}
          onReopen={() => setStep(1)}
        >
          <ul class="lg-benefits">
            {L.BENEFITS.map(([title, text]) => (
              <li key={title}>
                <Check
                  size={LEAGUE_SMALL_ICON_SIZE_PX}
                  aria-hidden="true"
                />
                <span><strong>{title}</strong> {text}</span>
              </li>
            ))}
          </ul>
        </JoinStep>
      )}

      <JoinStep
        number={2}
        step={step}
        title={L.STEP_PROFILE}
        summary={`${seal.glyph} ${cleanNickname(nickname) || ''}`}
        onReopen={() => setStep(2)}
      >
        <label
          class="lg-label"
          for={LEAGUE_IDS.NICKNAME_INPUT}
        >
          {L.NICKNAME_LABEL}
        </label>
        <input
          id={LEAGUE_IDS.NICKNAME_INPUT}
          class={cx('lg-input', nickname && !valid && 'is-invalid')}
          type="text"
          value={nickname}
          maxLength={LEAGUE_NICKNAME_MAX}
          autocomplete="nickname"
          aria-describedby={LEAGUE_IDS.NICKNAME_HINT}
          aria-invalid={String(Boolean(nickname) && !valid)}
          onInput={(event) => setNickname(event.currentTarget.value)}
        />
        <span
          id={LEAGUE_IDS.NICKNAME_HINT}
          class={cx('lg-hint', nickname && !valid && 'is-error')}
        >
          {nickname && !valid ? L.NICKNAME_INVALID : L.NICKNAME_HINT}
        </span>
        <fieldset class="lg-avatars">
          <legend class="lg-label">{L.AVATAR_LABEL}</legend>
          <div class="lg-avatar-grid">
            {LEAGUE_AVATARS.map((item) => (
              <button
                key={item.id}
                type="button"
                class={cx('lg-avatar', item.id === avatar && 'is-selected')}
                aria-label={L.avatarAria(item.name)}
                aria-pressed={String(item.id === avatar)}
                onClick={() => setAvatar(item.id)}
              >
                {item.glyph}
              </button>
            ))}
          </div>
        </fieldset>
        <div class="lg-preview">
          <Seal
            avatar={avatar}
            mine
          />
          <span class="lg-preview-text">
            <span class="lg-muted">{L.PREVIEW_LABEL}</span>
            <span class="lg-strong">{cleanNickname(nickname) || L.EMPTY_VALUE}</span>
          </span>
        </div>
      </JoinStep>

      {!edit && (
        <JoinStep
          number={3}
          step={step}
          title={L.STEP_CONFIRM}
          summary=""
          onReopen={() => {}}
        >
          <p class="lg-muted">{L.CONFIRM_BODY}</p>
        </JoinStep>
      )}

      <div class="lg-join-actions">
        <p class="lg-privacy">
          <Lock
            size={LEAGUE_SMALL_ICON_SIZE_PX}
            aria-hidden="true"
          />
          {L.EMAIL_NEVER_SHOWN}
        </p>
        {error && <p
          class="lg-error"
          role="alert"
        >
          {error}
        </p>}
        <button
          type="button"
          class="lg-btn lg-btn--primary lg-btn--block"
          disabled={busy || (step >= 2 && !valid)}
          onClick={onPrimary}
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  );
}

function JoinStep({ number, step, title, summary, onReopen, children }) {
  const state = step === number ? 'active' : step > number ? 'done' : 'todo';
  if (state === 'active') {
    return (
      <section
        class="lg-step is-active"
        tabIndex={-1}
      >
        <div class="lg-step-head">
          <span class="lg-step-num">{number}</span>
          <span class="lg-strong">{title}</span>
        </div>
        <div class="lg-step-body">{children}</div>
      </section>
    );
  }
  if (state === 'done') {
    return (
      <button
        type="button"
        class="lg-step is-done"
        onClick={onReopen}
      >
        <span class="lg-step-num">
          <Check
            size={LEAGUE_SMALL_ICON_SIZE_PX}
            aria-hidden="true"
          />
        </span>
        <span class="lg-step-text">
          <span class="lg-strong">{title}</span>
          {summary && <span class="lg-muted">{summary}</span>}
        </span>
        <span class="lg-link">{L.REVIEW_AGAIN}</span>
      </button>
    );
  }
  return (
    <div class="lg-step is-todo">
      <span class="lg-step-num">{number}</span>
      <span class="lg-strong">{title}</span>
    </div>
  );
}

// ---------- Leave ----------

function LeaveConfirm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function confirm() {
    setBusy(true);
    const ok = await leaveLeague();
    setBusy(false);
    if (!ok) {
      setError(L.ERROR_LEAVE);
      return;
    }
    leagueView.value = 'left';
    loadBoard({ force: true });
  }
  return (
    <section
      class="lg-card lg-leave"
      role="alertdialog"
      aria-labelledby={LEAGUE_IDS.LEAVE_TITLE}
    >
      <h2
        id={LEAGUE_IDS.LEAVE_TITLE}
        class="lg-leave-title"
      >
        {L.LEAVE_TITLE}
      </h2>
      <p class="lg-muted">{L.LEAVE_BODY}</p>
      {error && <p
        class="lg-error"
        role="alert"
      >
        {error}
      </p>}
      <div class="lg-leave-actions">
        <button
          type="button"
          class="lg-btn lg-btn--quiet"
          onClick={() => { leagueView.value = 'board'; }}
        >
          {L.LEAVE_CANCEL}
        </button>
        <button
          type="button"
          class="lg-btn lg-btn--primary"
          disabled={busy}
          onClick={confirm}
        >
          {L.LEAVE_CONFIRM}
        </button>
      </div>
    </section>
  );
}

// ---------- Dialog ----------

function BoardBody({ view }) {
  const board = leagueBoard.value;
  const profile = leagueProfile.value;
  const auth = authState.value;
  const signedIn = auth.status === 'signed_in' && Boolean(auth.user);
  const uid = signedIn ? auth.user.id : null;
  const thisWeek = leagueWeekOffset.value === 0;

  if (!signedIn) {
    return (
      <div class="lg-body lg-body--single">
        <NotOnBoard signedIn={false} />
      </div>
    );
  }
  if (view === 'join' || view === 'edit') {
    return (
      <div class="lg-body lg-body--single">
        <JoinFlow edit={view === 'edit'} />
      </div>
    );
  }

  const me = board.me;
  const showSticky = thisWeek && profile.optedIn && me;
  return (
    <div class={cx('lg-body', showSticky && 'has-sticky')}>
      <section class="lg-main">
        {board.status === 'loading' && !board.entries.length && <p class="lg-status">{L.LOADING}</p>}
        {board.status === 'error' && (
          <p class="lg-status">
            {L.ERROR_LOAD}{' '}
            <button
              type="button"
              class="lg-link"
              onClick={() => loadBoard({ force: true })}
            >
              {L.RETRY}
            </button>
          </p>
        )}
        {board.status === 'ready' && !board.entries.length && <p class="lg-status">{L.EMPTY_BOARD}</p>}
        <Podium
          entries={board.entries}
          uid={uid}
        />
        {board.entries.length > LEAGUE_PODIUM_SIZE && (
          <div class="lg-card lg-list">
            <div
              class="lg-list-head"
              aria-hidden="true"
            >
              <span class="lg-row-rank">{L.COL_RANK}</span>
              <span class="lg-row-name">{L.COL_LEARNER}</span>
              <span class="lg-row-xp">{L.COL_XP}</span>
            </div>
            <Rows
              entries={board.entries}
              uid={uid}
            />
          </div>
        )}
      </section>
      <aside class="lg-aside">
        {view === 'leave' && <LeaveConfirm />}
        {view === 'left' && <LeftNotice />}
        {view === 'board' && thisWeek && profile.optedIn && me && <PersonalCard
          me={me}
          profile={profile}
        />}
        {view === 'board' && thisWeek && !profile.optedIn && <NotOnBoard signedIn />}
        <XpRules />
        <PrivacyFooter optedIn={profile.optedIn} />
      </aside>
      {showSticky && view === 'board' && <StickyBar
        me={me}
        profile={profile}
      />}
    </div>
  );
}

function LeagueDialog() {
  const ref = useRef(null);
  const view = leagueView.value;
  const weekNo = leagueWeekNo() + leagueWeekOffset.value;
  const reset = leagueTimeUntilReset();
  const signedIn = authState.value.status === 'signed_in';
  const joining = view === 'join' || view === 'edit';

  useEffect(() => {
    const el = ref.current;
    if (el && !el.open) el.showModal();
    // Start on the title, not the first button, so no focus ring shows until the user tabs.
    const start = document.getElementById(LEAGUE_IDS.DIALOG_TITLE) || el?.querySelector('.lg-step.is-active');
    start?.focus();
  }, []);

  return (
    <dialog
      ref={ref}
      class="lg-dialog"
      aria-labelledby={joining ? LEAGUE_IDS.JOIN_TITLE : LEAGUE_IDS.DIALOG_TITLE}
      onCancel={(event) => { event.preventDefault(); closeLeague(); }}
    >
      <div class="league">
        <header class={cx('lg-header', joining && 'is-compact')}>
          {!joining && <div class="lg-title-block">
            <span class="lg-eyebrow lg-num">{L.weekEyebrow(leagueWeekOfYear(weekNo), leagueWeekRange(weekNo))}</span>
            <h1
              id={LEAGUE_IDS.DIALOG_TITLE}
              class="lg-title"
              tabIndex={-1}
            >
              {L.TITLE}
            </h1>
            <span class="lg-muted lg-num">{L.resetIn(L.daysHours(reset.days, reset.hours))}</span>
          </div>}
          <div class="lg-header-actions">
            {signedIn && (view === 'board' || view === 'left') && (
              <div
                class="lg-segment"
                role="group"
              >
                <button
                  type="button"
                  class={cx('lg-segment-btn', leagueWeekOffset.value === 0 && 'is-on')}
                  aria-pressed={String(leagueWeekOffset.value === 0)}
                  onClick={() => setLeagueWeekOffset(0)}
                >
                  {L.THIS_WEEK}
                </button>
                <button
                  type="button"
                  class={cx('lg-segment-btn', leagueWeekOffset.value === -1 && 'is-on')}
                  aria-pressed={String(leagueWeekOffset.value === -1)}
                  onClick={() => setLeagueWeekOffset(-1)}
                >
                  {L.LAST_WEEK}
                </button>
              </div>
            )}
            <button
              type="button"
              class="lg-icon-btn"
              aria-label={joining ? L.BACK_ARIA : L.CLOSE_ARIA}
              onClick={() => { if (joining) leagueView.value = 'board'; else closeLeague(); }}
            >
              <X
                size={LEAGUE_ICON_SIZE_PX}
                aria-hidden="true"
              />
            </button>
          </div>
        </header>
        <BoardBody view={view} />
      </div>
    </dialog>
  );
}

function XpChip() {
  const flash = leagueXpFlash.value;
  return (
    <div
      class="lg-xp-chip"
      aria-live="polite"
    >
      {flash && <span key={flash.id}>{L.xpChip(flash.xp)}</span>}
    </div>
  );
}

function MilestoneToast() {
  const toast = leagueToast.value;
  if (!toast) return null;
  const text = toast.kind === 'streak' ? L.streakToast(toast.days) : L.DAILY_GOAL_TOAST;
  return (
    <div
      class="lg-toast"
      role="status"
    >
      <span class="lg-toast-xp lg-num">+{toast.xp}</span>
      <span class="lg-toast-text">{text}</span>
      <button
        type="button"
        class="lg-link"
        onClick={() => { leagueToast.value = null; leagueView.value = 'board'; loadBoard(); }}
      >
        {L.VIEW}
      </button>
    </div>
  );
}

function LeagueRoot() {
  return (
    <>
      {leagueView.value && <LeagueDialog />}
      <XpChip />
      <MilestoneToast />
    </>
  );
}

export function mountLeagueBoard() {
  if (typeof document === 'undefined') return;
  let host = document.getElementById(LEAGUE_IDS.ROOT);
  if (!host) {
    host = document.createElement('div');
    host.id = LEAGUE_IDS.ROOT;
    document.body.appendChild(host);
  }
  render(<LeagueRoot />, host);
}

