import ClipperLib from "./util/clipper.js";
import geometry from "./util/geometryutil.js";

const { GeometryUtil } = geometry;

function toClipperCoordinates(polygon) {
  var clone = [];
  for (var i = 0; i < polygon.length; i++) {
    clone.push({
      X: polygon[i].x,
      Y: polygon[i].y,
    });
  }

  return clone;
}

function toNestCoordinates(polygon, scale) {
  var clone = [];
  for (var i = 0; i < polygon.length; i++) {
    clone.push({
      x: polygon[i].X / scale,
      y: polygon[i].Y / scale,
    });
  }

  return clone;
}

function rotatePolygon(polygon, degrees) {
  var rotated = [];
  var angle = (degrees * Math.PI) / 180;
  for (var i = 0; i < polygon.length; i++) {
    var x = polygon[i].x;
    var y = polygon[i].y;
    var x1 = x * Math.cos(angle) - y * Math.sin(angle);
    var y1 = x * Math.sin(angle) + y * Math.cos(angle);

    rotated.push({ x: x1, y: y1 });
  }

  return rotated;
}

export function processPair(pair) {
  var A = rotatePolygon(pair.A, pair.Arotation);
  var B = rotatePolygon(pair.B, pair.Brotation);

  var clipper = new ClipperLib.Clipper();

  var Ac = toClipperCoordinates(A);
  ClipperLib.JS.ScaleUpPath(Ac, 10000000);
  var Bc = toClipperCoordinates(B);
  ClipperLib.JS.ScaleUpPath(Bc, 10000000);
  for (var i = 0; i < Bc.length; i++) {
    Bc[i].X *= -1;
    Bc[i].Y *= -1;
  }
  var solution = ClipperLib.Clipper.MinkowskiSum(Ac, Bc, true);
  var clipperNfp;

  var largestArea = null;
  for (i = 0; i < solution.length; i++) {
    var n = toNestCoordinates(solution[i], 10000000);
    var sarea = -GeometryUtil.polygonArea(n);
    if (largestArea === null || largestArea < sarea) {
      clipperNfp = n;
      largestArea = sarea;
    }
  }

  for (var i = 0; i < clipperNfp.length; i++) {
    clipperNfp[i].x += B[0].x;
    clipperNfp[i].y += B[0].y;
  }

  pair.A = null;
  pair.B = null;
  pair.nfp = clipperNfp;
  return pair;
}
