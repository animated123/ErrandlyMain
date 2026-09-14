/**
 * Image Optimization Utilities for ErrandRunner
 * Automatically applies modern WebP/AVIF formats (f_auto) and intelligent compression (q_auto)
 * to Cloudinary URLs, dramatically reducing bandwidth and render lag.
 */

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: 'auto' | 'auto:good' | 'auto:eco' | 'auto:best';
  crop?: 'fill' | 'limit' | 'fit' | 'thumb' | 'pad';
  format?: 'auto';
}

/**
 * Optimizes an image URL if hosted on Cloudinary with smart compression & formatting.
 */
export function optimizeImageUrl(
  url?: string | null,
  options: ImageOptimizationOptions = {}
): string {
  if (!url || typeof url !== 'string') return '';

  // Data URLs, blobs, or SVG do not need Cloudinary transformations
  if (url.startsWith('data:') || url.startsWith('blob:') || url.endsWith('.svg')) {
    return url;
  }

  // Cloudinary URL detection
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    const [baseUrl, pathAfterUpload] = url.split('/upload/');
    if (!pathAfterUpload) return url;

    // Check if transformations are already present
    const segments = pathAfterUpload.split('/');
    const firstSegment = segments[0];

    // If first segment already contains f_auto or q_auto, don't double transform
    if (firstSegment.includes('f_auto') || firstSegment.includes('q_auto')) {
      return url;
    }

    const {
      width,
      height,
      quality = 'auto',
      crop = width && height ? 'fill' : 'limit',
      format = 'auto'
    } = options;

    const transforms: string[] = [`f_${format}`, `q_${quality}`];
    if (width) transforms.push(`w_${width}`);
    if (height) transforms.push(`h_${height}`);
    if (width || height) transforms.push(`c_${crop}`);

    const transformString = transforms.join(',');
    return `${baseUrl}/upload/${transformString}/${pathAfterUpload}`;
  }

  return url;
}

/**
 * Quick preset for small avatar and icon images (e.g. 80-120px)
 */
export function getOptimizedAvatar(url?: string | null, size = 120): string {
  return optimizeImageUrl(url, { width: size, height: size, crop: 'thumb', quality: 'auto' });
}

/**
 * Quick preset for errand cards, service listings, or property photos
 */
export function getOptimizedCardImage(url?: string | null, width = 640): string {
  return optimizeImageUrl(url, { width, quality: 'auto', crop: 'limit' });
}

/**
 * Quick preset for full-screen hero or modal proof viewer
 */
export function getOptimizedHeroImage(url?: string | null, width = 1200): string {
  return optimizeImageUrl(url, { width, quality: 'auto', crop: 'limit' });
}
