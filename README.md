# mcmah309 Blog

A Zola static site hosted at <https://mcmah309.github.io>. Building and serving the site requires only the prebuilt Zola binary.

## Run locally

Use **Zola 0.23.6**, pinned in `.zola-version`. On Linux x86-64 or ARM64:

```bash
ZOLA_INSTALL_DIR="$HOME/.local/bin" bash scripts/install-zola.sh
export PATH="$HOME/.local/bin:$PATH"
zola serve
```

Open <http://127.0.0.1:1111>. Zola watches content and templates and reloads the browser. Add `$HOME/.local/bin` to your shell's PATH to make the binary available in future sessions.

The Linux installer needs Bash, CA certificates, curl, tar, and the standard coreutils/awk tools. On Ubuntu 24.04, install curl and certificates with `sudo apt-get install ca-certificates curl`. It downloads the official binary and verifies the pinned SHA-256 checksum. To install system-wide, run `sudo bash scripts/install-zola.sh`.

On macOS or Windows, download the matching **0.23.6** binary from [Zola's releases](https://github.com/getzola/zola/releases/tag/v0.23.6) and put it on PATH. The templates use Tera 2, so older Zola versions are not compatible.

Build and validate:

```bash
zola build
zola check --skip-external-links
```

The generated site goes into `public/`, which is ignored by Git.

## Write posts

Posts live in `content/posts/`. A new post can look like this:

```markdown
---
title: My new post
date: 2026-10-06
authors: [Dillon McMahon]
taxonomies:
  categories: [technical]
  tags: [rust]
extra:
  share: true
---

The opening paragraph appears in the home page and archive listings.

<!-- more -->

The rest of the post goes here.
```

Use a dated filename such as `2026-10-06-my-new-post.md`; the date is removed from the generated `/posts/my-new-post/` URL. Explicit `slug` or `path` front matter controls the URL.

Link between posts with paths such as `@/posts/2025-06-11-patterns-for-modeling-overlapping-variant-data-in-rust.md`, optionally followed by `#heading-id`. Zola validates these links. Categories and tags have archive links such as `/categories/#technical` and `/tags/#rust`.

## Publish

`.github/workflows/pages.yml` builds and checks pull requests and publishes pushes to `master` through GitHub Pages. No generated files need to be committed.

Set **Settings → Pages → Build and deployment → Source → GitHub Actions** in the repository settings.

## Appearance

The So Simple **3.2.0** styling and theme JavaScript live under `static/assets/`. The upstream copyright and MIT permission notice are included in the stylesheet. Templates in `templates/` provide the layout, responsive navigation, excerpts, archives, share buttons, pagination, and full-content Lunr search.

Code blocks use the theme's line-number layout. `syntax/code-highlights.json` supplies the exact coloring for unchanged code snippets; new or edited snippets use Zola's native highlighter and the palette defined in `syntax/so-simple.json`.
