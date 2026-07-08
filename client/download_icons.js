const fs = require('fs');
const path = require('path');
const https = require('https');

const PUBLIC_DIR = path.join(__dirname, 'public');

const icons = [
  { name: 'favicon.png', url: 'https://placehold.co/32x32/1877F2/FFF/png?text=S' },
  { name: 'apple-touch-icon.png', url: 'https://placehold.co/180x180/1877F2/FFF/png?text=S' },
  { name: 'pwa-192.png', url: 'https://placehold.co/192x192/1877F2/FFF/png?text=S' },
  { name: 'pwa-512.png', url: 'https://placehold.co/512x512/1877F2/FFF/png?text=S' },
  { name: 'maskable-icon.png', url: 'https://placehold.co/512x512/1877F2/FFF/png?text=S' }
];

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

console.log('Downloading Spheral PWA icons...');

let completed = 0;
icons.forEach(icon => {
  const filePath = path.join(PUBLIC_DIR, icon.name);
  const file = fs.createWriteStream(filePath);
  
  // Custom User-Agent header to avoid blockages
  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
  };

  https.get(icon.url, options, response => {
    if (response.statusCode !== 200) {
      console.error(`Failed to download ${icon.name}: HTTP Status ${response.statusCode}`);
      return;
    }
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`✓ Saved ${icon.name} to ${filePath}`);
      completed++;
      if (completed === icons.length) {
        console.log('🎉 All PWA icons created successfully!');
      }
    });
  }).on('error', err => {
    fs.unlink(filePath, () => {});
    console.error(`Error downloading ${icon.name}:`, err.message);
  });
});
