const pickBtn = document.getElementById('pickBtn');
const compressBtn = document.getElementById('compressBtn');
const filePathInput = document.getElementById('filePath');
const targetSizeInput = document.getElementById('targetSize');
const statusEl = document.getElementById('status');

pickBtn.addEventListener('click', async () => {
  const filePath = await window.api.pickFile();
  if (filePath) {
    filePathInput.value = filePath;
    statusEl.textContent = '文件已选择。';
  }
});

compressBtn.addEventListener('click', async () => {
  const inputPath = filePathInput.value.trim();
  const targetSizeMB = Number(targetSizeInput.value);

  try {
    statusEl.textContent = '正在压缩，请稍候...';
    const outputPath = await window.api.compressMedia({ inputPath, targetSizeMB });
    statusEl.textContent = `压缩完成：${outputPath}`;
  } catch (error) {
    statusEl.textContent = `压缩失败：${error.message}`;
  }
});
