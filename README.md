# Lee Wilkers website

Editable source for the public website. Requires Node 22 or later.

## Preview

```sh
npm ci
npm start
```

Open http://127.0.0.1:8138/. Saving a source file rebuilds the public artifact; reload the browser after the terminal reports that the preview is ready. The preview is bound to this computer only. Stop it with Control-C. Use `PORT=8140 npm start` if the port is occupied.

## Edit

| Change | File or folder |
| --- | --- |
| Home | `src/index.njk` |
| Consulting | `src/consulting.njk` |
| Selected work | `src/projects.njk` |
| Stacks entries | `src/content/items/*.md` |
| Stacks topic order | `src/_data/topics.json` |
| Stacks page layout | `src/shelf.njk` |
| Shared navigation and footer | `src/_includes/base.njk` |
| Appearance | `src/css/` |
| Images and videos | `src/img/` |
| Theme and Stacks interactions | `src/assets/js/` |

Each Stacks entry is Markdown frontmatter. Keep its filename stable because it is used in page anchors and RSS IDs. `added` is the date it entered the collection; retain it when editing an existing entry. Copy an existing entry to add another, then change its title, author, URL, topic, cover, description, and `added` date. Use `dest: shelf` and an existing topic. Both card and compact-list display are supported; `shelf_list: true` selects the latter.

Entry descriptions, notes, quotes, links, and cover metadata are public. Keep private notes and unfinished work outside this repository. The validator rejects Markdown bodies and unfamiliar metadata fields. It also rejects non-shelf entries, extra page templates, missing covers, and symlinks.

Images, GIFs, audio, and video can be referenced from the approved page templates. Use root-relative paths such as `/img/example.mp4`. Supported asset types include JPEG, PNG, WebP, AVIF, SVG, GIF, MP4, WebM, MP3, WAV, and OGG. Covers are generated from originals during the build. Browser playback support still depends on the media codec.

## Build and publish

```sh
npm run build:public
```

This validates the source, renders the site, runs the checks, and exports only approved pages and referenced assets to `_public/`. `npm run build` is an alias. `_site/` is an intermediate build folder. Never upload it. Both output folders and `node_modules/` are ignored by Git.

The approved pages are Home, Consulting, Selected work, Stacks, the Stream placeholder, and 404. Only the first four appear in the sitemap. Stream remains a visible noindex placeholder. Adding a page requires an explicit change to the source validator and public exporter.

Source is stored in the public [GitHub repository](https://github.com/leewilkers/website). Every tracked file and commit is visible, so keep private notes and drafts outside this repository. GitHub Pages uses GitHub Actions and the custom domain `leewilkers.com`; the workflow uploads only `_public/`.

To publish an approved change:

1. Run `npm run build:public`, review the local preview, then commit and push the source changes to `codex/clean-site-baseline`.
2. Open [Build and Deploy](https://github.com/leewilkers/website/actions/workflows/build.yml), choose **Run workflow**, and select `codex/clean-site-baseline`.
3. Wait for both the build and deploy jobs to succeed, then check [leewilkers.com](https://leewilkers.com/) and the changed pages or media.

The current `codex/clean-site-baseline` branch does not trigger automatic deployment. Changes to the live site require owner approval. Namecheap DNS already points to GitHub Pages; ordinary website edits require no DNS changes. The old repository is retained privately and is not the publishing source.

Run `npm test` for the publication-boundary checks. `npm start` serves the generated artifact, including real 404 responses and media byte-range requests.
