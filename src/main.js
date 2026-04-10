const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
const sharp = require('sharp');

ffmpeg.setFfmpegPath(ffmpegPath);

function createWindow() {
  const win = new BrowserWindow({
    width: 760,
    height: 640,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('pick-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      {
        name: 'Media',
        extensions: ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov', 'mkv', 'avi']
      }
    ]
  });

  if (result.canceled || !result.filePaths.length) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('compress-media', async (_event, payload) => {
  const { inputPath, targetSizeMB } = payload;
  if (!inputPath || !targetSizeMB || targetSizeMB <= 0) {
    throw new Error('请先选择文件并填写正确的目标大小(MB)。');
  }

  const ext = path.extname(inputPath).toLowerCase();
  const imageExts = new Set(['.jpg', '.jpeg', '.png', '.webp']);
  const videoExts = new Set(['.mp4', '.mov', '.mkv', '.avi']);

  const outputDir = path.dirname(inputPath);
  const baseName = path.basename(inputPath, ext);

  if (imageExts.has(ext)) {
    const outputPath = path.join(outputDir, `${baseName}_compressed.jpg`);
    await compressImage(inputPath, outputPath, targetSizeMB);
    return outputPath;
  }

  if (videoExts.has(ext)) {
    const outputPath = path.join(outputDir, `${baseName}_compressed.mp4`);
    await compressVideo(inputPath, outputPath, targetSizeMB);
    return outputPath;
  }

  throw new Error('不支持的文件格式。');
});

async function compressImage(inputPath, outputPath, targetSizeMB) {
  const targetBytes = targetSizeMB * 1024 * 1024;
  const input = await fs.readFile(inputPath);
  const image = sharp(input).rotate();

  const metadata = await image.metadata();
  let width = metadata.width || 1920;
  let quality = 90;

  for (let i = 0; i < 10; i += 1) {
    const buffer = await image
      .resize({ width, withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();

    if (buffer.length <= targetBytes) {
      await fs.writeFile(outputPath, buffer);
      return;
    }

    if (quality > 45) {
      quality -= 10;
    } else {
      width = Math.max(480, Math.floor(width * 0.85));
    }
  }

  const fallback = await image
    .resize({ width: Math.max(480, Math.floor(width * 0.8)), withoutEnlargement: true })
    .jpeg({ quality: 40, mozjpeg: true })
    .toBuffer();
  await fs.writeFile(outputPath, fallback);
}

async function getVideoDuration(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, data) => {
      if (err) {
        reject(err);
        return;
      }

      const duration = data?.format?.duration;
      if (!duration || duration <= 0) {
        reject(new Error('无法读取视频时长。'));
        return;
      }

      resolve(duration);
    });
  });
}

async function compressVideo(inputPath, outputPath, targetSizeMB) {
  const duration = await getVideoDuration(inputPath);
  const targetBits = targetSizeMB * 1024 * 1024 * 8;
  const audioBitrate = 128_000;
  const safetyFactor = 0.95;

  const videoBitrate = Math.max(
    350_000,
    Math.floor((targetBits * safetyFactor) / duration - audioBitrate)
  );

  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        `-b:v ${videoBitrate}`,
        '-preset medium',
        '-movflags +faststart',
        '-pix_fmt yuv420p',
        '-b:a 128k'
      ])
      .on('end', resolve)
      .on('error', reject)
      .save(outputPath);
  });
}
