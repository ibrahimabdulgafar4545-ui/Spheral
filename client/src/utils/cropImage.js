export async function getCroppedImg(imageSrc, offsetYPercent, cropAspect = 3) {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve, reject) => { 
    image.onload = resolve; 
    image.onerror = reject;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const containerAspect = cropAspect;
  const imgAspect = image.width / image.height;

  let drawWidth = image.width;
  let drawHeight = image.height;
  let sx = 0;
  let sy = 0;

  if (imgAspect > containerAspect) {
    // Image is wider than container aspect (e.g. panoramic)
    // We want the height to dictate, width will be cropped
    drawWidth = image.height * containerAspect;
    sx = (image.width - drawWidth) / 2; // Always center horizontally
  } else {
    // Image is taller than container aspect (e.g. portrait)
    // We want the width to dictate, height will be cropped based on offsetY
    drawHeight = image.width / containerAspect;
    sy = (image.height - drawHeight) * (offsetYPercent / 100); 
  }

  canvas.width = drawWidth;
  canvas.height = drawHeight;

  ctx.drawImage(
    image,
    sx, sy, drawWidth, drawHeight,
    0, 0, drawWidth, drawHeight
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(new File([blob], 'cover.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.9);
  });
}
