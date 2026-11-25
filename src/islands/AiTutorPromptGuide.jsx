/**
 * AiTutorPromptGuide.jsx
 * Displays the HSK 3.0 Level 4 & HSKK Intermediate AI Live Tutor prompt,
 * 3-step Google AI Studio (Gemini 3.8 Live) setup instructions, and one-click copy.
 */

import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { Copy, Check, Sparkles, ExternalLink, Mic } from 'lucide-preact';
import { APP_TIMEOUTS } from './AppTimeouts.js';
import { AI_TUTOR_PROMPT_DATA, AI_TUTOR_UI_LABELS } from './AiTutorPromptConstants.js';

/**
 * Copy text to clipboard with a textarea fallback for restricted contexts.
 * @param {string} text
 * @returns {Promise<boolean>}
 */
async function copyTextToClipboard(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below
    }
  }
  if (typeof document === 'undefined') return false;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  let success = false;
  try {
    success = document.execCommand('copy');
  } catch {
    success = false;
  }
  document.body.removeChild(textarea);
  return success;
}

export function AiTutorPromptGuide({ onBack } = {}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopyPrompt = async () => {
    const ok = await copyTextToClipboard(AI_TUTOR_PROMPT_DATA.systemPrompt);
    if (!ok) return;
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCopied(false);
    }, APP_TIMEOUTS.TOAST_DURATION_MS);
  };

  return (
    <section
      class="ai-tutor-guide"
      aria-label={AI_TUTOR_UI_LABELS.HEADER_TITLE}
    >
      {typeof onBack === 'function' && (
        <div class="ai-tutor-back-row">
          <button
            type="button"
            class="exam-pill-btn"
            onClick={onBack}
          >
            {AI_TUTOR_UI_LABELS.BACK_BTN}
          </button>
        </div>
      )}

      <div class="ai-tutor-hero">
        <div class="ai-tutor-badge">
          <Sparkles size={15} strokeWidth={2} />
          <span>{AI_TUTOR_UI_LABELS.BADGE_LIVE}</span>
        </div>
        <h2 class="ai-tutor-title">{AI_TUTOR_UI_LABELS.HEADER_TITLE}</h2>
        <p class="ai-tutor-subtitle">{AI_TUTOR_UI_LABELS.HEADER_SUBTITLE}</p>

        <div class="ai-tutor-meta-pills">
          <span class="ai-tutor-meta-pill">
            <Mic size={14} strokeWidth={2} />
            <span>{AI_TUTOR_PROMPT_DATA.targetModel}</span>
          </span>
          <span class="ai-tutor-meta-pill">
            <span>{AI_TUTOR_PROMPT_DATA.targetExam}</span>
          </span>
        </div>

        <div class="ai-tutor-actions">
          <button
            type="button"
            class={`ai-tutor-copy-btn ${copied ? 'is-copied' : ''}`}
            title={AI_TUTOR_UI_LABELS.COPY_BTN_TITLE}
            aria-label={AI_TUTOR_UI_LABELS.COPY_BTN_TITLE}
            onClick={handleCopyPrompt}
          >
            {copied ? <Check size={16} strokeWidth={2.2} /> : <Copy size={16} strokeWidth={2} />}
            <span>{copied ? AI_TUTOR_UI_LABELS.COPY_BTN_DONE : AI_TUTOR_UI_LABELS.COPY_BTN_IDLE}</span>
          </button>

          <a
            href={AI_TUTOR_PROMPT_DATA.aiStudioUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="ai-tutor-studio-link"
            title={AI_TUTOR_UI_LABELS.OPEN_STUDIO_TITLE}
            aria-label={AI_TUTOR_UI_LABELS.OPEN_STUDIO_TITLE}
          >
            <span>{AI_TUTOR_UI_LABELS.OPEN_STUDIO_BTN}</span>
            <ExternalLink size={15} strokeWidth={2} />
          </a>
        </div>
      </div>

      <div class="ai-tutor-grid">
        <div class="ai-tutor-card">
          <h3 class="ai-tutor-card-title">{AI_TUTOR_UI_LABELS.SETUP_SECTION_TITLE}</h3>
          <ol class="ai-tutor-steps">
            {AI_TUTOR_PROMPT_DATA.setupSteps.map((item) => (
              <li
                key={item.step}
                class="ai-tutor-step-item"
              >
                <span class="ai-tutor-step-num">{item.step}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div class="ai-tutor-card">
          <h3 class="ai-tutor-card-title">{AI_TUTOR_UI_LABELS.MODES_SECTION_TITLE}</h3>
          <div class="ai-tutor-modes">
            {AI_TUTOR_PROMPT_DATA.practiceModes.map((mode) => (
              <div
                key={mode.id}
                class="ai-tutor-mode-item"
              >
                <strong>{mode.title}</strong>
                <p>{mode.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div class="ai-tutor-card ai-tutor-rules-card">
        <h3 class="ai-tutor-card-title">{AI_TUTOR_UI_LABELS.RULES_SECTION_TITLE}</h3>
        <ul class="ai-tutor-rules-list">
          {AI_TUTOR_PROMPT_DATA.correctionRules.map((rule, idx) => (
            <li key={idx}>{rule}</li>
          ))}
        </ul>
      </div>

      <div class="ai-tutor-prompt-box">
        <div class="ai-tutor-prompt-header">
          <h3 class="ai-tutor-card-title">{AI_TUTOR_UI_LABELS.PROMPT_SECTION_TITLE}</h3>
          <button
            type="button"
            class={`ai-tutor-copy-btn ai-tutor-copy-btn-sm ${copied ? 'is-copied' : ''}`}
            title={AI_TUTOR_UI_LABELS.COPY_BTN_TITLE}
            aria-label={AI_TUTOR_UI_LABELS.COPY_BTN_TITLE}
            onClick={handleCopyPrompt}
          >
            {copied ? <Check size={14} strokeWidth={2.2} /> : <Copy size={14} strokeWidth={2} />}
            <span>{copied ? AI_TUTOR_UI_LABELS.COPY_BTN_DONE : AI_TUTOR_UI_LABELS.COPY_BTN_IDLE}</span>
          </button>
        </div>
        <pre class="ai-tutor-prompt-pre">{AI_TUTOR_PROMPT_DATA.systemPrompt}</pre>
      </div>
    </section>
  );
}

export default AiTutorPromptGuide;
