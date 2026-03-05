#!/bin/bash
# Translate all exported batches to Kazakh via Claude API.
# Usage: ANTHROPIC_API_KEY=x bash scripts/translate-all.sh

set -e

API_KEY=${ANTHROPIC_API_KEY:?ANTHROPIC_API_KEY required}
SB_URL=https://mztujmeykhlgwqpdoilf.supabase.co
SB_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16dHVqbWV5a2hsZ3dxcGRvaWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNjI0ODAsImV4cCI6MjA4NjgzODQ4MH0.6_ui3S3wM3uOd-4VuNAQd4h3KFWoXUH2fHrwTNn28fw

# reading has long passages — use smaller batches
READING_BATCH=3
NORMAL_BATCH=10

for f in translations/*_batch_*.json; do
  # Skip already-translated files
  [[ "$f" == *_kk.json ]] && continue

  out="${f%.json}_kk.json"
  subj=$(basename "$f" | sed 's/_batch_.*//')

  # Determine batch size
  if [[ "$subj" == "reading" ]]; then
    bs=$READING_BATCH
  else
    bs=$NORMAL_BATCH
  fi

  echo ""
  echo "=========================================="
  echo "  $subj — $(basename $f)"
  echo "=========================================="

  ANTHROPIC_API_KEY=$API_KEY node scripts/translate-ai.mjs "$f" --batch-size=$bs --model=sonnet --resume

  # Import if translation file exists and has content
  if [[ -f "$out" ]]; then
    count=$(python3 -c "import json; print(len(json.load(open('$out'))))" 2>/dev/null || echo "0")
    if [[ "$count" -gt "0" ]]; then
      echo "Importing $count translations for $subj..."
      SUPABASE_URL=$SB_URL SUPABASE_SERVICE_KEY=$SB_KEY node scripts/translate-import.mjs "$out" --subject=$subj
    fi
  fi
done

echo ""
echo "=========================================="
echo "  FINAL PROGRESS"
echo "=========================================="
SUPABASE_URL=$SB_URL SUPABASE_SERVICE_KEY=$SB_KEY node scripts/translate-progress.mjs
