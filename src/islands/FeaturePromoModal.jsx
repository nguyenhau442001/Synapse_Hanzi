/**
 * FeaturePromoModal.jsx
 * Short, punchy feature showcase popup on the home landing page highlighting
 * the newest capabilities of Synapse Hanzi (Speaking AI, 4 skills, FSRS, offline).
 */

import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { setPrimaryTab } from './RadicalHub.jsx';

const STORAGE_KEY = 'synapse_latest_features_seen_v3_50';

const LATEST_FEATURES = [
  {
    icon: '🎙️',
    title: 'Luyện Nói & Chấm Thanh Điệu AI (MỚI)',
    desc: 'Đo cao độ F0 (YIN) theo thang Chao, xử lý biến điệu Sandhi & shadowing A/B trực quan.',
    isNew: true,
    actionTab: 'speaking'
  },
  {
    icon: '🎧',
    title: 'Luyện Nghe HSK 4 Studio',
    desc: 'Bản thu giọng chuẩn bản ngữ, đồng bộ khớp câu chữ & chế độ nghe lặp sâu.',
    actionTab: 'listening'
  },
  {
    icon: '📖',
    title: 'Đọc Hiểu Phân Cấp & Manga',
    desc: 'Truyện tranh HSK song ngữ, pinyin màu theo thanh điệu và tra từ tức thì.',
    actionTab: 'reading'
  },
  {
    icon: '✍️',
    title: 'Tập Viết Bút Lông Cảm Ứng Lực',
    desc: 'Mô phỏng nét bút thư pháp, phân tích bộ thủ và chiết tự cấu tạo chữ Hán.',
    actionTab: 'writing'
  },
  {
    icon: '🧠',
    title: 'Thuật Toán Trí Nhớ FSRS Hiện Đại',
    desc: 'Ôn tập ngắt quãng thông minh cá nhân hóa, nhớ lâu gấp 3 lần so với cách học vẹt.',
    actionTab: 'vocab'
  },
  {
    icon: '⚡',
    title: 'Trò Chơi Phản Xạ & Ôn Nhanh',
    desc: 'Đoán từ qua emoji, xếp câu ngữ pháp HSK 4 và điền từ thần tốc.',
    actionTab: 'vocab'
  },
  {
    icon: '📴',
    title: '100% Offline & Bảo Mật Tuyệt Đối',
    desc: 'Chạy trọn vẹn trong trình duyệt không cần backend, không lưu dữ liệu người dùng ra ngoài.'
  }
];

let openModalFn = null;

function FeaturePromoModalApp() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    openModalFn = () => setIsOpen(true);
    // Check if already seen in localStorage
    const hasSeen = localStorage.getItem(STORAGE_KEY);
    if (!hasSeen) {
      // Small timeout to allow landing page to settle smoothly
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
  };

  const handleOpenSpeaking = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
    if (typeof setPrimaryTab === 'function') {
      setPrimaryTab('speaking');
    } else if (window.setPrimaryTab) {
      window.setPrimaryTab('speaking');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div class="feature-promo-backdrop" onClick={handleClose}>
      <div
        class="feature-promo-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="promoTitle"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div class="promo-header">
          <div class="promo-badge">
            <span class="promo-badge-spark">✨</span>
            <span>CẬP NHẬT MỚI NHẤT · BỘ 4 KỸ NĂNG</span>
          </div>
          <button
            class="promo-close-btn"
            onClick={handleClose}
            aria-label="Đóng cửa sổ"
          >
            ✕
          </button>
        </div>

        <h2 id="promoTitle" class="promo-title">
          Chào mừng đến với Synapse Hanzi
        </h2>
        <p class="promo-lead">
          Trạm học chữ Hán & tiếng Trung đa giác quan, hiện đại, mỹ học Đông phương và 100% Offline.
        </p>

        {/* Feature List (Compact & punchy) */}
        <div class="promo-features-list">
          {LATEST_FEATURES.map((item) => (
            <div class={`promo-feature-row ${item.isNew ? 'is-highlight' : ''}`}>
              <div class="promo-row-icon">{item.icon}</div>
              <div class="promo-row-content">
                <div class="promo-row-title">
                  {item.title}
                  {item.isNew && <span class="promo-tag-new">MỚI</span>}
                </div>
                <div class="promo-row-desc">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Footer */}
        <div class="promo-footer">
          <button class="promo-cta-primary" onClick={handleOpenSpeaking}>
            <span>🎙️ Trải Nghiệm Luyện Nói Ngay</span>
          </button>
          <button class="promo-cta-secondary" onClick={handleClose}>
            Bắt đầu học
          </button>
        </div>
      </div>
    </div>
  );
}

let promoMounted = false;

export function openFeaturePromoModal() {
  if (typeof openModalFn === 'function') {
    openModalFn();
  }
}

export function mountFeaturePromoModal() {
  let host = document.getElementById('featurePromoModalRoot');
  if (!host) {
    host = document.createElement('div');
    host.id = 'featurePromoModalRoot';
    document.body.appendChild(host);
  }
  if (!promoMounted) {
    render(<FeaturePromoModalApp />, host);
    promoMounted = true;
    window.openFeaturePromoModal = openFeaturePromoModal;
  }
}
