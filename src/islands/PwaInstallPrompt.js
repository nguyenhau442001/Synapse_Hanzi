// src/islands/PwaInstallPrompt.js
// PWA installation prompt coordinator for Android/Chromium (beforeinstallprompt)
// and iOS Safari (interactive 3-step home screen installation guide).
import { setHeaderUi } from './HeaderStore.js';

const DISMISS_KEY = 'hsk_pwa_install_dismissed_until';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

let deferredPrompt = null;
let bannerElement = null;
let iosModalElement = null;

export function isAppStandalone() {
  if (typeof window === 'undefined') return false;
  const isStandaloneDisplay = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  const isIosStandalone = window.navigator && window.navigator.standalone === true;
  const isAndroidApp = typeof document !== 'undefined' && document.referrer.includes('android-app://');
  return Boolean(isStandaloneDisplay || isIosStandalone || isAndroidApp);
}

export function isIosDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isAppleMobile = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isIpadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return Boolean(isAppleMobile || isIpadOs);
}

export function isInstallDismissed() {
  if (typeof localStorage === 'undefined') return false;
  try {
    const until = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
    return Date.now() < until;
  } catch {
    return false;
  }
}

export function dismissInstallPrompt() {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DURATION_MS));
    } catch {
      // Ignore localStorage errors
    }
  }
  if (bannerElement) {
    bannerElement.classList.remove('is-visible');
    setTimeout(() => {
      if (bannerElement && bannerElement.parentNode) {
        bannerElement.parentNode.removeChild(bannerElement);
        bannerElement = null;
      }
    }, 300);
  }
}

export function showIosInstallModal() {
  if (typeof document === 'undefined') return;
  if (!iosModalElement) {
    const overlay = document.createElement('div');
    overlay.className = 'pwa-ios-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Hướng dẫn cài đặt ứng dụng trên iPhone');

    overlay.innerHTML =
      '<div class="pwa-ios-modal-card">' +
        '<div class="pwa-ios-modal-header">' +
          '<h3 class="pwa-ios-modal-title">' +
            '<span>📲 Cài đặt 汉字思维</span>' +
          '</h3>' +
          '<button type="button" class="pwa-install-btn-dismiss" id="pwaIosModalCloseBtn" aria-label="Đóng">✕</button>' +
        '</div>' +
        '<div class="pwa-ios-steps-list">' +
          '<div class="pwa-ios-step-item">' +
            '<div class="pwa-ios-step-badge">1</div>' +
            '<div class="pwa-ios-step-content">' +
              '<div class="pwa-ios-step-label">Bấm nút Chia sẻ <span class="pwa-ios-icon-box">⎋ / ⤤</span></div>' +
              '<div class="pwa-ios-step-desc">Trên thanh công cụ ở dưới cùng của Safari (hoặc trên cùng của iPad), bấm vào biểu tượng <strong>Chia sẻ</strong> (hình vuông có mũi tên trỏ lên).</div>' +
            '</div>' +
          '</div>' +
          '<div class="pwa-ios-step-item">' +
            '<div class="pwa-ios-step-badge">2</div>' +
            '<div class="pwa-ios-step-content">' +
              '<div class="pwa-ios-step-label">Chọn "Thêm vào MH chính" <span class="pwa-ios-icon-box">➕</span></div>' +
              '<div class="pwa-ios-step-desc">Cuộn xuống danh sách hành động và chọn dòng <strong>Thêm vào MH chính</strong> (Add to Home Screen).</div>' +
            '</div>' +
          '</div>' +
          '<div class="pwa-ios-step-item">' +
            '<div class="pwa-ios-step-badge">3</div>' +
            '<div class="pwa-ios-step-content">' +
              '<div class="pwa-ios-step-label">Bấm "Thêm" (Add) -> Xong! <span class="pwa-ios-icon-box">✅</span></div>' +
              '<div class="pwa-ios-step-desc">Bấm chữ <strong>Thêm</strong> ở góc trên bên phải màn hình. Biểu tượng ứng dụng sẽ xuất hiện ngay trên màn hình chính như ứng dụng từ App Store.</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="pwa-ios-modal-footer">' +
          '<button type="button" class="pwa-ios-confirm-btn" id="pwaIosConfirmBtn">Đã hiểu, đóng hướng dẫn</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    iosModalElement = overlay;

    const closeBtn = overlay.querySelector('#pwaIosModalCloseBtn');
    if (closeBtn) closeBtn.onclick = hideIosInstallModal;

    const confirmBtn = overlay.querySelector('#pwaIosConfirmBtn');
    if (confirmBtn) confirmBtn.onclick = hideIosInstallModal;

    overlay.onclick = e => {
      if (e.target === overlay) hideIosInstallModal();
    };
  }

  // Force reflow and show
  requestAnimationFrame(() => {
    if (iosModalElement) {
      iosModalElement.classList.add('is-visible');
    }
  });
}

export function hideIosInstallModal() {
  if (iosModalElement) {
    iosModalElement.classList.remove('is-visible');
  }
}

export function triggerInstallFlow() {
  if (isAppStandalone()) {
    return;
  }

  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(choiceResult => {
      if (choiceResult && choiceResult.outcome === 'accepted') {
        dismissInstallPrompt();
      }
      deferredPrompt = null;
    });
    return;
  }

  if (isIosDevice()) {
    showIosInstallModal();
    return;
  }

  // Fallback for desktop Chrome or unsupported browsers
  showIosInstallModal();
}

export function renderInstallBanner(type) {
  if (typeof document === 'undefined') return;
  if (isAppStandalone() || isInstallDismissed()) return;
  if (bannerElement) return;

  const banner = document.createElement('aside');
  banner.className = 'pwa-install-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Cài đặt ứng dụng 汉字思维');

  if (type === 'ios') {
    banner.innerHTML =
      '<div class="pwa-install-info">' +
        '<img src="assets/images/favicon.png" alt="Logo" class="pwa-install-icon" width="40" height="40">' +
        '<div class="pwa-install-text">' +
          '<span class="pwa-install-title">Thêm vào màn hình chính</span>' +
          '<span class="pwa-install-sub">Dùng như App thật trên iPhone / iPad</span>' +
        '</div>' +
      '</div>' +
      '<div class="pwa-install-actions">' +
        '<button type="button" class="pwa-install-btn-primary" id="pwaBannerInstallBtn">' +
          '<span>📲 Hướng dẫn 3 bước</span>' +
        '</button>' +
        '<button type="button" class="pwa-install-btn-dismiss" id="pwaBannerDismissBtn" aria-label="Để sau">✕</button>' +
      '</div>';
  } else {
    banner.innerHTML =
      '<div class="pwa-install-info">' +
        '<img src="assets/images/favicon.png" alt="Logo" class="pwa-install-icon" width="40" height="40">' +
        '<div class="pwa-install-text">' +
          '<span class="pwa-install-title">Cài đặt 汉字思维</span>' +
          '<span class="pwa-install-sub">1 chạm, 100% Offline, không quảng cáo</span>' +
        '</div>' +
      '</div>' +
      '<div class="pwa-install-actions">' +
        '<button type="button" class="pwa-install-btn-primary" id="pwaBannerInstallBtn">' +
          '<span>📥 Cài đặt ứng dụng về máy (Không cần CH Play)</span>' +
        '</button>' +
        '<button type="button" class="pwa-install-btn-dismiss" id="pwaBannerDismissBtn" aria-label="Để sau">✕</button>' +
      '</div>';
  }

  document.body.appendChild(banner);
  bannerElement = banner;

  const installBtn = banner.querySelector('#pwaBannerInstallBtn');
  if (installBtn) {
    installBtn.onclick = () => {
      triggerInstallFlow();
    };
  }

  const dismissBtn = banner.querySelector('#pwaBannerDismissBtn');
  if (dismissBtn) {
    dismissBtn.onclick = () => {
      dismissInstallPrompt();
    };
  }

  requestAnimationFrame(() => {
    setTimeout(() => {
      if (bannerElement) {
        bannerElement.classList.add('is-visible');
      }
    }, 1200);
  });
}

export function initPwaInstallPrompt() {
  if (typeof window === 'undefined') return;

  // If already installed in standalone mode, hide install buttons
  if (isAppStandalone()) {
    setHeaderUi({ canInstall: false });
    return;
  }

  // Handle Android / Chromium beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    renderInstallBanner('android');
  });

  // Handle app installed event
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    dismissInstallPrompt();
    setHeaderUi({ canInstall: false });
  });

  // Handle iOS Safari
  if (isIosDevice() && !isAppStandalone()) {
    renderInstallBanner('ios');
  }
}

if (typeof window !== 'undefined') {
  window.initPwaInstallPrompt = initPwaInstallPrompt;
  window.triggerInstallFlow = triggerInstallFlow;
  window.showIosInstallModal = showIosInstallModal;
  window.hideIosInstallModal = hideIosInstallModal;
}
