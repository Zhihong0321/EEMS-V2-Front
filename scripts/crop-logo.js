const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function cropLogo() {
  const inputPath = path.join(__dirname, '../public/eternalgy-logo-02.png');
  const tempPath = path.join(__dirname, '../public/eternalgy-logo-02-temp.png');
  
  try {
    // Get image metadata to calculate crop dimensions
    const metadata = await sharp(inputPath).metadata();
    const { width, height } = metadata;
    
    // Crop 10px from all sides
    const cropWidth = width - 20; // 10px left + 10px right
    const cropHeight = height - 20; // 10px top + 10px bottom
    
    console.log(`Original dimensions: ${width}x${height}`);
    console.log(`Cropped dimensions: ${cropWidth}x${cropHeight}`);
    
    // Crop to temporary file first
    await sharp(inputPath)
      .extract({
        left: 10,
        top: 10,
        width: cropWidth,
        height: cropHeight
      })
      .toFile(tempPath);
    
    // Replace original with cropped version
    fs.unlinkSync(inputPath);
    fs.renameSync(tempPath, inputPath);
    
    console.log('Logo cropped successfully!');
  } catch (error) {
    console.error('Error cropping logo:', error);
    process.exit(1);
  }
}

cropLogo();

