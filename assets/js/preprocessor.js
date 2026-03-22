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
      contrast = 1.3, // 1.0 - 1.5 is usually good
      brightness = 1.0,
      threshold = 128, // 0 - 255
      scale = 1.5     // 1.5x scale can help with small text
    } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // 1. Set dimensions (with scaling)
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        // 2. Initial Draw (with Scaling)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // 3. Filter Adjustments (Contrast & Brightness)
        // Note: CSS filters on canvas are fast
        ctx.filter = `grayscale(${grayscale ? 1 : 0}) contrast(${contrast}) brightness(${brightness})`;
        ctx.drawImage(canvas, 0, 0);
        ctx.filter = 'none';

        // 4. Thresholding (Binarization)
        // Only if needed, we'll do this pixel by pixel for better quality
        if (threshold > 0) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          for (let i = 0; i < data.length; i += 4) {
            // Calculate luminance
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            const avg = (0.299 * r + 0.587 * g + 0.114 * b);
            
            // Apply threshold
            const val = avg >= threshold ? 255 : 0;
            data[i] = data[i+1] = data[i+2] = val;
          }
          ctx.putImageData(imageData, 0, 0);
        }

        // Return processed image
        resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
      };
      img.onerror = reject;
      img.src = 'data:image/jpeg;base64,' + base64;
    });
  }
};
