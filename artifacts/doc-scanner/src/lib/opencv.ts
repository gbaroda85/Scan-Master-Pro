import { Corner } from "./types";

export async function detectDocumentCorners(canvas: HTMLCanvasElement): Promise<Corner[]> {
  const cv = (window as any).cv;
  if (!cv) {
    throw new Error("OpenCV not loaded yet.");
  }
  const src = cv.imread(canvas);
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();

  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    cv.Canny(blurred, edges, 75, 200);
    
    // Dilate to connect edges
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
    cv.dilate(edges, edges, kernel);
    kernel.delete();
    
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    
    let bestContour = null;
    let maxArea = 0;
    
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);
      const peri = cv.arcLength(contour, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(contour, approx, 0.02 * peri, true);
      
      if (approx.rows === 4 && area > maxArea && area > (src.cols * src.rows * 0.1)) {
        maxArea = area;
        if (bestContour) bestContour.delete();
        bestContour = approx;
      } else {
        approx.delete();
      }
    }
    
    if (bestContour) {
      const corners = [];
      for (let i = 0; i < 4; i++) {
        corners.push({ x: bestContour.data32S[i * 2], y: bestContour.data32S[i * 2 + 1] });
      }
      bestContour.delete();
      return orderCorners(corners); // tl, tr, br, bl
    }
    
    // Fallback: full image corners
    return [
      { x: 10, y: 10 },
      { x: src.cols - 10, y: 10 },
      { x: src.cols - 10, y: src.rows - 10 },
      { x: 10, y: src.rows - 10 },
    ];
  } finally {
    src.delete(); gray.delete(); blurred.delete(); edges.delete();
    contours.delete(); hierarchy.delete();
  }
}

function orderCorners(corners: Corner[]): Corner[] {
  // Sort by y then x to get tl, tr, br, bl ordering
  const sorted = [...corners].sort((a, b) => a.y - b.y);
  const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottom = sorted.slice(2).sort((a, b) => a.x - b.x);
  return [top[0], top[1], bottom[1], bottom[0]]; // tl, tr, br, bl
}

export async function applyPerspectiveTransform(
  sourceCanvas: HTMLCanvasElement,
  corners: Corner[],  // tl, tr, br, bl in source image coords
  targetWidth = 794,  // A4 at 96dpi
  targetHeight = 1123
): Promise<string> {
  const cv = (window as any).cv;
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