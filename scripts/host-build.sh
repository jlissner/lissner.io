#!/usr/bin/env bash
# Selective host prepare (tsc + Vite) and Docker image builds.
# Fingerprints live in .cache/host-build/; skip unchanged work.
# Force full rebuild: HOST_BUILD_FORCE=1 or --force (docker uses --no-cache).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CACHE_DIR="$ROOT/.cache/host-build"
COMPOSE_BUILD=(bash "$ROOT/scripts/docker-compose.sh" build)
ALL_SERVICES=(api graphql ui ollama)

FORCE=0
MODE="docker"
SERVICES=()

usage() {
  cat <<'EOF'
Usage: scripts/host-build.sh [prepare|docker] [--force] [service...]

  prepare   Run tsc -b; run Vite only when pics/shared/ui-utils sources changed
  docker    Build dirty Compose images only (default)

  --force   Rebuild everything (prepare: always Vite; docker: all services + --no-cache)
  service   Limit docker mode to these Compose services (api|graphql|ui|ollama)

Env: HOST_BUILD_FORCE=1 same as --force
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    prepare | docker)
      MODE="$1"
      shift
      ;;
    --force)
      FORCE=1
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    api | graphql | ui | ollama)
      SERVICES+=("$1")
      shift
      ;;
    *)
      echo "host-build: unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ "${HOST_BUILD_FORCE:-}" == "1" ]]; then
  FORCE=1
fi

mkdir -p "$CACHE_DIR"

# Stable content hash of listed paths (files and/or directory trees).
hash_paths() {
  local -a roots=("$@")
  local -a files=()
  local root
  for root in "${roots[@]}"; do
    if [[ -f "$root" ]]; then
      files+=("$root")
    elif [[ -d "$root" ]]; then
      while IFS= read -r -d '' f; do
        files+=("$f")
      done < <(
        find "$root" -type f \
          ! -path '*/node_modules/*' \
          ! -path '*/.git/*' \
          -print0 2>/dev/null || true
      )
    fi
  done
  if [[ ${#files[@]} -eq 0 ]]; then
    printf '%s\n' "empty"
    return
  fi
  local sorted
  sorted="$(printf '%s\n' "${files[@]}" | LC_ALL=C sort -u)"
  printf '%s\n' "$sorted" | xargs -d '\n' sha256sum | sha256sum | awk '{print $1}'
}

read_fp() {
  local key="$1"
  if [[ -f "$CACHE_DIR/$key.fp" ]]; then
    cat "$CACHE_DIR/$key.fp"
  fi
}

write_fp() {
  local key="$1"
  local value="$2"
  printf '%s\n' "$value" >"$CACHE_DIR/$key.fp"
}

is_dirty() {
  local key="$1"
  local current="$2"
  if [[ "$FORCE" -eq 1 ]]; then
    return 0
  fi
  local prev
  prev="$(read_fp "$key")"
  [[ -z "$prev" || "$prev" != "$current" ]]
}

WORKSPACE_MANIFESTS=(
  package.json
  package-lock.json
  packages/shared/package.json
  packages/server/package.json
  packages/graphql/package.json
  packages/pics/package.json
  packages/ui-utils/package.json
  packages/db/package.json
)

fingerprint_api() {
  hash_paths \
    packages/server/Dockerfile \
    "${WORKSPACE_MANIFESTS[@]}" \
    packages/shared/dist \
    packages/server/dist
}

fingerprint_graphql() {
  hash_paths \
    packages/graphql/Dockerfile \
    "${WORKSPACE_MANIFESTS[@]}" \
    packages/shared/dist \
    packages/graphql/dist
}

fingerprint_ui() {
  hash_paths \
    packages/pics/Dockerfile \
    packages/pics/dist \
    packages/pics/nginx
}

fingerprint_ollama() {
  hash_paths docker/ollama
}

# Sources that affect the Vite production bundle (not dist).
fingerprint_pics_build() {
  hash_paths \
    packages/pics/package.json \
    packages/pics/vite.config.ts \
    packages/pics/tsconfig.json \
    packages/pics/index.html \
    packages/pics/src \
    packages/pics/public \
    packages/shared/package.json \
    packages/shared/tsconfig.json \
    packages/shared/tsconfig.base.json \
    packages/shared/src \
    packages/ui-utils/package.json \
    packages/ui-utils/vite.config.ts \
    packages/ui-utils/tsconfig.json \
    packages/ui-utils/src
}

run_prepare() {
  echo "host-build: prepare — tsc -b"
  npx tsc -b

  local pics_hash
  pics_hash="$(fingerprint_pics_build)"
  if is_dirty pics-build "$pics_hash"; then
    echo "host-build: prepare — Vite (pics/shared/ui-utils sources changed or --force)"
    npm run build -w @lissner/ui-utils
    npm run build -w @lissner/pics
    write_fp pics-build "$pics_hash"
  else
    echo "host-build: prepare — skip Vite (unchanged)"
  fi
}

run_docker() {
  local -a targets=()
  if [[ ${#SERVICES[@]} -gt 0 ]]; then
    targets=("${SERVICES[@]}")
  else
    targets=("${ALL_SERVICES[@]}")
  fi

  local -a dirty=()
  local -a skipped=()
  local -A hashes=()
  local svc hash

  for svc in "${targets[@]}"; do
    case "$svc" in
      api) hash="$(fingerprint_api)" ;;
      graphql) hash="$(fingerprint_graphql)" ;;
      ui) hash="$(fingerprint_ui)" ;;
      ollama) hash="$(fingerprint_ollama)" ;;
      *)
        echo "host-build: unknown service: $svc" >&2
        exit 1
        ;;
    esac
    hashes["$svc"]="$hash"
    if is_dirty "$svc" "$hash"; then
      dirty+=("$svc")
    else
      skipped+=("$svc")
    fi
  done

  if [[ ${#skipped[@]} -gt 0 ]]; then
    echo "host-build: skip unchanged: ${skipped[*]}"
  fi

  if [[ ${#dirty[@]} -eq 0 ]]; then
    echo "host-build: nothing to build"
    return 0
  fi

  local -a build_args=()
  if [[ "$FORCE" -eq 1 ]]; then
    build_args+=(--no-cache)
    echo "host-build: force rebuild (--no-cache): ${dirty[*]}"
  else
    echo "host-build: building: ${dirty[*]}"
  fi

  "${COMPOSE_BUILD[@]}" "${build_args[@]}" "${dirty[@]}"

  for svc in "${dirty[@]}"; do
    write_fp "$svc" "${hashes[$svc]}"
  done
}

case "$MODE" in
  prepare) run_prepare ;;
  docker) run_docker ;;
esac
