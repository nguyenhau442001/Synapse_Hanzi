// "Mẹo nhớ" box on the back of a card: shows the learner's own memory hook for a word, or an
// auto hint built from the per-character glosses, and lets them write/edit it inline.
// Shared by the flashcard study screen and the "Ôn nhanh từ hay quên" review.
import { render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { Lightbulb, Pencil } from 'lucide-preact';
import { getMnemonic, saveMnemonic, MNEMONIC_MAX_LENGTH } from './MnemonicStore.js';

const ICON_SIZE = 15;

export const MNEMONIC_LABELS = Object.freeze({
  title: 'Mẹo nhớ',
  edit: 'Viết mẹo nhớ của bạn',
  editShort: 'Sửa',
  add: 'Viết mẹo',
  save: 'Lưu',
  cancel: 'Huỷ',
  hintNote: 'Gợi ý tự động: viết lại thành câu của riêng bạn sẽ nhớ lâu hơn.',
  emptyHint: 'Nghĩ một câu chuyện ngắn nối hình chữ, âm và nghĩa của từ này.',
  placeholder: 'Ví dụ: Thứ tự nó như vậy, không ai tạo ra → thiên nhiên',
  inputLabel: 'Mẹo nhớ cho từ này',
});

const stop = (event) => event.stopPropagation();

/**
 * @param {Object} props
 * @param {string} props.hanzi  Word the note belongs to.
 * @param {string} props.hint   Auto hint ('' when none).
 */
export function MnemonicBox({ hanzi, hint }) {
  const [text, setText] = useState(() => getMnemonic(localStorage, hanzi));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(/** @type {HTMLTextAreaElement|null} */ (null));

  useEffect(() => {
    setText(getMnemonic(localStorage, hanzi));
    setEditing(false);
  }, [hanzi]);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const startEdit = () => {
    setDraft(text || hint);
    setEditing(true);
  };
  const commit = () => {
    setText(saveMnemonic(localStorage, hanzi, draft));
    setEditing(false);
  };
  const onKeyDown = (event) => {
    event.stopPropagation();
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      commit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setEditing(false);
    }
  };

  return (
    <div
      class="mnemonic-box"
      onClick={stop}
    >
      <div class="mnemonic-head">
        <span class="mnemonic-title">
          <Lightbulb
            size={ICON_SIZE}
            aria-hidden="true"
          />
          {MNEMONIC_LABELS.title}
        </span>
        {!editing && (
          <button
            type="button"
            class="mnemonic-edit-btn"
            onClick={startEdit}
            title={MNEMONIC_LABELS.edit}
            aria-label={MNEMONIC_LABELS.edit}
          >
            <Pencil
              size={ICON_SIZE}
              aria-hidden="true"
            />
            <span>{text ? MNEMONIC_LABELS.editShort : MNEMONIC_LABELS.add}</span>
          </button>
        )}
      </div>
      {editing ? (
        <div class="mnemonic-editor">
          <textarea
            ref={inputRef}
            class="mnemonic-input"
            rows={2}
            maxLength={MNEMONIC_MAX_LENGTH}
            value={draft}
            placeholder={MNEMONIC_LABELS.placeholder}
            aria-label={MNEMONIC_LABELS.inputLabel}
            onInput={(event) => setDraft(event.currentTarget.value)}
            onKeyDown={onKeyDown}
          />
          <div class="mnemonic-actions">
            <button
              type="button"
              class="mnemonic-btn"
              onClick={() => setEditing(false)}
            >
              {MNEMONIC_LABELS.cancel}
            </button>
            <button
              type="button"
              class="mnemonic-btn mnemonic-btn--primary"
              onClick={commit}
            >
              {MNEMONIC_LABELS.save}
            </button>
          </div>
        </div>
      ) : text ? (
        <p class="mnemonic-text">{text}</p>
      ) : (
        <p class="mnemonic-hint">
          {hint ? <span class="mnemonic-hint-formula" lang="vi">{hint}</span> : null}
          <span class="mnemonic-hint-note">{hint ? MNEMONIC_LABELS.hintNote : MNEMONIC_LABELS.emptyHint}</span>
        </p>
      )}
    </div>
  );
}

/**
 * Mount/refresh the box in a container, or clear it when `hanzi` is null.
 * @param {HTMLElement|null} container
 * @param {string|null} hanzi
 * @param {string} hint
 */
export function renderMnemonicBox(container, hanzi, hint) {
  if (!container) return;
  if (!hanzi) {
    render(null, container);
    container.hidden = true;
    return;
  }
  container.hidden = false;
  render(<MnemonicBox hanzi={hanzi} hint={hint} />, container);
}
