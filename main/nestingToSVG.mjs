import SvgParser from "./svgparser.js";

// Copied from `main/index.html`
export function nestingToSVG(
  deepNest,
  placementResult,
  title = "Nesting result",
  dxf = false
) {
  var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const titleEl = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "title"
  );
  titleEl.innerHTML = title;
  svg.appendChild(titleEl);
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.innerHTML = `
  path {
    fill: antiquewhite;
    stroke: black;
  }
  path:nth-child(1) {
    fill: black;
  }
  `;
  svg.appendChild(style);

  var svgwidth = 0;
  var svgheight = 0;

  // create elements if they don't exist, show them otherwise
  placementResult.placements.forEach(function (s) {
    var group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svg.appendChild(group);

    var sheetbounds = deepNest.parts[s.sheet].bounds;

    group.setAttribute(
      "transform",
      "translate(" + -sheetbounds.x + " " + (svgheight - sheetbounds.y) + ")"
    );
    if (svgwidth < sheetbounds.width) {
      svgwidth = sheetbounds.width;
    }

    s.sheetplacements.forEach(function (p) {
      var part = deepNest.parts[p.source];
      var partgroup = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "g"
      );

      !part && console.error("TODO: unknown bug", part, p);
      part?.svgelements.forEach(function (e, index) {
        var node = e.cloneNode(false);
        SvgParser.polyfillSVGElement(node);

        if (placementResult.tagName == "image") {
          var relpath = placementResult.getAttribute("data-href");
          if (relpath) {
            placementResult.setAttribute("href", relpath);
          }
          placementResult.removeAttribute("data-href");
        }
        partgroup.appendChild(node);
      });

      group.appendChild(partgroup);

      // position part
      partgroup.setAttribute(
        "transform",
        "translate(" + p.x + " " + p.y + ") rotate(" + p.rotation + ")"
      );
      partgroup.setAttribute("id", p.id);
    });

    // put next sheet below
    svgheight += 1.1 * sheetbounds.height;
  });

  const { units, scale, mergeLines, dxfExportScale, curveTolerance } =
    deepNest.config();
  const ratio =
    (units === "mm" ? 1 / 25.4 : 1) /
    // inkscape on server side
    (dxf ? dxfExportScale : 1);

  svg.setAttribute(
    "width",
    `${svgwidth / (scale * ratio)}${units == "inch" ? "in" : "mm"}`
  );
  svg.setAttribute(
    "height",
    `${svgheight / (scale * ratio)}${units == "inch" ? "in" : "mm"}`
  );
  svg.setAttribute("viewBox", `0 0 ${svgwidth} ${svgheight}`);

  if (mergeLines && placementResult.mergedLength > 0) {
    SvgParser.applyTransform(svg);
    SvgParser.flatten(svg);
    SvgParser.splitLines(svg);
    SvgParser.mergeOverlap(svg, 0.1 * curveTolerance);
    SvgParser.mergeLines(svg);
  }

  return new XMLSerializer().serializeToString(svg);
}
