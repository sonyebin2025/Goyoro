import React, { useState, useEffect } from 'react';

interface TransparentImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

// Global cache to avoid double-processing the same image
const processedCache = new Map<string, string>();

export const TransparentImage: React.FC<TransparentImageProps> = ({ src, alt, className, ...props }) => {
  const [processedSrc, setProcessedSrc] = useState<string>(processedCache.get(src) || src);
  const [loading, setLoading] = useState<boolean>(!processedCache.has(src));

  useEffect(() => {
    // If it's a remote URL, bypass canvas rendering to avoid cross-origin (CORS) security issues.
    // This makes sure images are 100% visible and load instantly.
    if (src.startsWith('http://') || src.startsWith('https://')) {
      setProcessedSrc(src);
      setLoading(false);
      return;
    }

    if (processedCache.get(src)) {
      setProcessedSrc(processedCache.get(src)!);
      setLoading(false);
      return;
    }

    setLoading(true);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Set to reasonable sizing to ensure speed and sharpness
      const w = img.width || 512;
      const h = img.height || 512;
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setProcessedSrc(src);
        setLoading(false);
        return;
      }

      ctx.drawImage(img, 0, 0, w, h);
      
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      
      // BFS queue for flood fill
      const visited = new Uint8Array(w * h);
      const queue: number[] = [];

      // Add all boundary pixels of the frame to seed the background flood fill
      for (let x = 0; x < w; x++) {
        // top edge
        const idxTop = 0 * w + x;
        queue.push(idxTop);
        visited[idxTop] = 1;

        // bottom edge
        const idxBot = (h - 1) * w + x;
        queue.push(idxBot);
        visited[idxBot] = 1;
      }
      for (let y = 0; y < h; y++) {
        // left edge
        const idxLeft = y * w + 0;
        if (!visited[idxLeft]) {
          queue.push(idxLeft);
          visited[idxLeft] = 1;
        }

        // right edge
        const idxRight = y * w + (w - 1);
        if (!visited[idxRight]) {
          queue.push(idxRight);
          visited[idxRight] = 1;
        }
      }

      // Helper to detect background pixels (pure or near-white)
      const isWhiteLike = (r: number, g: number, b: number) => {
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max === 0 ? 0 : (max - min) / max;
        // Match high lightness and low color saturation (grayscale/white/light studio shadows)
        return max > 215 && saturation < 0.12;
      };

      let head = 0;
      while (head < queue.length) {
        const curIdx = queue[head++];
        const x = curIdx % w;
        const y = Math.floor(curIdx / w);

        const dIdx = curIdx * 4;
        const r = data[dIdx];
        const g = data[dIdx + 1];
        const b = data[dIdx + 2];
        const a = data[dIdx + 3];

        if (a > 0 && isWhiteLike(r, g, b)) {
          // Erase the white background pixel
          data[dIdx + 3] = 0;

          // Connect to 4-way neighbors
          const neighbors = [
            [x + 1, y],
            [x - 1, y],
            [x, y + 1],
            [x, y - 1]
          ];

          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              const nIdx = ny * w + nx;
              if (visited[nIdx] === 0) {
                visited[nIdx] = 1;
                queue.push(nIdx);
              }
            }
          }
        }
      }

      // Apply Edge Softening / Feathering to remove jagged white fringes
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = y * w + x;
          const dIdx = idx * 4;
          
          if (data[dIdx + 3] > 0) {
            // Check if there is an adjacent transparent pixel (which means this pixel is on the outline edge)
            const leftAlpha = data[(idx - 1) * 4 + 3];
            const rightAlpha = data[(idx + 1) * 4 + 3];
            const topAlpha = data[(idx - w) * 4 + 3];
            const bottomAlpha = data[(idx + w) * 4 + 3];
            const topLeftAlpha = data[(idx - w - 1) * 4 + 3];
            const topRightAlpha = data[(idx - w + 1) * 4 + 3];
            const bottomLeftAlpha = data[(idx + w - 1) * 4 + 3];
            const bottomRightAlpha = data[(idx + w + 1) * 4 + 3];

            if (leftAlpha === 0 || rightAlpha === 0 || topAlpha === 0 || bottomAlpha === 0 ||
                topLeftAlpha === 0 || topRightAlpha === 0 || bottomLeftAlpha === 0 || bottomRightAlpha === 0) {
              const r = data[dIdx];
              const g = data[dIdx + 1];
              const b = data[dIdx + 2];

              // Slightly translucent transition for natural feathering
              if (r > 190 && g > 190 && b > 190) {
                data[dIdx + 3] = Math.min(data[dIdx + 3], 40); // Stronger fade for lighter fringes
              } else {
                data[dIdx + 3] = Math.min(data[dIdx + 3], 150); // Gentle fade for darker content edges
              }
            }
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
      try {
        const dataUrl = canvas.toDataURL('image/png');
        processedCache.set(src, dataUrl);
        setProcessedSrc(dataUrl);
      } catch (err) {
        console.error("TransparentImage parsing error: ", err);
        setProcessedSrc(src);
      }
      setLoading(false);
    };

    img.onerror = () => {
      setProcessedSrc(src);
      setLoading(false);
    };
  }, [src]);

  return (
    <img
      src={processedSrc}
      alt={alt}
      className={`${className} transition-all duration-300 ${loading ? 'opacity-30 blur-xsScale' : 'opacity-100'}`}
      {...props}
      referrerPolicy="no-referrer"
    />
  );
};
