// src/islands/ShareModal.js
// Native Web Share API integration with responsive fallback modal dialog
// (copy to clipboard and direct social links for Facebook & Telegram).

const APP_SHARE_DATA = {
  title: '汉字思维 (Hanzi Mind) — Học chữ Hán qua tư duy bản chất',
  text: 'Trạm học chữ Hán qua tư duy âm Hán - Việt, thuật toán FSRS, tranh minh họa và đọc truyện tranh song ngữ 100% miễn phí!',
  url: 'https://nguyenhau442001.github.io/Synapse_Hanzi/'
};

let shareModalElement = null;

export function getCanonicalShareUrl() {
  if (typeof window === 'undefined') return APP_SHARE_DATA.url;
  try {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    if (origin && origin !== 'null' && !origin.startsWith('file:')) {
      return origin + pathname;
    }
  } catch {
    // Fall back to default URL
  }
  return APP_SHARE_DATA.url;
}

export function openShareModal() {
  if (typeof document === 'undefined') return;

  const shareUrl = getCanonicalShareUrl();
  const shareText = APP_SHARE_DATA.text;

  if (!shareModalElement) {
    const overlay = document.createElement('div');
    overlay.className = 'share-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Chia sẻ 汉字思维');

    const fbUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl);
    const tgUrl = 'https://t.me/share/url?url=' + encodeURIComponent(shareUrl) + '&text=' + encodeURIComponent(shareText);

    overlay.innerHTML =
      '<div class="share-modal-card">' +
        '<div class="share-modal-header">' +
          '<h3 class="share-modal-title"><span>💖 Chia sẻ với bạn bè</span></h3>' +
          '<button type="button" class="pwa-install-btn-dismiss" id="shareModalCloseBtn" aria-label="Đóng">✕</button>' +
        '</div>' +
        '<p class="share-modal-desc">Lan tỏa trạm học chữ Hán 100% miễn phí, không quảng cáo và tối ưu cho người Việt đến bạn bè!</p>' +
        '<div class="share-copy-box">' +
          '<input type="text" class="share-copy-input" id="shareCopyInput" readonly value="' + shareUrl + '" aria-label="Liên kết ứng dụng">' +
          '<button type="button" class="share-copy-btn" id="shareCopyBtn">Sao chép</button>' +
        '</div>' +
        '<div class="share-social-grid">' +
          '<a href="' + fbUrl + '" target="_blank" rel="noopener noreferrer" class="share-social-btn share-social-fb">' +
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>' +
            '<span>Facebook</span>' +
          '</a>' +
          '<a href="' + tgUrl + '" target="_blank" rel="noopener noreferrer" class="share-social-btn share-social-tg">' +
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>' +
            '<span>Telegram</span>' +
          '</a>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    shareModalElement = overlay;

    const closeBtn = overlay.querySelector('#shareModalCloseBtn');
    if (closeBtn) closeBtn.onclick = closeShareModal;

    const copyBtn = overlay.querySelector('#shareCopyBtn');
    const copyInput = overlay.querySelector('#shareCopyInput');
    if (copyBtn && copyInput) {
      copyBtn.onclick = () => {
        copyInput.select();
        copyInput.setSelectionRange(0, 99999);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareUrl).then(() => {
            copyBtn.textContent = 'Đã chép! ✅';
            setTimeout(() => {
              if (copyBtn) copyBtn.textContent = 'Sao chép';
            }, 2000);
          }).catch(() => {
            document.execCommand('copy');
            copyBtn.textContent = 'Đã chép! ✅';
          });
        } else {
          document.execCommand('copy');
          copyBtn.textContent = 'Đã chép! ✅';
        }
      };
    }

    overlay.onclick = e => {
      if (e.target === overlay) closeShareModal();
    };
  }

  requestAnimationFrame(() => {
    if (shareModalElement) {
      shareModalElement.classList.add('is-visible');
    }
  });
}

export function closeShareModal() {
  if (shareModalElement) {
    shareModalElement.classList.remove('is-visible');
  }
}

export function shareApp() {
  const shareUrl = getCanonicalShareUrl();
  const shareData = {
    title: APP_SHARE_DATA.title,
    text: APP_SHARE_DATA.text,
    url: shareUrl
  };

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    navigator.share(shareData).catch(err => {
      if (err && err.name !== 'AbortError') {
        openShareModal();
      }
    });
    return;
  }

  openShareModal();
}

export function initShareFeature() {
  if (typeof document === 'undefined') return;

  const dropdownItem = document.getElementById('headerMenuShare');
  if (dropdownItem) {
    dropdownItem.onclick = () => shareApp();
  }
}

if (typeof window !== 'undefined') {
  window.shareApp = shareApp;
  window.openShareModal = openShareModal;
  window.closeShareModal = closeShareModal;
  window.initShareFeature = initShareFeature;
}
