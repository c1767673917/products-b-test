// 图片路径映射工具
import { Product } from '../types/product';
import { FrontendImageUtils } from '../config/api';

// 图片类型映射
const IMAGE_TYPE_MAP = {
  '正面图片': 'front',
  '背面图片': 'back', 
  '标签照片': 'label',
  '外包装图片': 'package',
  '赠品图片': 'gift',
} as const;

// 根据序号前缀确定文件扩展名
function getImageExtension(sequence: string, imageType: string): string {
  if (sequence.startsWith('HM-')) {
    return 'jpg';
  } else if (sequence.startsWith('PDL-')) {
    // PDL的图片有混合格式，需要特殊处理
    if (imageType === '标签照片') {
      return sequence.includes('0002') || sequence.includes('0005') ? 'jpg' : 'png';
    } else if (imageType === '正面图片') {
      return sequence.includes('0002B') || sequence.includes('0003') || sequence.includes('0005B') ? 'jpg' : 'png';
    } else {
      return 'jpg';
    }
  } else if (sequence.startsWith('MC-')) {
    return 'png';
  } else if (sequence.startsWith('DRF-')) {
    return 'png';
  }
  
  return 'png'; // 默认扩展名
}

// 生成图片路径（现在直接使用MinIO路径）
export function generateImagePath(sequence: string, imageType: string): string {
  if (!sequence || !imageType) return '';

  // 直接使用MinIO路径，不再支持本地fallback
  return generateMinIOImagePath(sequence, imageType);
}

// 生成MinIO图片路径
export function generateMinIOImagePath(sequence: string, imageType: string): string {
  if (!sequence || !imageType) return '';
  
  const extension = getImageExtension(sequence, imageType);
  const filename = `${sequence}_${imageType}_0.${extension}`;
  
  return FrontendImageUtils.buildImageUrl(`products/${filename}`);
}

// 验证图片文件是否存在（在实际应用中可以通过API检查）
export function validateImagePath(imagePath: string): boolean {
  // 在开发环境中，我们假设所有路径都是有效的
  // 在生产环境中，这里可以实现实际的文件存在性检查
  return imagePath.length > 0;
}

// 获取图片的占位符路径
export function getPlaceholderImage(imageType: string): string {
  // 使用public目录下的占位符图片
  return '/placeholder-image.svg';
}

// 处理产品图片路径
export function processProductImages(product: Product): Product {
  const processedImages = { ...product.images };
  
  // 检查并修复图片路径
  Object.entries(processedImages).forEach(([type, path]) => {
    if (path) {
      // 检查是否需要修复路径
      if (FrontendImageUtils.needsPathFix(path)) {
        // 修复废弃路径
        if (path.startsWith('http')) {
          const objectName = FrontendImageUtils.extractObjectName(path);
          const fixedPath = FrontendImageUtils.fixImagePath(objectName);
          processedImages[type as keyof typeof processedImages] = FrontendImageUtils.buildImageUrl(fixedPath);
        } else {
          processedImages[type as keyof typeof processedImages] = FrontendImageUtils.buildImageUrl(FrontendImageUtils.fixImagePath(path));
        }
      } else if (!path.startsWith('http')) {
        // 如果不是完整URL，构建完整URL
        processedImages[type as keyof typeof processedImages] = FrontendImageUtils.buildImageUrl(path);
      }
    } else if (product.sequence) {
      // 如果没有图片路径，尝试根据序号生成MinIO路径
      const minioPath = generateMinIOImagePath(product.sequence, type);
      if (minioPath) {
        processedImages[type as keyof typeof processedImages] = minioPath;
      }
    }
    
    // 如果仍然没有有效路径，使用占位符
    if (!processedImages[type as keyof typeof processedImages] || !validateImagePath(processedImages[type as keyof typeof processedImages])) {
      processedImages[type as keyof typeof processedImages] = getPlaceholderImage(type);
    }
  });
  
  return {
    ...product,
    images: processedImages,
  };
}

// 批量处理产品图片
export function processProductsImages(products: Product[]): Product[] {
  return products.map(processProductImages);
}

// 预加载图片
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

// 批量预加载图片
export async function preloadImages(imagePaths: string[]): Promise<void> {
  const promises = imagePaths.map(path => preloadImage(path));
  await Promise.allSettled(promises);
}

// 获取产品的所有图片路径
export function getProductImagePaths(product: Product): string[] {
  const paths: string[] = [];
  
  Object.values(product.images).forEach(path => {
    if (path) {
      paths.push(path);
    }
  });
  
  return paths;
}

// 获取图片的缩略图路径
export function getThumbnailPath(imagePath: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
  if (!imagePath) return imagePath;
  
  // 如果是完整URL，使用工具类构建缩略图
  if (imagePath.startsWith('http')) {
    const objectName = FrontendImageUtils.extractObjectName(imagePath);
    return FrontendImageUtils.buildThumbnailUrl(objectName, size);
  }
  
  // 否则使用工具类构建缩略图
  return FrontendImageUtils.buildThumbnailUrl(imagePath, size);
}

// 获取优化后的图片路径
export function getOptimizedImagePath(
  imagePath: string, 
  options: { width?: number; height?: number; quality?: number; format?: string } = {}
): string {
  if (!imagePath) return imagePath;
  
  return FrontendImageUtils.buildOptimizedImageUrl(imagePath, options);
}

// 图片懒加载工具
export class ImageLazyLoader {
  private observer: IntersectionObserver | null = null;
  private loadedImages = new Set<string>();

  constructor() {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              const src = img.dataset.src;
              
              if (src && !this.loadedImages.has(src)) {
                img.src = src;
                this.loadedImages.add(src);
                this.observer?.unobserve(img);
              }
            }
          });
        },
        {
          rootMargin: '50px',
          threshold: 0.1,
        }
      );
    }
  }

  observe(img: HTMLImageElement) {
    if (this.observer) {
      this.observer.observe(img);
    }
  }

  unobserve(img: HTMLImageElement) {
    if (this.observer) {
      this.observer.unobserve(img);
    }
  }

  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// 创建全局懒加载实例
export const imageLazyLoader = new ImageLazyLoader();
