/**
 * Image Preprocessing for OCR (Receipts)
 */
const Preprocessor = {
  /**
   * Preprocess an image base64 string
   * @param {string} base64 - Source image in base64
   * @param {Object} options - Preprocessing options
   * @returns {Promise<string>} - Preprocessed image in base64
   */
  async process(base64, options = {}) {
    const {
      grayscale = true,
      contrast = 1.4, 
      brightness = 1.0,
      threshold = 128, 
      scale = 1.0,
      quality = 0.75,
      maxWidth = 1200 // Max width to prevent oversized payload (502 Gateway issues)
    } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Calculate aspect ratio and final dimensions
        let targetWidth = img.width * scale;
        let targetHeight = img.height * scale;

        if (targetWidth > maxWidth) {
          const ratio = maxWidth / targetWidth;
          targetWidth = maxWidth;
          targetHeight = targetHeight * ratio;
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Draw and process
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        ctx.filter = `grayscale(${grayscale ? 1 : 0}) contrast(${contrast}) brightness(${brightness})`;
        ctx.drawImage(canvas, 0, 0);
        ctx.filter = 'none';

        if (threshold > 0) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            const avg = (0.299 * r + 0.587 * g + 0.114 * b);
            const val = avg >= threshold ? 255 : 0;
            data[i] = data[i+1] = data[i+2] = val;
          }
          ctx.putImageData(imageData, 0, 0);
        }

        resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1]);
      };
      img.onerror = reject;
      img.src = 'data:image/jpeg;base64,' + base64;
    });
  }
};
