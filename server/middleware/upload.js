const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Ensure upload directories exist for local fallback
const uploadDirImages = path.join(__dirname, '..', 'uploads', 'images');
const uploadDirFiles = path.join(__dirname, '..', 'uploads', 'files');

if (!fs.existsSync(uploadDirImages)) {
  fs.mkdirSync(uploadDirImages, { recursive: true });
}
if (!fs.existsSync(uploadDirFiles)) {
  fs.mkdirSync(uploadDirFiles, { recursive: true });
}

// --------------------------------------------------------------------------
// CLOUDINARY SETUP (For free live hosting)
// --------------------------------------------------------------------------
let useCloudinary = false;
if (process.env.CLOUDINARY_URL) {
  useCloudinary = true;
  // Cloudinary automatically configures itself if CLOUDINARY_URL is in .env
}

const cloudStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Cloudinary folder and resource type
    let folder = 'spheral/files';
    let resource_type = 'auto'; // supports video, audio, image
    if (file.mimetype.startsWith('image/')) {
      folder = 'spheral/images';
      resource_type = 'image';
    } else if (file.mimetype.startsWith('video/')) {
      folder = 'spheral/videos';
      resource_type = 'video';
    }
    return {
      folder: folder,
      resource_type: resource_type,
      // allowed_formats: ['jpeg', 'png', 'jpg', 'mp4', 'mov', 'webm', 'mp3'],
    };
  },
});

// --------------------------------------------------------------------------
// LOCAL STORAGE SETUP (Fallback)
// --------------------------------------------------------------------------
const localStorage = multer.diskStorage({
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
  storage: useCloudinary ? cloudStorage : localStorage,
  fileFilter: fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for images/audio
});

// Separate video upload with higher limit
const videoLocalStorage = multer.diskStorage({
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
  storage: useCloudinary ? cloudStorage : videoLocalStorage,
  fileFilter: videoFilter,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB limit for videos
});

module.exports = {
  uploadSingle: upload.single('image'),
  uploadMultiple: upload.array('images', 5),
  uploadMessageFile: upload.single('file'),
  uploadVideo: uploadVideoMulter.single('video'),
  uploadStoryCreative: upload.fields([{ name: 'image', maxCount: 1 }, { name: 'customAudio', maxCount: 1 }]),
  uploadReelCreative: multer({ storage: useCloudinary ? cloudStorage : videoLocalStorage, fileFilter: (req, file, cb) => cb(null, true), limits: { fileSize: 200 * 1024 * 1024 } }).fields([{ name: 'video', maxCount: 1 }, { name: 'customAudio', maxCount: 1 }])
};
