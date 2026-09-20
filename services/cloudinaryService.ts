import { API_BASE_URL } from './apiConfig';

function dataURLtoBlob(dataurl: string): Blob {
  try {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (error) {
    console.error('Error converting data URL to Blob:', error);
    throw new Error('Invalid data URL format');
  }
}

export const cloudinaryService = {
  uploadImage: async (file: File | string | Blob, ...args: any[]): Promise<string> => {
    try {
      let folder = 'images';
      if (args.length > 0 && typeof args[args.length - 1] === 'string') {
        folder = args[args.length - 1];
      }

      // Convert data URL to Blob if necessary
      let fileBody: File | Blob;
      if (typeof file === 'string') {
        if (file.startsWith('data:')) {
          fileBody = dataURLtoBlob(file);
        } else {
          // If it's already a URL, just return it
          return file;
        }
      } else {
        fileBody = file;
      }

      const formData = new FormData();
      formData.append('file', fileBody, `upload_${Date.now()}.png`);
      formData.append('folder', folder);

      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Upload failed');
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error('Failed to upload image to Cloudinary');
    }
  },
  
  uploadFile: async (file: File | string | Blob, ...args: any[]): Promise<string> => {
    return cloudinaryService.uploadImage(file, ...args);
  }
};


