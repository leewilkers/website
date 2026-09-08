// Shelf cover → modal overlay.
// Click any cover → opens <dialog id="shelf-modal"> populated from the
// adjacent <script type="application/json" class="cell-card-data"> island.
// Uses createElement/textContent throughout (project blocks .innerHTML).

(function () {
  "use strict";

  var dialog = document.getElementById("shelf-modal");
  var grid = document.querySelector(".grid-scroll");
  if (!dialog || !grid) return;

  var els = {
    topic: dialog.querySelector("[data-modal-topic]"),
    title: dialog.querySelector("[data-modal-title]"),
    author: dialog.querySelector("[data-modal-author]"),
    year: dialog.querySelector("[data-modal-year]"),
    metaSep: dialog.querySelector("[data-modal-meta-sep]"),
    type: dialog.querySelector("[data-modal-type]"),
    coverWrap: dialog.querySelector("[data-modal-cover-wrap]"),
    cover: dialog.querySelector("[data-modal-cover]"),
    dek: dialog.querySelector("[data-modal-dek]"),
    bodyWrap: dialog.querySelector("[data-modal-body-wrap]"),
    body: dialog.querySelector("[data-modal-body]"),
    bodySource: dialog.querySelector("[data-modal-body-source]"),
    bodySourceLink: dialog.querySelector("[data-modal-body-source-link]"),
    quoteWrap: dialog.querySelector("[data-modal-quote-wrap]"),
    quote: dialog.querySelector("[data-modal-quote]"),
    noteWrap: dialog.querySelector("[data-modal-note-wrap]"),
    note: dialog.querySelector("[data-modal-note]"),
    linksWrap: dialog.querySelector("[data-modal-links-wrap]"),
    links: dialog.querySelector("[data-modal-links]")
  };

  function setText(node, value) {
    if (!node) return;
    while (node.firstChild) node.removeChild(node.firstChild);
    if (value) node.appendChild(document.createTextNode(value));
  }

  function show(wrapNode, hasContent) {
    if (!wrapNode) return;
    if (hasContent) wrapNode.removeAttribute("hidden");
    else wrapNode.setAttribute("hidden", "");
  }

  function extractYear(data) {
    var candidates = [data.year, data.date, data.published, data.dek];
    for (var i = 0; i < candidates.length; i++) {
      var v = candidates[i];
      if (!v) continue;
      var m = String(v).match(/\b(1[5-9]\d{2}|20\d{2})\b/);
      if (m) return m[1];
    }
    return "";
  }

  function labelForUrl(url, override) {
    if (override) return override;
    try {
      var host = new URL(url).host.replace(/^www\./, "");
      return host || url;
    } catch (e) {
      return url;
    }
  }

  function renderLinks(data) {
    var ul = els.links;
    while (ul.firstChild) ul.removeChild(ul.firstChild);
    var items = [];
    if (data.url) items.push({ url: data.url, label: data.source_label || "" });
    if (Array.isArray(data.links)) {
      for (var i = 0; i < data.links.length; i++) {
        var link = data.links[i];
        if (link && link.url) items.push({ url: link.url, label: link.label || "" });
      }
    }
    if (!items.length) return false;
    for (var j = 0; j < items.length; j++) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = items[j].url;
      a.target = "_blank";
      a.rel = "noopener";
      a.appendChild(document.createTextNode(labelForUrl(items[j].url, items[j].label) + " ↗"));
      li.appendChild(a);
      ul.appendChild(li);
    }
    return true;
  }

  function populate(data) {
    setText(els.topic, data.topic || "");
    setText(els.title, data.title || "");
    setText(els.author, data.author || "");
    var year = extractYear(data);
    setText(els.year, year);
    show(els.metaSep, data.author && year);
    setText(els.type, data.type || "");

    if (data.image) {
      els.cover.onerror = function () { show(els.coverWrap, false); };
      els.cover.src = data.image;
      els.cover.alt = data.title ? "Cover of " + data.title : "";
      show(els.coverWrap, true);
    } else {
      els.cover.removeAttribute("src");
      show(els.coverWrap, false);
    }

    setText(els.dek, data.dek || "");
    show(els.dek, data.dek);

    var bodyText = data.description || data.blurb || "";
    setText(els.body, bodyText);
    show(els.bodyWrap, !!bodyText);

    // "via Goodreads" attribution under a description sourced from a public DB.
    // Only render when the body text came from data.description (not data.blurb)
    // AND we have a source label. Link if URL provided, plain text otherwise.
    var hasSource = !!(bodyText && data.description && data.description_source);
    if (hasSource && els.bodySource) {
      var link = els.bodySourceLink;
      setText(link, data.description_source);
      if (data.description_source_url) {
        link.setAttribute("href", data.description_source_url);
        link.removeAttribute("data-no-href");
      } else {
        link.removeAttribute("href");
        link.setAttribute("data-no-href", "");
      }
      show(els.bodySource, true);
    } else if (els.bodySource) {
      show(els.bodySource, false);
    }

    setText(els.quote, data.quote || "");
    show(els.quoteWrap, !!data.quote);

    setText(els.note, data.note || "");
    show(els.noteWrap, !!data.note);

    show(els.linksWrap, renderLinks(data));
  }

  function openFor(card, opts) {
    var script = card.querySelector("script.cell-card-data");
    if (!script) return;
    var data;
    try {
      data = JSON.parse(script.textContent);
    } catch (e) {
      return;
    }
    populate(data);
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
    // Sync URL hash for shareable / deep-linkable state.
    // Skip when opened FROM a hash (avoids double history entry).
    if (!opts || !opts.fromHash) {
      var slug = card.getAttribute("data-shelf-slug");
      if (slug) {
        history.replaceState(null, "", "#" + slug);
      }
    }
  }

  // Deep-link: read location.hash, find matching card, open modal.
  // Slug match is exact against [data-shelf-slug="..."]. Hashes that don't
  // match a card are ignored (so topic-section anchors like #humor still
  // work — they don't match a card and fall through to default browser jump).
  function openFromHash() {
    var hash = location.hash;
    if (!hash || hash.length < 2) return;
    var slug = hash.slice(1);
    // Defensive: only allow slug-safe chars to reach the selector
    if (!/^[a-z0-9_-]+$/i.test(slug)) return;
    var card = document.querySelector('[data-shelf-slug="' + slug + '"]');
    if (!card) return;
    openFor(card, { fromHash: true });
  }

  // Sync hash on dialog close
  dialog.addEventListener("close", function () {
    if (location.hash) {
      history.replaceState(null, "", location.pathname + location.search);
    }
  });

  // Back/forward button support
  window.addEventListener("hashchange", function () {
    if (!location.hash || location.hash.length < 2) {
      if (dialog.open) dialog.close();
      return;
    }
    openFromHash();
  });

  // On initial page load — open if we arrived with a hash
  // (defer to next tick so the dialog and document are fully ready)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", openFromHash);
  } else {
    openFromHash();
  }

  grid.addEventListener("click", function (e) {
    // Two triggers: cover button (card view) + title button (list view).
    var btn = e.target.closest(".cell-cover-primary, button.shelf-list-title");
    if (!btn) return;
    // Card view: data island lives in .shelf-card; list view: in .shelf-list-row.
    var card = btn.closest(".shelf-card, .shelf-list-row");
    if (!card) return;
    e.preventDefault();
    openFor(card);
  });

  // Click on backdrop (outside .shelf-modal__body) closes the dialog.
  dialog.addEventListener("click", function (e) {
    if (e.target === dialog) dialog.close();
  });

  // Focus trap. Native <dialog>.showModal() lets Tab escape to document.body
  // once focus reaches the last tabbable element. Loop back manually so
  // keyboard users stay inside the dialog per WAI-ARIA modal pattern.
  function tabbables() {
    var sel = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return [].filter.call(dialog.querySelectorAll(sel), function (el) {
      return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
    });
  }

  dialog.addEventListener("keydown", function (e) {
    if (e.key !== "Tab" || !dialog.open) return;
    var list = tabbables();
    if (!list.length) {
      e.preventDefault();
      return;
    }
    var first = list[0];
    var last = list[list.length - 1];
    var active = document.activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  });
})();
