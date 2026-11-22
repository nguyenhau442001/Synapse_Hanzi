#!/usr/bin/env python3
"""
tests/test_topic_picker_layout.py

Verifies that the Topic Picker screen (#screenTopicPicker) is positioned directly
underneath the navigation controls and level picker, rather than being pushed below
the dashboard auxiliary column, bottom widgets, or the creator signature.
"""

from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent


def test_topic_picker_dom_position():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")
    hub = soup.find(id="screenVocabHub")
    assert hub is not None, "#screenVocabHub must exist"

    pos_picker = html.find('id="screenPicker"')
    pos_topic = html.find('id="screenTopicPicker"')
    pos_aux = html.find('class="dashboard-aux-column"')
    pos_bottom_widgets = html.find('id="dashboardBottomWidgets"')
    pos_signature = html.find('class="creator-signature"')

    assert pos_picker != -1, "#screenPicker must exist"
    assert pos_topic != -1, "#screenTopicPicker must exist"
    assert pos_aux != -1, ".dashboard-aux-column must exist"
    assert pos_bottom_widgets != -1, "#dashboardBottomWidgets must exist"
    assert pos_signature != -1, ".creator-signature must exist"

    # #screenTopicPicker must appear right after #screenPicker and BEFORE aux widgets and footer
    assert pos_picker < pos_topic < pos_aux, "#screenTopicPicker should follow #screenPicker and precede .dashboard-aux-column"
    assert pos_topic < pos_bottom_widgets, "#screenTopicPicker must precede #dashboardBottomWidgets"
    assert pos_topic < pos_signature, "#screenTopicPicker must precede .creator-signature"


def test_radical_hub_toggles_aux_and_bottom_widgets_for_topic_tab():
    hub_code = (ROOT / "src/islands/RadicalHub.jsx").read_text(encoding="utf-8")
    assert "dashboard-aux-column" in hub_code, "RadicalHub must reference .dashboard-aux-column"
    assert "dashboardBottomWidgets" in hub_code, "RadicalHub must reference #dashboardBottomWidgets"
    assert "tab === 'level' ? '' : 'none'" in hub_code, "Auxiliary and bottom widgets should only be shown on level tab"
