"""
Tests for app brand logo and title home navigation feature.
Verifies shell structure, event wiring, styling, and router navigation.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX_HTML = (ROOT / "index.html").read_text(encoding="utf-8")
APP_HEADER_JSX = (ROOT / "src/islands/AppHeader.jsx").read_text(encoding="utf-8")
HEADER_CONSTANTS_JS = (ROOT / "src/islands/HeaderConstants.js").read_text(encoding="utf-8")
APP_BOOTSTRAP_JS = (ROOT / "src/islands/AppBootstrap.js").read_text(encoding="utf-8")
SPA_ROUTER_JS = (ROOT / "src/islands/SpaRouter.js").read_text(encoding="utf-8")
DESIGN_SYSTEM_CSS = (ROOT / "assets/css/design-system.css").read_text(encoding="utf-8")
BASE_CSS = (ROOT / "assets/css/base.css").read_text(encoding="utf-8")
FLASHCARDS_CSS = (ROOT / "assets/flashcards.css").read_text(encoding="utf-8")


def test_brand_logo_home_button_in_index():
    assert 'id="appHeader"' in INDEX_HTML
    assert "id={IDS.HOME_BTN}" in APP_HEADER_JSX
    assert 'class="ah-logo-btn"' in APP_HEADER_JSX
    assert "HOME_BTN: 'appBrandHomeBtn'" in HEADER_CONSTANTS_JS
    assert "HEADER_LOGO_SRC = 'assets/images/logo.svg'" in HEADER_CONSTANTS_JS
    assert "BRAND_TEXT: 'appBrandTextBlock'" in HEADER_CONSTANTS_JS


def test_spa_router_exports_navigate_to_home():
    assert "function navigateToHome()" in SPA_ROUTER_JS
    assert "navigateToHome," in SPA_ROUTER_JS
    assert "export function navigateToHome()" in SPA_ROUTER_JS
    assert "window.navigateToHome = () => SpaRouter.navigateToHome();" in SPA_ROUTER_JS


def test_app_header_wires_home_navigation():
    assert "const goHome = () => callGlobal('navigateToHome');" in APP_HEADER_JSX
    assert APP_HEADER_JSX.count("onClick={goHome}") == 2
    assert "e.key !== 'Enter' && e.key !== ' '" in APP_HEADER_JSX


def test_brand_home_button_styles():
    app_header_css = (ROOT / "assets/css/app-header.css").read_text(encoding="utf-8")
    for selector in (".ah-logo-btn {", ".ah-logo-btn:hover {", ".ah-logo-btn:active {", ".ah-brand-text:focus-visible"):
        assert selector in app_header_css, selector
    assert ".ah-logo-btn" in FLASHCARDS_CSS
    assert ".app-brand-home-btn" not in DESIGN_SYSTEM_CSS and ".app-brand-home-btn" not in BASE_CSS


def test_global_back_button_hidden_on_home_page():
    assert "BACK_BTN: 'globalBackBtn'" in HEADER_CONSTANTS_JS
    assert "BACK_ARIA: 'Quay lại trang trước'" in HEADER_CONSTANTS_JS
    assert "BACK_TITLE: 'Quay lại trang trước (Alt+Left)'" in HEADER_CONSTANTS_JS
    assert "id={IDS.BACK_BTN}" in APP_HEADER_JSX
    assert "function isRootView(state)" in SPA_ROUTER_JS
    assert "setHeaderUi({ showBackButton: !isRootView() });" in SPA_ROUTER_JS
    assert "hidden={!headerUi.value.showBackButton}" in APP_HEADER_JSX
    assert "isRootView," in SPA_ROUTER_JS

