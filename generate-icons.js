const fs = require('fs');
const { createCanvas } = require('canvas');

// Icon sizes needed
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Function to generate a simple icon
function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#4a90e2';
  ctx.fillRect(0, 0, size, size);
  
  // Lightning bolt
  ctx.fillStyle = '#ffffff';
  const padding = size * 0.2;
  const boltWidth = size - (padding * 2);
  
  // Draw a simple lightning bolt
  ctx.beginPath();
  ctx.moveTo(size/2, padding);
  ctx.lineTo(padding, size/2);
  ctx.lineTo(size/2, size/2);
  ctx.lineTo(padding, size - padding);
  ctx.lineTo(size/2, size - padding);
  ctx.lineTo(size - padding, size/2);
  ctx.lineTo(size/2, size/2);
  ctx.closePath();
  ctx.fill();
  
  // Add a circle in the middle
  ctx.fillStyle = '#ffeb3b';
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/8, 0, Math.PI * 2);
  ctx.fill();
  
  return canvas.toBuffer('image/png');
}

// Create icons directory if it doesn't exist
if (!fs.existsSync('./icons')) {
  fs.mkdirSync('./icons');
}

// Generate icons for all sizes
sizes.forEach(size => {
  const iconBuffer = generateIcon(size);
  fs.writeFileSync(`./icons/icon-${size}x${size}.png`, iconBuffer);
  console.log(`Generated icon-${size}x${size}.png`);
});

console.log('All icons generated successfully!');
