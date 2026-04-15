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
    container.innerHTML = '<p style="color:#a8a29e;font-size:13px;">Missing data-studio attribute.</p>';
    return;
  }

  var cols = container.getAttribute("data-columns") || "auto";
  var theme = container.getAttribute("data-theme") || "light";
  var isDark = theme === "dark";
  var bg = isDark ? "#1c1917" : "#fff";
  var border = isDark ? "#44403c" : "#e7e5e4";
  var textPrimary = isDark ? "#fafaf9" : "#1c1917";
  var textSecondary = isDark ? "#a8a29e" : "#78716c";
  var tileBg = isDark ? "#292524" : "#fff";
  var imgBg = isDark ? "#292524" : "#f5f5f4";

  var gridCols =
    cols === "2"
      ? "repeat(2, 1fr)"
      : cols === "3"
        ? "repeat(3, 1fr)"
        : cols === "4"
          ? "repeat(4, 1fr)"
          : "repeat(auto-fill, minmax(180px, 1fr))";

  container.innerHTML = '<p style="text-align:center;color:' + textSecondary + ';font-size:13px;">Loading...</p>';

  fetch(ORIGIN + "/api/embed/" + studioId + "/wearables")
    .then(function (r) {
      if (!r.ok) throw new Error("not found");
      return r.json();
    })
    .then(function (data) {
      if (!data.products || data.products.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:' + textSecondary + ';font-size:13px;">No products available.</p>';
        return;
      }

      var html = '<div style="display:grid;grid-template-columns:' + gridCols + ";gap:16px;font-family:system-ui,-apple-system,sans-serif;background:" + bg + '">';

      data.products.forEach(function (p) {
        html += '<a href="' + p.url + '" target="_blank" rel="noopener" style="';
        html += "display:block;text-decoration:none;color:inherit;border-radius:12px;overflow:hidden;";
        html += "border:1px solid " + border + ";background:" + tileBg + ";transition:box-shadow .2s;";
        html += '">';
        html += '<div style="position:relative;width:100%;padding-bottom:100%;background:' + imgBg + '">';
        if (p.image) {
          html += '<img src="' + p.image + '" alt="' + p.name.replace(/"/g, "&quot;") + '" loading="lazy" style="';
          html += 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover">';
        } else {
          html += '<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;color:' + textSecondary + '">No image</span>';
        }
        html += "</div>";
        html += '<div style="padding:10px 12px">';
        html += '<p style="margin:0;font-size:14px;font-weight:600;color:' + textPrimary + ";overflow:hidden;text-overflow:ellipsis;white-space:nowrap\">" + p.name + "</p>";
        if (p.subtitle) {
          html += '<p style="margin:2px 0 0;font-size:12px;color:' + textSecondary + ";overflow:hidden;text-overflow:ellipsis;white-space:nowrap\">" + p.subtitle + "</p>";
        }
        html += '<p style="margin:6px 0 0;font-size:14px;font-weight:700;color:' + textPrimary + '">' + p.priceFormatted + "</p>";
        html += "</div></a>";
      });

      html += "</div>";
      html += '<p style="margin-top:16px;text-align:center;font-size:11px;color:' + textSecondary + '">Powered by <a href="' + ORIGIN + '" target="_blank" rel="noopener" style="color:' + textSecondary + ';text-decoration:underline">PotteryMania</a></p>';
      container.innerHTML = html;
    })
    .catch(function () {
      container.innerHTML = '<p style="text-align:center;color:' + textSecondary + ';font-size:13px;">Could not load wearables.</p>';
    });
})();
