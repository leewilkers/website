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

The prepared GitHub Actions workflow uploads `_public/`. Hosting setup, the private repository, and the custom domain must be configured separately before publication. Source is stored in the private [GitHub repository](https://github.com/leewilkers/website). The current `codex/clean-site-baseline` branch does not trigger automatic deployment. Changes to the live site require owner approval.

Run `npm test` for the publication-boundary checks. `npm start` serves the generated artifact, including real 404 responses and media byte-range requests.
