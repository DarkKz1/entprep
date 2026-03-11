#!/usr/bin/env python3
"""
Bulk translate questions from Russian to Kazakh using Google Translate (free).
Exports untranslated questions from Supabase, translates, and imports back.

Safe to interrupt and restart — progress is saved to Supabase after each question,
and the query filters out already-translated questions automatically.

Usage:
  python3 scripts/translate-google.py --subject=biology --limit=500
  python3 scripts/translate-google.py --all --limit=3000
  python3 scripts/translate-google.py --subject=reading --offset=0 --limit=2000
"""

import functools
import argparse
import json
import os
import signal
import sys
import time
import urllib.request
import urllib.error
from deep_translator import GoogleTranslator

# --- Config ---
SUPABASE_URL = os.environ.get('SUPABASE_URL') or os.environ.get('VITE_SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')
TRANSLATE_DELAY = 0.02  # seconds between Google Translate calls
MAX_GT_RETRIES = 5      # retries per translation call
GT_BACKOFF_BASE = 10    # base seconds for exponential backoff on 429/5xx

SUBJECTS = [
    'math', 'reading', 'history', 'math_profile', 'physics',
    'biology', 'english', 'chemistry', 'geography',
    'world_history', 'informatics', 'law', 'literature'
]

translator = GoogleTranslator(source='ru', target='kk')
print = functools.partial(print, flush=True)  # force flush for live output

# Graceful shutdown
_shutting_down = False
def _handle_signal(sig, frame):
    global _shutting_down
    if _shutting_down:
        print("\n  Force quit.")
        sys.exit(1)
    _shutting_down = True
    print("\n  Caught interrupt — finishing current question then exiting safely...")

signal.signal(signal.SIGINT, _handle_signal)
signal.signal(signal.SIGTERM, _handle_signal)


def supabase_request(path, method='GET', body=None, retries=3):
    """Make a request to Supabase REST API with retries."""
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
    }
    if method == 'GET':
        headers['Prefer'] = 'count=exact'

    data = json.dumps(body).encode() if body else None

    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, data=data, headers=headers, method=method)
            with urllib.request.urlopen(req, timeout=30) as resp:
                content_range = resp.headers.get('Content-Range', '')
                result = resp.read().decode()
                return json.loads(result) if result else None, content_range
        except urllib.error.HTTPError as e:
            err_body = e.read().decode()[:200]
            if e.code in (429, 500, 502, 503) and attempt < retries - 1:
                wait = (attempt + 1) * 5
                print(f"  Supabase {e.code}, retry in {wait}s...")
                time.sleep(wait)
            else:
                print(f"  HTTP {e.code}: {err_body}")
                return None, ''
        except Exception as e:
            if attempt < retries - 1:
                wait = (attempt + 1) * 3
                print(f"  Network error, retry in {wait}s: {e}")
                time.sleep(wait)
            else:
                print(f"  Network failed: {e}")
                return None, ''
    return None, ''


def fetch_untranslated(subject, limit=500, offset=0):
    """Fetch questions that don't have Kazakh translations yet."""
    cols = 'id,q,e,type,o,pairs,passage_title,passage_text'
    path = (
        f"questions?select={cols}"
        f"&subject=eq.{subject}"
        f"&q_kk=is.null"
        f"&order=idx.asc"
        f"&offset={offset}"
        f"&limit={limit}"
    )
    data, content_range = supabase_request(path)
    return data or []


def safe_translate(text):
    """Translate with exponential backoff retry on failure."""
    global translator
    if not text or len(text.strip()) < 2:
        return text

    # Google Translate has a ~5000 char limit per call — split if needed
    if len(text) > 4500:
        # Split on sentence boundaries
        parts = []
        current = ""
        for sentence in text.replace('. ', '.\n').split('\n'):
            if len(current) + len(sentence) > 4000 and current:
                parts.append(current)
                current = sentence
            else:
                current = current + ('\n' if current else '') + sentence
        if current:
            parts.append(current)

        translated_parts = []
        for part in parts:
            t = safe_translate(part)  # recursive call for each part
            if t:
                translated_parts.append(t)
            else:
                return None
        return ' '.join(translated_parts)

    for attempt in range(MAX_GT_RETRIES):
        try:
            result = translator.translate(text)
            time.sleep(TRANSLATE_DELAY)
            return result
        except Exception as e:
            err_str = str(e)
            if attempt < MAX_GT_RETRIES - 1:
                # Exponential backoff: 10s, 20s, 40s, 80s
                wait = GT_BACKOFF_BASE * (2 ** attempt)
                if '429' in err_str or 'Too Many Requests' in err_str:
                    wait = max(wait, 60)  # at least 60s for rate limit
                    print(f"    Rate limited, waiting {wait}s...")
                else:
                    print(f"    Retry in {wait}s: {err_str[:80]}")
                time.sleep(wait)
                # Recreate translator instance in case connection is stale
                translator = GoogleTranslator(source='ru', target='kk')
            else:
                print(f"    FAILED after {MAX_GT_RETRIES} attempts: {err_str[:80]}")
                return None
    return None


def translate_question(q):
    """Translate a single question to Kazakh."""
    update = {}

    # Question text
    q_kk = safe_translate(q['q'])
    if not q_kk or len(q_kk) < 3:
        return None
    update['q_kk'] = q_kk

    # Explanation
    e_kk = safe_translate(q['e'])
    if e_kk and len(e_kk) >= 5:
        update['e_kk'] = e_kk

    # Options (for single/multiple choice)
    if q.get('o') and len(q['o']) > 0:
        o_kk = []
        for opt in q['o']:
            t = safe_translate(opt)
            if t:
                o_kk.append(t)
            else:
                return None  # skip if any option fails
        if len(o_kk) == len(q['o']):
            update['o_kk'] = o_kk

    # Pairs (for matching questions)
    if q.get('pairs') and len(q['pairs']) > 0:
        pairs_kk = []
        for pair in q['pairs']:
            left = safe_translate(pair[0])
            right = safe_translate(pair[1])
            if left and right:
                pairs_kk.append([left, right])
            else:
                return None
        if len(pairs_kk) == len(q['pairs']):
            update['pairs_kk'] = pairs_kk

    # Passage (for reading comprehension)
    if q.get('passage_title'):
        pt = safe_translate(q['passage_title'])
        if pt:
            update['passage_title_kk'] = pt

    if q.get('passage_text'):
        # Split long passages into paragraphs to avoid GT length limits
        paragraphs = q['passage_text'].split('\n')
        translated_paragraphs = []
        for para in paragraphs:
            if para.strip():
                t = safe_translate(para)
                if t:
                    translated_paragraphs.append(t)
                else:
                    translated_paragraphs.append(para)  # keep original if fails
            else:
                translated_paragraphs.append('')
        update['passage_text_kk'] = '\n'.join(translated_paragraphs)

    return update


def update_supabase(question_id, update):
    """Update a single question in Supabase with Kazakh translation."""
    path = f"questions?id=eq.{question_id}"
    result, _ = supabase_request(path, method='PATCH', body=update)
    return result is not None or True  # PATCH returns empty on success


def process_subject(subject, limit=500, offset=0):
    """Translate all untranslated questions for a subject."""
    global _shutting_down

    print(f"\n{'='*60}")
    print(f"Subject: {subject}")
    print(f"{'='*60}")

    questions = fetch_untranslated(subject, limit=limit, offset=offset)
    if not questions:
        print(f"  No untranslated questions found.")
        return 0

    print(f"  Found {len(questions)} untranslated questions")

    success = 0
    failed = 0

    for i, q in enumerate(questions):
        if _shutting_down:
            print(f"\n  Stopped safely at question {i+1}. Re-run to continue.")
            break

        qtype = q.get('type', 'single')
        q_preview = q['q'][:60].replace('\n', ' ')
        print(f"  [{i+1}/{len(questions)}] ({qtype}) {q_preview}...", end=' ')

        update = translate_question(q)
        if update:
            update_supabase(q['id'], update)
            success += 1
            print("✓")
        else:
            failed += 1
            print("✗")

        # Progress report every 100
        if (i + 1) % 100 == 0:
            elapsed_note = f"{success/(i+1)*100:.0f}% success rate"
            print(f"\n  --- Progress: {success} translated, {failed} failed out of {i+1} ({elapsed_note}) ---\n")

    print(f"\n  Done: {success} translated, {failed} failed")
    return success


def main():
    parser = argparse.ArgumentParser(description='Bulk translate questions via Google Translate')
    parser.add_argument('--subject', type=str, help='Subject ID to translate')
    parser.add_argument('--all', action='store_true', help='Translate all subjects')
    parser.add_argument('--limit', type=int, default=500, help='Max questions per subject')
    parser.add_argument('--offset', type=int, default=0, help='Offset for pagination')
    args = parser.parse_args()

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars")
        sys.exit(1)

    if not args.subject and not args.all:
        print("Error: Specify --subject=<id> or --all")
        sys.exit(1)

    subjects = SUBJECTS if args.all else [args.subject]
    total = 0

    start = time.time()
    for subject in subjects:
        if _shutting_down:
            break
        total += process_subject(subject, limit=args.limit, offset=args.offset)
    elapsed = time.time() - start

    print(f"\n{'='*60}")
    print(f"TOTAL: {total} questions translated in {elapsed:.0f}s ({elapsed/60:.1f}m)")
    if _shutting_down:
        print(f"Interrupted — re-run to continue (already-translated questions are skipped)")
    print(f"{'='*60}")


if __name__ == '__main__':
    main()
