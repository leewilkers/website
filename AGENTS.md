# Website instructions

- This repository contains only the approved public website. Keep private notes, prompts, drafts, experiments, and administrative tools outside it.
- Preserve visible copy, layout, Stacks ordering, theme/cat interactions, and existing media unless Lee requests a change.
- The approved pages are Home, Consulting, Selected work, Stacks, Stream placeholder, and 404. Stream remains noindex and excluded from the sitemap. No new destination without explicit approval.
- Edit `src/`; do not edit generated output. Required content is documented in README.md.
- Run `npm run build:public` before release. Publish only `_public/`, never `_site/` or the source tree.
- New Stacks records need an explicit `added` date. Preserve existing dates and filenames.
- Keep local previews on loopback. `npm start` uses port 8138.
- Verify desktop/mobile layout and relevant controls after layout, CSS, or JavaScript changes. Check both themes, Stacks dialogs and Escape, media loading, and horizontal overflow.
- Do not add Git remotes, create a hosted repository, push, change hosting settings, or deploy without Lee's separate approval. Keep unrelated projects and archived sources intact.
