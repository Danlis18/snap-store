#!/bin/sh
set -eu
case "${DATA_DIR:-/data}" in
  /|/app|/root|/home|.) echo 'DATA_DIR must be a dedicated data directory' >&2; exit 1 ;;
esac
if [ "$(id -u)" = "0" ]; then
  mkdir -p "${DATA_DIR:-/data}"
  chown -R node:node "${DATA_DIR:-/data}"
  exec gosu node "$@"
fi
exec "$@"
