#!/usr/bin/env python3
from __future__ import annotations

import csv
import os
import re
import time
from typing import Dict, List, Optional, Tuple
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

BASE = "https://www.scouts.org.uk"

SECTIONS: Dict[str, str] = {
    "Squirrels": "squirrels",
    "Beavers": "beavers",
    "Cubs": "cubs",
    "Scouts": "scouts",
    "Explorers": "explorers",
}

# Where CSVs will live (so you can preview them in the browser)
OUT_DIR = "assets/data/badges"

UA = {
    "User-Agent": "STEM-Scouts badge requirements extractor (planning/mapping; polite rate limiting)"
}

SESSION = requests.Session()
SESSION.headers.update(UA)


def clean_ws(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def fetch(url: str) -> str:
    r = SESSION.get(url, timeout=40)
    r.raise_for_status()
    return r.text


def ensure_out_dir() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)


def write_csv(path: str, rows: List[Dict[str, str]]) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(
            f,
            fieldnames=[
                "section",
                "category",
                "badge_name",
                "requirement_no",
                "requirement_text",
                "source_url",
            ],
        )
        w.writeheader()
        w.writerows(rows)


def _flatten_li(li) -> str:
    """
    Flatten nested list items:
      'Do X' + nested bullets => 'Do X (a; b; c)'
    """
    frag = BeautifulSoup(str(li), "lxml").find("li")
    if frag is None:
        return ""

    nested = frag.find(["ol", "ul"])
    subs: List[str] = []
    if nested:
        for subli in nested.select("li"):
            subs.append(clean_ws(subli.get_text(" ", strip=True)))
        nested.decompose()

    main = clean_ws(frag.get_text(" ", strip=True))
    if subs:
        return f"{main} ({'; '.join(subs)})"
    return main


def extract_badge_name(soup: BeautifulSoup) -> str:
    h1 = soup.find("h1")
    return clean_ws(h1.get_text(" ", strip=True)) if h1 else "Unknown"


def find_requirements_anchor(soup: BeautifulSoup):
    """
    Try to locate the "How to earn your badge" heading.
    """
    for tag in soup.find_all(["h2", "h3", "h4"]):
        t = clean_ws(tag.get_text(" ", strip=True)).lower()
        if "how to earn your badge" in t or t.startswith("to earn your badge"):
            return tag
    return None


def extract_numbered_requirements(html: str) -> List[str]:
    """
    Extract top-level numbered requirements.
    We prefer the first <ol> under 'How to earn your badge'.
    If not found, fallback to first <ol> on the page.
    """
    soup = BeautifulSoup(html, "lxml")
    anchor = find_requirements_anchor(soup)

    # Best case: first <ol> after anchor
    if anchor:
        for sib in anchor.find_all_next():
            # stop at a new major section
            if sib.name in ["h2", "h3"] and sib is not anchor:
                break
            if sib.name == "ol":
                reqs: List[str] = []
                for li in sib.find_all("li", recursive=False):
                    txt = _flatten_li(li)
                    if txt:
                        reqs.append(txt)
                if reqs:
                    return reqs

    # Fallback: first <ol> anywhere
    first_ol = soup.find("ol")
    if first_ol:
        reqs: List[str] = []
        for li in first_ol.find_all("li", recursive=False):
            txt = _flatten_li(li)
            if txt:
                reqs.append(txt)
        if reqs:
            return reqs

    return []


def collect_detail_links(listing_html: str, listing_url: str, must_contain: str) -> List[str]:
    """
    Collect detail pages that contain a path fragment like:
      '/cubs/activity-badges/' or '/cubs/awards/' etc.
    """
    soup = BeautifulSoup(listing_html, "lxml")
    links = set()

    for a in soup.select("a[href]"):
        href = (a.get("href") or "").strip()
        if not href:
            continue
        full = urljoin(listing_url, href).split("#")[0]
        if not full.startswith(BASE):
            continue
        if must_contain not in full:
            continue

        # Must be a detail page (something after the fragment)
        parts = full.split(must_contain, 1)
        if len(parts) == 2 and parts[1].strip("/"):
            links.add(full)

    return sorted(links)


def scrape_badge_pages(
    section_name: str,
    category: str,
    badge_urls: List[str],
    polite_sleep_s: float = 0.25,
) -> List[Dict[str, str]]:
    rows: List[Dict[str, str]] = []

    for url in badge_urls:
        time.sleep(polite_sleep_s)
        try:
            html = fetch(url)
            soup = BeautifulSoup(html, "lxml")
            badge_name = extract_badge_name(soup)
            reqs = extract_numbered_requirements(html)

            if not reqs:
                # emit a row so you can spot misses (and fix parser if needed)
                rows.append(
                    {
                        "section": section_name,
                        "category": category,
                        "badge_name": badge_name,
                        "requirement_no": "",
                        "requirement_text": "",
                        "source_url": url,
                    }
                )
                continue

            for i, req in enumerate(reqs, start=1):
                rows.append(
                    {
                        "section": section_name,
                        "category": category,
                        "badge_name": badge_name,
                        "requirement_no": str(i),
                        "requirement_text": req,
                        "source_url": url,
                    }
                )

        except Exception:
            rows.append(
                {
                    "section": section_name,
                    "category": category,
                    "badge_name": "UNKNOWN",
                    "requirement_no": "",
                    "requirement_text": "",
                    "source_url": url,
                }
            )

    return rows


def list_activity_badges(section_slug: str) -> List[str]:
    list_url = f"{BASE}/{section_slug}/activity-badges/"
    html = fetch(list_url)
    return collect_detail_links(html, list_url, f"/{section_slug}/activity-badges/")


def list_awards_pages(section_slug: str) -> List[str]:
    """
    Awards pages list lots of award-type pages; we’ll filter heuristically
    for "challenge awards".
    """
    list_url = f"{BASE}/{section_slug}/awards/"
    html = fetch(list_url)
    urls = collect_detail_links(html, list_url, f"/{section_slug}/awards/")

    # Heuristic filter: keep likely challenge pages.
    # (You can widen/tighten this later.)
    keep_tokens = [
        "challenge", "personal", "team", "skills", "world", "outdoors",
        "adventure", "creative", "expedition", "leader", "promise", "award"
    ]
    filtered = []
    for u in urls:
        lu = u.lower()
        if any(tok in lu for tok in keep_tokens):
            filtered.append(u)
    return sorted(set(filtered))


def list_staged_badges() -> List[str]:
    """
    Staged badges are cross-section.
    This listing page uses a filter parameter (works on scouts.org.uk).
    """
    list_url = f"{BASE}/activity-badges/?filter=StagedBadgeParent"
    html = fetch(list_url)
    return collect_detail_links(html, list_url, "/staged-badges/")


def main() -> None:
    ensure_out_dir()
    master_rows: List[Dict[str, str]] = []

    # 1) Activity badges per section
    for section_name, slug in SECTIONS.items():
        print(f"[activity] {section_name} …")
        badge_urls = list_activity_badges(slug)
        rows = scrape_badge_pages(section_name, "activity_badge", badge_urls)
        out = f"{OUT_DIR}/activity_badges__{slug}.csv"
        write_csv(out, rows)
        master_rows.extend(rows)

    # 2) Challenge awards per section (from /<section>/awards/)
    for section_name, slug in SECTIONS.items():
        print(f"[awards] {section_name} …")
        award_urls = list_awards_pages(slug)
        rows = scrape_badge_pages(section_name, "challenge_award", award_urls)
        out = f"{OUT_DIR}/challenge_awards__{slug}.csv"
        write_csv(out, rows)
        master_rows.extend(rows)

    # 3) Staged badges (all)
    print("[staged] All …")
    staged_urls = list_staged_badges()
    rows = scrape_badge_pages("All", "staged_badge", staged_urls)
    out = f"{OUT_DIR}/staged_badges__all.csv"
    write_csv(out, rows)
    master_rows.extend(rows)

    # 4) Master combined
    write_csv(f"{OUT_DIR}/all_badges_requirements_master.csv", master_rows)
    print(f"Done. Wrote CSVs to: {OUT_DIR}/")


if __name__ == "__main__":
    main()