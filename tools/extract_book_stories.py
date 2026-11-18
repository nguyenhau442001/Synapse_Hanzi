#!/usr/bin/env python3
"""
tools/extract_book_stories.py
Extracts articles from the Chinese encyclopedia book "万物有意思" (PDF)
for adapting into Synapse_Hanzi graded reading materials.
"""

import sys
import os
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
# Add isolated local dependencies directory to sys.path
if (REPO_ROOT / "tools" / ".deps").exists():
    sys.path.insert(0, str(REPO_ROOT / "tools" / ".deps"))

import pypdf

PDF_PATH = (
    REPO_ROOT
    / "books"
    / "Vạn vật thú vị (Phiên bản Trung Quốc + Phiên bản Thế giới) (Bộ 4 cuốn) 万物有意思（中国篇+世界篇）（套装4册）(八十余个历史之谜，穿越千年时光，此刻扑面而来……） (北京日报.pdf"
)
OUTPUT_DIR = REPO_ROOT / "database" / "readings" / "raw_books"


def get_pdf_reader() -> pypdf.PdfReader:
    """Loads and returns the PDF reader instance."""
    if not PDF_PATH.exists():
        print(f"[-] PDF file not found at: {PDF_PATH}")
        sys.exit(1)
    return pypdf.PdfReader(str(PDF_PATH))


def list_articles(reader: pypdf.PdfReader) -> list:
    """Traverses the PDF outline hierarchy and returns a flat list of articles with page numbers."""
    articles = []

    def walk_outline(items):
        for it in items:
            if isinstance(it, list):
                walk_outline(it)
            else:
                title = getattr(it, "title", str(it))
                page_num = None
                try:
                    page_num = reader.get_destination_page_number(it)
                except Exception:
                    pass
                articles.append({"title": title, "page": page_num})

    try:
        walk_outline(reader.outline)
    except Exception as e:
        print(f"[-] Error reading PDF outline: {e}")

    return articles


def extract_pages_text(reader: pypdf.PdfReader, start_page: int, end_page: int) -> str:
    """Extracts raw text from start_page to end_page (0-indexed)."""
    text_chunks = []
    total = len(reader.pages)
    for p in range(max(0, start_page), min(end_page, total)):
        page_text = reader.pages[p].extract_text()
        if page_text:
            text_chunks.append(page_text.strip())
    return "\n\n".join(text_chunks)


def extract_specific_topics(reader: pypdf.PdfReader, target_keywords: list):
    """Finds and extracts articles matching the given keywords into text files."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    articles = list_articles(reader)

    # Filter articles with valid resolved page numbers
    valid_articles = [a for a in articles if a["page"] is not None]
    valid_articles.sort(key=lambda x: x["page"])

    extracted_count = 0
    for kw in target_keywords:
        matched = None
        matched_idx = -1
        for idx, a in enumerate(valid_articles):
            if kw in a["title"]:
                matched = a
                matched_idx = idx
                break

        if not matched:
            print(f"[-] No article matching keyword '{kw}' found in table of contents.")
            continue

        start_page = matched["page"]
        # Use next article start page or default to 12 pages forward
        if matched_idx + 1 < len(valid_articles):
            end_page = valid_articles[matched_idx + 1]["page"]
        else:
            end_page = start_page + 12

        print(f"[+] Found: '{matched['title']}' (Pages {start_page + 1} -> {end_page})")
        raw_text = extract_pages_text(reader, start_page, end_page)

        # Sanitize filename
        safe_filename = re.sub(r"[^\w\-\u4e00-\u9fff]", "_", matched["title"]).strip("_") + ".txt"
        out_file = OUTPUT_DIR / safe_filename
        with open(out_file, "w", encoding="utf-8") as f:
            f.write(f"# {matched['title']}\n")
            f.write(f"# Source: 万物有意思 (Pages {start_page + 1} - {end_page})\n\n")
            f.write(raw_text)

        print(f"    -> Extracted {len(raw_text)} chars to: {out_file.relative_to(REPO_ROOT)}")
        extracted_count += 1

    print(f"\n[✓] Completed extraction of {extracted_count} articles.")


def main():
    reader = get_pdf_reader()
    print(f"[*] Total PDF pages: {len(reader.pages)}")

    if len(sys.argv) > 1 and sys.argv[1] == "--list":
        articles = list_articles(reader)
        print(f"\nTotal TOC entries found: {len(articles)}")
        for i, a in enumerate(articles):
            pg_str = f"Page {a['page'] + 1}" if a["page"] is not None else "Unknown page"
            print(f"{i + 1:3d}. {a['title']} ({pg_str})")
        return

    # Default to 3 pilot articles: Chopsticks (筷子), Tea (茶), Dumplings (饺子)
    keywords = ["筷子", "茶", "饺子"]
    if len(sys.argv) > 1 and sys.argv[1] != "--list":
        keywords = sys.argv[1:]

    print(f"[*] Extracting target keywords: {keywords}")
    extract_specific_topics(reader, keywords)


if __name__ == "__main__":
    main()
