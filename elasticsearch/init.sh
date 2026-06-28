#!/usr/bin/env sh
# Apply index template and create Kibana Data View.
# Run once after the ELK stack is up:  make elk-init

set -e

ES="${ELASTICSEARCH_URL:-http://localhost:9200}"
KIBANA="${KIBANA_URL:-http://localhost:5601}"

MAX_RETRIES=40

echo "Waiting for Elasticsearch..."
retries=0
until curl -sf "$ES/_cluster/health" | grep -qE '"status":"(green|yellow)"'; do
  sleep 3
  retries=$((retries + 1))
  if [ "$retries" -ge "$MAX_RETRIES" ]; then
    echo "ERROR: Elasticsearch did not become ready after $((MAX_RETRIES * 3))s" >&2
    exit 1
  fi
done

echo "Applying index template..."
curl -sf -X PUT "$ES/_index_template/github-notifier-logs" \
  -H "Content-Type: application/json" \
  -d @"$(dirname "$0")/index-template.json"
echo ""

echo "Waiting for Kibana..."
retries=0
until curl -sf "$KIBANA/api/status" | grep -q available; do
  sleep 5
  retries=$((retries + 1))
  if [ "$retries" -ge "$MAX_RETRIES" ]; then
    echo "ERROR: Kibana did not become ready after $((MAX_RETRIES * 5))s" >&2
    exit 1
  fi
done

echo "Creating Kibana Data View..."
if curl -sf "$KIBANA/api/data_views" | grep -q "github-notifier-logs"; then
  echo "Data View already exists, skipping."
else
  curl -sf -X POST "$KIBANA/api/data_views/data_view" \
    -H "Content-Type: application/json" \
    -H "kbn-xsrf: true" \
    -d '{
      "data_view": {
        "title": "github-notifier-logs-*",
        "name": "GitHub Notifier Logs",
        "timeFieldName": "@timestamp"
      }
    }'
  echo ""
fi

echo "Done. Open Kibana at $KIBANA"
