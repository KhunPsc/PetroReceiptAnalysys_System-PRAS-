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
      scale = 1.0,     // Reduced from 1.5 to 1.0 to prevent 502/Timeout
      quality = 0.75   // Added quality control
    } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

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

        // Reduced quality to 0.75 to make the payload smaller
        resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1]);
      };
      img.onerror = reject;
      img.src = 'data:image/jpeg;base64,' + base64;
    });
  }
};
