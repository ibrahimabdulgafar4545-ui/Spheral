const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirImages = path.join(__dirname, '..', 'uploads', 'images');
const uploadDirFiles = path.join(__dirname, '..', 'uploads', 'files');

if (!fs.existsSync(uploadDirImages)) {
  fs.mkdirSync(uploadDirImages, { recursive: true });
}
if (!fs.existsSync(uploadDirFiles)) {
  fs.mkdirSync(uploadDirFiles, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, uploadDirImages);
    } else {
      cb(null, uploadDirFiles);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/',
    'video/',
    'audio/',
    'application/octet-stream' // voice notes
  ];
  const isAllowed = allowedMimeTypes.some(mime => file.mimetype.startsWith(mime));
  if (isAllowed) {
    cb(null, true);
  } else {
    cb(new Error('Only image, video, and audio files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for images/audio
});

// Separate video upload with higher limit
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirFiles);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'video-' + uniqueSuffix + ext);
  },
});

const videoFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed for reel uploads!'), false);
  }
};

const uploadVideoMulter = multer({
  storage: videoStorage,
  fileFilter: videoFilter,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB limit for videos
});

module.exports = {
  uploadSingle: upload.single('image'),
  uploadMultiple: upload.array('images', 5),
  uploadMessageFile: upload.single('file'),
  uploadVideo: uploadVideoMulter.single('video'),
  uploadStoryCreative: upload.fields([{ name: 'image', maxCount: 1 }, { name: 'customAudio', maxCount: 1 }]),
  uploadReelCreative: multer({ storage: storage, fileFilter: (req, file, cb) => cb(null, true), limits: { fileSize: 200 * 1024 * 1024 } }).fields([{ name: 'video', maxCount: 1 }, { name: 'customAudio', maxCount: 1 }])
};
