/**
 * Image Handling Strategy implementation
 * - Client-side compression
 * - WebP format
 * - Max 1200x1200px (Main image)
 * - Max 200x200px (Thumbnail)
 */

export async function processImage(file: File): Promise<{ mainImageBlob: Blob, thumbnailBase64: string }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = async () => {
                try {
                    // Generate main compressed image as Blob
                    const mainImageBlob = await compressImageToBlob(img, 1200, 0.8);
                    // Generate thumbnail as Base64 DataURL
                    const thumbnailBase64 = compressImageToDataUrl(img, 200, 0.6);
                    resolve({ mainImageBlob, thumbnailBase64 });
                } catch (err) {
                    reject(err);
                }
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

function getCanvas(img: HTMLImageElement, maxSize: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    let width = img.width;
    let height = img.height;

    if (width > height) {
        if (width > maxSize) {
            height = Math.round((height *= maxSize / width));
            width = maxSize;
        }
    } else {
        if (height > maxSize) {
            width = Math.round((width *= maxSize / height));
            height = maxSize;
        }
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, width, height);
    
    return canvas;
}

function compressImageToDataUrl(img: HTMLImageElement, maxSize: number, quality: number): string {
    const canvas = getCanvas(img, maxSize);
    let dataUrl = canvas.toDataURL('image/webp', quality);
    if (!dataUrl || dataUrl === 'data:,') {
        dataUrl = canvas.toDataURL('image/jpeg', quality);
    }
    return dataUrl;
}

function compressImageToBlob(img: HTMLImageElement, maxSize: number, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const canvas = getCanvas(img, maxSize);
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob failed'));
        }, 'image/webp', quality);
    });
}
