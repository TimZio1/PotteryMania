/**
 * PotteryMania Wearables Embed Widget
 *
 * Usage:
 *   <div id="potterymania-wearables" data-studio="STUDIO_ID"></div>
 *   <script src="https://potterymania.com/embed/wearables.js" defer></script>
 *
 * Options (data attributes on the container):
 *   data-studio   (required) — Studio ID
 *   data-columns  (optional) — Grid columns: 2, 3, 4 (default: auto)
 *   data-theme    (optional) — "light" (default) or "dark"
 */
(function () {
  "use strict";

  var ORIGIN = (function () {
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || "";
      if (src.indexOf("/embed/wearables.js") !== -1) {
        return src.replace(/\/embed\/wearables\.js.*$/, "");
      }
    }
    return "https://potterymania.com";
  })();

  var container = document.getElementById("potterymania-wearables");
  if (!container) return;

  var studioId = container.getAttribute("data-studio");
  if (!studioId) {
    container.innerHTML = '<p class="pm-wear-loading">Missing data-studio attribute.</p>';
    return;
  }

  var cols = container.getAttribute("data-columns") || "auto";
  var theme = container.getAttribute("data-theme") || "light";

  // Inject stylesheet
  if (!document.getElementById("pm-wear-css")) {
    var link = document.createElement("link");
    link.id = "pm-wear-css";
    link.rel = "stylesheet";
    link.href = ORIGIN + "/embed/wearables.css";
    document.head.appendChild(link);
  }

  if (theme === "dark") container.classList.add("pm-wear-dark");

  var gridStyle = "";
  if (cols === "2") gridStyle = "grid-template-columns:repeat(2,1fr)";
  else if (cols === "3") gridStyle = "grid-template-columns:repeat(3,1fr)";
  else if (cols === "4") gridStyle = "grid-template-columns:repeat(4,1fr)";

  container.innerHTML = '<p class="pm-wear-loading">Loading...</p>';

  fetch(ORIGIN + "/api/embed/" + studioId + "/wearables")
    .then(function (r) {
      if (!r.ok) throw new Error("not found");
      return r.json();
    })
    .then(function (data) {
      if (!data.products || data.products.length === 0) {
        container.innerHTML = '<p class="pm-wear-loading">No products available.</p>';
        return;
      }

      var html = '<div class="pm-wear-grid"' + (gridStyle ? ' style="' + gridStyle + '"' : "") + ">";

      data.products.forEach(function (p) {
        html += '<a href="' + p.url + '" target="_blank" rel="noopener" class="pm-wear-tile">';
        html += '<div class="pm-wear-img-wrap">';
        if (p.image) {
          html += '<img src="' + p.image + '" alt="' + p.name.replace(/"/g, "&quot;") + '" loading="lazy" class="pm-wear-img">';
        } else {
          html += '<span class="pm-wear-noimg">No image</span>';
        }
        html += "</div>";
        html += '<div class="pm-wear-info">';
        html += '<p class="pm-wear-name">' + p.name + "</p>";
        if (p.subtitle) {
          html += '<p class="pm-wear-subtitle">' + p.subtitle + "</p>";
        }
        html += '<p class="pm-wear-price">' + p.priceFormatted + "</p>";
        html += "</div></a>";
      });

      html += "</div>";
      html += '<p class="pm-wear-footer">Prices and availability are set by the studio.</p>';
      container.innerHTML = html;
    })
    .catch(function () {
      container.innerHTML = '<p class="pm-wear-loading">Could not load wearables.</p>';
    });
})();
