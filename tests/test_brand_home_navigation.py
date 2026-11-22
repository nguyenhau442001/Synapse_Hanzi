"""
Tests for app brand logo and title home navigation feature.
Verifies shell structure, event wiring, styling, and router navigation.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX_HTML = (ROOT / "index.html").read_text(encoding="utf-8")
APP_BOOTSTRAP_JS = (ROOT / "src/islands/AppBootstrap.js").read_text(encoding="utf-8")
SPA_ROUTER_JS = (ROOT / "src/islands/SpaRouter.js").read_text(encoding="utf-8")
DESIGN_SYSTEM_CSS = (ROOT / "assets/css/design-system.css").read_text(encoding="utf-8")
BASE_CSS = (ROOT / "assets/css/base.css").read_text(encoding="utf-8")
FLASHCARDS_CSS = (ROOT / "assets/flashcards.css").read_text(encoding="utf-8")


def test_brand_logo_home_button_in_index():
    assert 'id="appBrandHomeBtn"' in INDEX_HTML
    assert 'class="app-brand-home-btn"' in INDEX_HTML
    assert 'src="assets/images/logo.svg"' in INDEX_HTML
    assert 'id="appBrandTextBlock"' in INDEX_HTML


def test_spa_router_exports_navigate_to_home():
    assert "function navigateToHome()" in SPA_ROUTER_JS
    assert "navigateToHome," in SPA_ROUTER_JS
    assert "export function navigateToHome()" in SPA_ROUTER_JS
    assert "window.navigateToHome = () => SpaRouter.navigateToHome();" in SPA_ROUTER_JS


def test_app_bootstrap_wires_home_navigation():
    assert "onId('appBrandHomeBtn', 'click', handleHomeNavigation);" in APP_BOOTSTRAP_JS
    assert "onId('appBrandTextBlock', 'click', handleHomeNavigation);" in APP_BOOTSTRAP_JS
    assert "on('.app-brand-logo-img', 'click', handleHomeNavigation);" in APP_BOOTSTRAP_JS
    assert "window.navigateToHome()" in APP_BOOTSTRAP_JS


def test_brand_home_button_styles():
    assert ".app-brand-home-btn {" in DESIGN_SYSTEM_CSS
    assert ".app-brand-home-btn:hover {" in DESIGN_SYSTEM_CSS
    assert ".app-brand-home-btn:active {" in DESIGN_SYSTEM_CSS
    assert ".app-brand-home-btn {" in BASE_CSS
    assert ".app-brand-home-btn" in FLASHCARDS_CSS


def test_global_back_button_hidden_on_home_page():
    assert 'id="globalBackBtn"' in INDEX_HTML
    assert '<button type="button" id="globalBackBtn" class="global-back-btn" aria-label="Quay lại trang trước" title="Quay lại trang trước (Alt+Left)" hidden>' in INDEX_HTML
    assert "function isRootView(state)" in SPA_ROUTER_JS
    assert "btn.hidden = isRoot;" in SPA_ROUTER_JS
    assert "isRootView," in SPA_ROUTER_JS

