const multer = require('multer');
const sharp = require('sharp');

// Disable default body parsing so multer handles multipart/form-data safely
export const config = {
  api: {
    bodyParser: false,
  },
};

const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 4 * 1024 * 1024 } }).single('file');

// Helper to run express middleware inside Vercel serverless environment
const runMiddleware = (req, res, fn) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await runMiddleware(req, res, upload);

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const targetFormat = req.body.targetFormat || 'png';
    
    // Process file in-memory using Sharp
    const processedBuffer = await sharp(req.file.buffer)
      .toFormat(targetFormat)
      .toBuffer();

    // Convert output directly to base64 download string
    const base64Data = processedBuffer.toString('base64');
    const dataUrl = `data:image/${targetFormat};base64,${base64Data}`;

    return res.status(200).json({ success: true, dataUrl });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Processing error: ' + error.message });
  }
}
