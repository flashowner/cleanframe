const state = { files: [] };
const fileInput = document.querySelector('#file-input');
const dropzone = document.querySelector('#dropzone');
const queueSection = document.querySelector('#queue-section');
const fileList = document.querySelector('#file-list');
const cleanButton = document.querySelector('#clean-button');
const clearButton = document.querySelector('#clear-button');
const qualityInput = document.querySelector('#quality');
const qualityValue = document.querySelector('#quality-value');
const toast = document.querySelector('#toast');

const MAX_FILES = 20;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

fileInput.addEventListener('change', (event) => addFiles(event.target.files));
['dragenter', 'dragover'].forEach((name) => dropzone.addEventListener(name, (event) => {
  event.preventDefault(); dropzone.classList.add('is-dragging');
}));
['dragleave', 'drop'].forEach((name) => dropzone.addEventListener(name, (event) => {
  event.preventDefault(); dropzone.classList.remove('is-dragging');
}));
dropzone.addEventListener('drop', (event) => addFiles(event.dataTransfer.files));
dropzone.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileInput.click(); } });
clearButton.addEventListener('click', () => { state.files.forEach((item) => URL.revokeObjectURL(item.previewUrl)); state.files = []; render(); });
qualityInput.addEventListener('input', () => { qualityValue.textContent = qualityInput.value; });
cleanButton.addEventListener('click', cleanAndDownload);

function addFiles(fileListLike) {
  const selected = [...fileListLike];
  const incoming = selected.filter((file) => IMAGE_TYPES.has(file.type));
  const available = MAX_FILES - state.files.length;
  const additions = incoming.slice(0, Math.max(0, available));
  if (incoming.length > additions.length) showToast(`最多处理 ${MAX_FILES} 张图片`);
  for (const file of additions) {
    if (state.files.some((item) => item.file.name === file.name && item.file.size === file.size)) continue;
    state.files.push({ file, previewUrl: URL.createObjectURL(file), status: '待处理' });
  }
  if (selected.some((file) => !IMAGE_TYPES.has(file.type))) showToast('已跳过不支持的文件格式');
  render();
}

function render() {
  queueSection.hidden = state.files.length === 0;
  cleanButton.disabled = state.files.length === 0;
  fileList.replaceChildren();
  state.files.forEach((item, index) => {
    const row = document.createElement('div'); row.className = 'file-row';
    const img = document.createElement('img'); img.className = 'thumb'; img.src = item.previewUrl; img.alt = '';
    const details = document.createElement('div');
    const name = document.createElement('div'); name.className = 'file-name'; name.title = item.file.name; name.textContent = item.file.name;
    const meta = document.createElement('div'); meta.className = 'file-meta'; meta.textContent = `${formatBytes(item.file.size)} · ${item.file.type.replace('image/', '').toUpperCase()}`;
    details.append(name, meta);
    const status = document.createElement('span'); status.className = 'file-status'; status.textContent = item.status;
    const remove = document.createElement('button'); remove.className = 'remove-file'; remove.type = 'button'; remove.setAttribute('aria-label', `移除 ${item.file.name}`); remove.textContent = '×'; remove.addEventListener('click', () => removeFile(index));
    row.append(img, details, status, remove); fileList.append(row);
  });
}

function removeFile(index) { URL.revokeObjectURL(state.files[index].previewUrl); state.files.splice(index, 1); render(); }
function formatBytes(bytes) { if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`; return `${(bytes / 1024 / 1024).toFixed(1)} MB`; }

async function cleanAndDownload() {
  if (!state.files.length) return;
  cleanButton.disabled = true; cleanButton.querySelector('span').textContent = '处理中…';
  let success = 0;
  for (const item of state.files) {
    item.status = '处理中…'; render();
    try {
      const blob = await reencodeWithoutMetadata(item.file, Number(qualityInput.value) / 100);
      downloadBlob(blob, cleanName(item.file.name, blob.type)); item.status = '已导出'; success++;
    } catch (error) { item.status = '失败'; console.error(error); }
    render();
  }
  cleanButton.disabled = false; cleanButton.querySelector('span').textContent = '清理并下载';
  showToast(`已生成 ${success} 个干净副本`);
}

function cleanName(name, mime) {
  const base = name.replace(/\.[^.]+$/, '');
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  return `${base}_clean.${ext}`;
}

function reencodeWithoutMetadata(file, quality) {
  return new Promise((resolve, reject) => {
    const image = new Image(); const url = URL.createObjectURL(file);
    image.onload = () => {
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { alpha: true }); context.drawImage(image, 0, 0);
      URL.revokeObjectURL(url);
      let type = file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
      canvas.toBlob((blob) => {
        if (blob) return resolve(blob);
        type = 'image/png';
        canvas.toBlob((fallback) => fallback ? resolve(fallback) : reject(new Error('浏览器无法导出此图片')), type);
      }, type, type === 'image/png' ? undefined : quality);
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('图片读取失败')); };
    image.src = url;
  });
}

function downloadBlob(blob, filename) {
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = filename; document.body.append(link); link.click();
  setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 1000);
}

let toastTimer;
function showToast(message) { toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2800); }
