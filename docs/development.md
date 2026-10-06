Building and serving the site requires only the prebuilt Zola binary.

## Run locally

```bash
ZOLA_INSTALL_DIR="$HOME/.local/bin" bash scripts/install-zola.sh
export PATH="$HOME/.local/bin:$PATH"
zola serve
```

## Write posts

Posts live in `content/posts/`. A new post can look like this:

```markdown
---
title: My new post
date: 2026-10-06
authors: [Dillon McMahon]
taxonomies:
  tags: [rust]
extra:
  share: true
---

The opening paragraph appears in the home page and archive listings.

<!-- more -->

The rest of the post goes here.
```

Use a dated filename such as `2026-10-06-my-new-post.md`; Zola removes the date and derives the `/posts/my-new-post/` URL from the filename. Only set `slug` or `path` when deliberately overriding that URL. The ArrayVec post retains a `path` override to preserve its published uppercase URL.

Link between posts with paths such as `@/posts/2025-06-11-patterns-for-modeling-overlapping-variant-data-in-rust.md`, optionally followed by `#heading-id`. Zola validates these links. Tags have archive links such as `/tags/rust/`. The `/tags/` overview lists each tag and its post count, linking to those archives.

## Publish

`.github/workflows/pages.yml` builds and checks pull requests and publishes pushes to `master` through GitHub Pages. No generated files need to be committed.

Set **Settings → Pages → Build and deployment → Source → GitHub Actions** in the repository settings.