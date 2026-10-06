#!/usr/bin/env bash
# Install the same verified Zola release locally and in GitHub Actions.
set -euo pipefail
repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
zola_version="$(tr -d '[:space:]' < "$repo_root/.zola-version")"
install_dir="${ZOLA_INSTALL_DIR:-/usr/local/bin}"
if [[ -x "$install_dir/zola" ]] && [[ "$("$install_dir/zola" --version)" == "zola $zola_version" ]]; then
  "$install_dir/zola" --version
  exit 0
fi
for dependency in curl tar sha256sum install uname mktemp; do
  command -v "$dependency" >/dev/null || { echo "Missing $dependency. On Ubuntu, install ca-certificates curl tar coreutils." >&2; exit 1; }
done
[[ "$(uname -s)" == Linux ]] || { echo "This installer supports Linux. See README.md for other platforms." >&2; exit 1; }
case "$(uname -m)" in
  x86_64) target=x86_64-unknown-linux-gnu ;;
  aarch64|arm64) target=aarch64-unknown-linux-gnu ;;
  *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac
archive="zola-v${zola_version}-${target}.tar.gz"
work_dir="$(mktemp -d)"
trap 'rm -rf -- "$work_dir"' EXIT
curl --fail --location --retry 3 --silent --show-error \
  "https://github.com/getzola/zola/releases/download/v${zola_version}/${archive}" \
  --output "$work_dir/$archive"
expected="$(awk -v name="$archive" '$2 == name { print $1 }' "$repo_root/scripts/zola-checksums.txt")"
[[ -n "$expected" ]] || { echo "No pinned checksum for $archive" >&2; exit 1; }
printf '%s  %s\n' "$expected" "$work_dir/$archive" | sha256sum --check --status
tar -xzf "$work_dir/$archive" -C "$work_dir" zola
mkdir -p "$install_dir"
install -m 0755 "$work_dir/zola" "$install_dir/zola"
"$install_dir/zola" --version
