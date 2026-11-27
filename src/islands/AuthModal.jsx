// Google sign-in and sign-out dialogs (approved Design canvas mockup). Styles: assets/css/auth.css.
// Native <dialog> provides focus trapping, Esc to close and the backdrop.

import { render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { X, Check, Lock } from 'lucide-preact';
import { authController, authDialog, authState } from './AuthStore.js';
import {
  AUTH_LABELS as L,
  AUTH_IDS as IDS,
  AUTH_ICON_SIZE_PX,
  AUTH_CLOSE_ICON_SIZE_PX,
  GOOGLE_LOGO_SRC,
  GOOGLE_LOGO_SIZE_PX,
} from './AuthConstants.js';

function AuthDialogShell({ labelledBy, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (el && !el.open) el.showModal();
    return () => {
      if (el && el.open) el.close();
    };
  }, []);

  // A click whose target is the <dialog> itself landed on the backdrop.
  const onBackdropClick = (event) => {
    if (event.target === ref.current) authController.closeDialog();
  };

  return (
    <dialog
      ref={ref}
      class="auth-dialog"
      aria-labelledby={labelledBy}
      onClose={authController.closeDialog}
      onClick={onBackdropClick}
    >
      <div class="auth-card">
        <button
          type="button"
          class="auth-close"
          aria-label={L.CLOSE_ARIA}
          title={L.CLOSE_ARIA}
          onClick={authController.closeDialog}
        >
          <X
            size={AUTH_CLOSE_ICON_SIZE_PX}
            aria-hidden="true"
          />
        </button>
        {children}
      </div>
    </dialog>
  );
}

function AuthError() {
  const { errorMessage } = authState.value;
  if (!errorMessage) return null;
  return (
    <p
      class="auth-error"
      role="alert"
    >
      {errorMessage}
    </p>
  );
}

function LoginDialog() {
  const busy = authState.value.status === 'signing_in';
  return (
    <AuthDialogShell labelledBy={IDS.LOGIN_TITLE}>
      <div class="auth-head">
        <span
          class="auth-hanzi"
          aria-hidden="true"
        >
          {L.LOGIN_HANZI}
        </span>
        <h2
          id={IDS.LOGIN_TITLE}
          class="auth-title"
        >
          {L.LOGIN_TITLE}
        </h2>
        <p class="auth-text">{L.LOGIN_BODY}</p>
      </div>
      <ul class="auth-benefits">
        {L.LOGIN_BENEFITS.map((benefit) => (
          <li key={benefit}>
            <Check
              size={AUTH_ICON_SIZE_PX}
              class="auth-benefit-icon"
              aria-hidden="true"
            />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
      <AuthError />
      <button
        type="button"
        class="auth-google-btn"
        autofocus
        disabled={busy}
        aria-busy={String(busy)}
        onClick={() => authController.signIn()}
      >
        <img
          src={GOOGLE_LOGO_SRC}
          width={GOOGLE_LOGO_SIZE_PX}
          height={GOOGLE_LOGO_SIZE_PX}
          alt=""
        />
        <span>{busy ? L.GOOGLE_BUTTON_BUSY : L.GOOGLE_BUTTON}</span>
      </button>
      <button
        type="button"
        class="auth-text-btn"
        onClick={authController.closeDialog}
      >
        {L.LATER_BUTTON}
      </button>
      <p class="auth-privacy">
        <Lock
          size={AUTH_ICON_SIZE_PX}
          aria-hidden="true"
        />
        <span>{L.PRIVACY_NOTE}</span>
      </p>
    </AuthDialogShell>
  );
}

function LogoutChoice({ id, value, checked, title, hint, onPick }) {
  return (
    <label
      class="auth-choice"
      for={id}
    >
      <input
        type="radio"
        id={id}
        name="authLogoutData"
        value={value}
        checked={checked}
        onChange={() => onPick(value)}
      />
      <span class="auth-choice-text">
        <span class="auth-choice-title">{title}</span>
        <span class="auth-choice-hint">{hint}</span>
      </span>
    </label>
  );
}

function LogoutDialog() {
  const [choice, setChoice] = useState('keep');
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    await authController.signOut({ clearLocalData: choice === 'clear' });
    setBusy(false);
  };

  return (
    <AuthDialogShell labelledBy={IDS.LOGOUT_TITLE}>
      <h2
        id={IDS.LOGOUT_TITLE}
        class="auth-title auth-title-sm"
      >
        {L.LOGOUT_TITLE}
      </h2>
      <p class="auth-text">{L.LOGOUT_BODY}</p>
      <div class="auth-choices">
        <LogoutChoice
          id={IDS.LOGOUT_KEEP}
          value="keep"
          checked={choice === 'keep'}
          title={L.LOGOUT_KEEP}
          hint={L.LOGOUT_KEEP_HINT}
          onPick={setChoice}
        />
        <LogoutChoice
          id={IDS.LOGOUT_CLEAR}
          value="clear"
          checked={choice === 'clear'}
          title={L.LOGOUT_CLEAR}
          hint={L.LOGOUT_CLEAR_HINT}
          onPick={setChoice}
        />
      </div>
      <AuthError />
      <div class="auth-actions">
        <button
          type="button"
          class="auth-secondary-btn"
          onClick={authController.closeDialog}
        >
          {L.LOGOUT_CANCEL}
        </button>
        <button
          type="button"
          class="auth-primary-btn"
          disabled={busy}
          onClick={confirm}
        >
          {L.LOGOUT_CONFIRM}
        </button>
      </div>
    </AuthDialogShell>
  );
}

export function AuthDialogs() {
  if (authDialog.value === 'login') return <LoginDialog />;
  if (authDialog.value === 'logout') return <LogoutDialog />;
  return null;
}

/** Mount the dialogs and restore an existing session (guests skip the SDK entirely). */
export function mountAuth() {
  if (!authController.isConfigured) return;
  const host = document.createElement('div');
  host.id = IDS.ROOT;
  document.body.appendChild(host);
  render(<AuthDialogs />, host);
  authController.init();
}
