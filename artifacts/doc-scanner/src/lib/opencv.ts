import { Corner } from "./types";

/**
 * Runs a single edge-detection + contour pass at a given Canny threshold pair
 * over an already-prepared grayscale/blurred Mat, returning the best 4-point
 * quadrilateral candidate (by area) found, if any.
 */
function findQuadCandidate(
  cv: any,
  blurred: any,
  frameW: number,
  frameH: number,
  low: number,
  high: number
): { points: number[]; area: number } | null {
  const edges = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  let best: { points: number[]; area: number } | null = null;

  try {
    cv.Canny(blurred, edges, low, high);

    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
    cv.dilate(edges, edges, kernel);
    cv.erode(edges, edges, kernel);
    kernel.delete();

    cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    const frameArea = frameW * frameH;
    const minArea = frameArea * 0.15;
    const maxArea = frameArea * 0.98;

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);
      if (area < minArea || area > maxArea) {
        continue;
      }
      const peri = cv.arcLength(contour, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(contour, approx, 0.02 * peri, true);

      if (approx.rows === 4 && cv.isContourConvex(approx) && (!best || area > best.area)) {
        best = { points: Array.from(approx.data32S as Int32Array), area };
      }
      approx.delete();
    }

    return best;
  } finally {
    edges.delete();
    contours.delete();
    hierarchy.delete();
  }
}

export async function detectDocumentCorners(canvas: HTMLCanvasElement): Promise<Corner[]> {
  const cv = (window as any).cv;
  if (!cv) {
    throw new Error("OpenCV not loaded yet.");
  }
  const src = cv.imread(canvas);

  // Work on a downscaled copy for detection: normalizes edge-detection
  // thresholds across wildly different camera/upload resolutions and is
  // both faster and more reliable than running Canny on a huge source image.
  const DETECT_MAX_DIM = 900;
  const scale = Math.min(1, DETECT_MAX_DIM / Math.max(src.cols, src.rows));
  const work = new cv.Mat();
  if (scale < 1) {
    cv.resize(src, work, new cv.Size(Math.round(src.cols * scale), Math.round(src.rows * scale)), 0, 0, cv.INTER_AREA);
  } else {
    src.copyTo(work);
  }

  const gray = new cv.Mat();
  const blurred = new cv.Mat();

  try {
    cv.cvtColor(work, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

    // Try a few threshold pairs — a single fixed pair often fails on documents
    // with low contrast against their background (e.g. white paper on a light
    // table) or busy backgrounds; scanning a small set is cheap and much more
    // robust in practice.
    const thresholdPairs: [number, number][] = [
      [75, 200],
      [30, 120],
      [50, 150],
      [20, 80],
    ];

    let best: { points: number[]; area: number } | null = null;
    for (const [low, high] of thresholdPairs) {
      const candidate = findQuadCandidate(cv, blurred, work.cols, work.rows, low, high);
      if (candidate && (!best || candidate.area > best.area)) {
        best = candidate;
      }
    }

    if (best) {
      const corners: Corner[] = [];
      const invScale = 1 / scale;
      for (let i = 0; i < 4; i++) {
        corners.push({
          x: best.points[i * 2] * invScale,
          y: best.points[i * 2 + 1] * invScale,
        });
      }
      return orderCorners(corners); // tl, tr, br, bl
    }

    // Fallback: inset guess so the user still has draggable corners to adjust,
    // rather than a full-bleed box that's rarely correct.
    const marginX = src.cols * 0.06;
    const marginY = src.rows * 0.06;
    return [
      { x: marginX, y: marginY },
      { x: src.cols - marginX, y: marginY },
      { x: src.cols - marginX, y: src.rows - marginY },
      { x: marginX, y: src.rows - marginY },
    ];
  } finally {
    src.delete(); work.delete(); gray.delete(); blurred.delete();
  }
}

function orderCorners(corners: Corner[]): Corner[] {
  // Sort by y then x to get tl, tr, br, bl ordering
  const sorted = [...corners].sort((a, b) => a.y - b.y);
  const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottom = sorted.slice(2).sort((a, b) => a.x - b.x);
  return [top[0], top[1], bottom[1], bottom[0]]; // tl, tr, br, bl
}

function dist(a: Corner, b: Corner): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Derives an output size that preserves the *actual* aspect ratio and native
 * resolution of the detected document quadrilateral, instead of forcing every
 * scan into a fixed A4-portrait box. Forcing a fixed box squished/stretched
 * documents whose real shape wasn't A4 portrait (e.g. landscape sheets),
 * badly degrading legibility.
 */
function computeTargetSize(corners: Corner[]): { width: number; height: number } {
  const topW = dist(corners[0], corners[1]);
  const bottomW = dist(corners[3], corners[2]);
  const leftH = dist(corners[0], corners[3]);
  const rightH = dist(corners[1], corners[2]);

  let width = Math.round((topW + bottomW) / 2);
  let height = Math.round((leftH + rightH) / 2);

  const MIN_DIM = 700;
  const MAX_DIM = 2200;
  const longest = Math.max(width, height, 1);

  if (longest > MAX_DIM) {
    const s = MAX_DIM / longest;
    width = Math.round(width * s);
    height = Math.round(height * s);
  } else if (longest < MIN_DIM) {
    const s = MIN_DIM / longest;
    width = Math.round(width * s);
    height = Math.round(height * s);
  }

  return { width: Math.max(1, width), height: Math.max(1, height) };
}

export async function applyPerspectiveTransform(
  sourceCanvas: HTMLCanvasElement,
  corners: Corner[],  // tl, tr, br, bl in source image coords
  targetWidth?: number,
  targetHeight?: number
): Promise<string> {
  const cv = (window as any).cv;
  if (targetWidth === undefined || targetHeight === undefined) {
    const size = computeTargetSize(corners);
    targetWidth = targetWidth ?? size.width;
    targetHeight = targetHeight ?? size.height;
  }
  const src = cv.imread(sourceCanvas);
  const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
    corners[0].x, corners[0].y,
    corners[1].x, corners[1].y,
    corners[2].x, corners[2].y,
    corners[3].x, corners[3].y,
  ]);
  const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0,
    targetWidth, 0,
    targetWidth, targetHeight,
    0, targetHeight,
  ]);
  const M = cv.getPerspectiveTransform(srcPts, dstPts);
  const dst = new cv.Mat();
  const dsize = new cv.Size(targetWidth, targetHeight);
  cv.warpPerspective(src, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());
  
  const resultCanvas = document.createElement('canvas');
  resultCanvas.width = targetWidth;
  resultCanvas.height = targetHeight;
  cv.imshow(resultCanvas, dst);
  
  const dataUrl = resultCanvas.toDataURL('image/jpeg', 0.92);
  src.delete(); srcPts.delete(); dstPts.delete(); M.delete(); dst.delete();
  return dataUrl;
}