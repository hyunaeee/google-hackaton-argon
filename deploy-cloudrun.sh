#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-fanverse}"
REGION="${REGION:-asia-northeast3}"
PROJECT_ID="${PROJECT_ID:-h2gdm-hack26icn-2636}"

if [ -z "${GEMINI_API_KEY:-}" ] && [ -f .env ]; then
  GEMINI_API_KEY="$(grep -E '^GEMINI_API_KEY=' .env | head -n 1 | cut -d '=' -f2- | tr -d '"' | tr -d "'")"
fi

if [ -z "${GEMINI_MODEL:-}" ] && [ -f .env ]; then
  ENV_MODEL="$(grep -E '^GEMINI_MODEL=' .env | head -n 1 | cut -d '=' -f2- | tr -d '"' | tr -d "'")"
  GEMINI_MODEL="${ENV_MODEL:-gemini-4-argon}"
fi
MODEL="${GEMINI_MODEL:-gemini-4-argon}"

if [ -z "${GEMINI_API_KEY:-}" ]; then
  echo "Error: GEMINI_API_KEY is not set. Please set it in .env or export GEMINI_API_KEY=..."
  exit 1
fi

echo "Deploying FANVERSE to Google Cloud Run (project: ${PROJECT_ID}, service: ${SERVICE_NAME}, region: ${REGION})..."
gcloud run deploy "${SERVICE_NAME}" \
  --source=. \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --allow-unauthenticated \
  --port=8080 \
  --memory=1Gi \
  --quiet \
  --set-env-vars="GEMINI_API_KEY=${GEMINI_API_KEY},GEMINI_MODEL=${MODEL}"

echo "Verifying live Cloud Run URL..."
gcloud run services describe "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --format="value(status.url)"
