const state = { files: [], processing: false };
const fileInput = document.querySelector('#file-input');
const dropzone = document.querySelector('#dropzone');
const queueSection = document.querySelector('#queue-section');
const fileList = document.querySelector('#file-list');
const cleanButton = document.querySelector('#clean-button');
const clearButton = document.querySelector('#clear-button');
const qualityInput = document.querySelector('#quality');
const qualityValue = document.querySelector('#quality-value');
const toast = document.querySelector('#toast');
const languageButtons = [...document.querySelectorAll('[data-language]')];

const MAX_FILES = 20;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const translations = {
  zh: {
    documentTitle: 'CleanFrame · 图片属性清理器',
    description: '在本地清理图片中的 EXIF、XMP、IPTC、C2PA 等嵌入元数据，生成干净副本。',
    brandAria: 'CleanFrame 首页', languageLabel: '选择语言', privacy: '本地处理 · 不上传',
    headlineLine1: '让图片回到', headlineLine2: '干净的文件状态。',
    introCopy: '清理图片属性中常见的 EXIF、XMP、IPTC 和生成工具写入的文本元数据，导出一个全新的副本。',
    workspaceLabel: '图片清理工作区', dropTitle: '拖拽图片到这里', dropSubtitle: '或点击选择 · 支持 JPG、PNG、WebP、GIF', dropNote: '最多同时处理 20 张图片',
    stepRead: '浏览器本地读取', stepClean: '重新编码去元数据', stepDownload: '下载干净副本', queueTitle: '待处理图片', clearList: '清空列表', jpegQuality: 'JPEG 质量',
    cleanDownload: '清理并下载', processingButton: '处理中…',
    notice: '<strong>这会清理什么？</strong> EXIF、XMP、IPTC、C2PA 内容凭证（包括 PNG 的 <code>caBX</code> 分块）以及 WebP 元数据。不会改变画面内容，也不会移除画面中已经存在的可见水印。',
    footerPrivacy: '文件始终留在你的设备上', pending: '待处理', processing: '处理中…', exported: '已导出', failed: '失败',
    maxFiles: `最多处理 ${MAX_FILES} 张图片`, unsupported: '已跳过不支持的文件格式', readFailed: '图片读取失败', exportFailed: '浏览器无法导出此图片',
    generated: (count) => `已生成 ${count} 个干净副本`, removeFile: (name) => `移除 ${name}`,
  },
  en: {
    documentTitle: 'CleanFrame · Image Metadata Cleaner',
    description: 'Clean embedded EXIF, XMP, IPTC, and C2PA metadata locally to create a fresh image copy.',
    brandAria: 'CleanFrame home', languageLabel: 'Choose language', privacy: 'Local processing · No upload',
    headlineLine1: 'Bring images back to', headlineLine2: 'a clean file state.',
    introCopy: 'Remove common EXIF, XMP, IPTC, and generator-written metadata from image properties, then export a fresh copy.',
    workspaceLabel: 'Image cleaning workspace', dropTitle: 'Drop images here', dropSubtitle: 'or click to browse · JPG, PNG, WebP, GIF', dropNote: 'Process up to 20 images at once',
    stepRead: 'Read locally in browser', stepClean: 'Re-encode without metadata', stepDownload: 'Download clean copies', queueTitle: 'Processing queue', clearList: 'Clear list', jpegQuality: 'JPEG quality',
    cleanDownload: 'Clean & download', processingButton: 'Processing…',
    notice: '<strong>What gets cleaned?</strong> EXIF, XMP, IPTC, C2PA Content Credentials (including the PNG <code>caBX</code> chunk), and WebP metadata. Pixels stay the same; visible watermarks are not removed.',
    footerPrivacy: 'Your files stay on your device', pending: 'Pending', processing: 'Processing…', exported: 'Exported', failed: 'Failed',
    maxFiles: `You can process up to ${MAX_FILES} images`, unsupported: 'Unsupported file types were skipped', readFailed: 'Could not read the image', exportFailed: 'Your browser could not export this image',
    generated: (count) => `Generated ${count} clean ${count === 1 ? 'copy' : 'copies'}`, removeFile: (name) => `Remove ${name}`,
  },
};

let language = getInitialLanguage();

fileInput.addEventListener('change', (event) => addFiles(event.target.files));
languageButtons.forEach((button) => button.addEventListener('click', () => setLanguage(button.dataset.language)));
['dragenter', 'dragover'].forEach((name) => dropzone.addEventListener(name, (event) => { event.preventDefault(); dropzone.classList.add('is-dragging'); }));
['dragleave', 'drop'].forEach((name) => dropzone.addEventListener(name, (event) => { event.preventDefault(); dropzone.classList.remove('is-dragging'); }));
dropzone.addEventListener('drop', (event) => addFiles(event.dataTransfer.files));
dropzone.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileInput.click(); } });
clearButton.addEventListener('click', () => { state.files.forEach((item) => URL.revokeObjectURL(item.previewUrl)); state.files = []; render(); });
qualityInput.addEventListener('input', () => { qualityValue.textContent = qualityInput.value; });
cleanButton.addEventListener('click', cleanAndDownload);

function getInitialLanguage() {
  try { const saved = localStorage.getItem('cleanframe-language'); if (saved === 'zh' || saved === 'en') return saved; } catch (error) { /* Ignore unavailable storage. */ }
  return navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

function t(key, ...args) { const value = translations[language][key]; return typeof value === 'function' ? value(...args) : value; }

function setLanguage(nextLanguage) {
  if (!translations[nextLanguage]) return;
  language = nextLanguage;
  try { localStorage.setItem('cleanframe-language', language); } catch (error) { /* Ignore unavailable storage. */ }
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  document.title = t('documentTitle');
  document.querySelector('meta[name="description"]').content = t('description');
  document.querySelectorAll('[data-i18n]').forEach((element) => { element.textContent = t(element.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach((element) => { element.innerHTML = t(element.dataset.i18nHtml); });
  document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => { element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel)); });
  languageButtons.forEach((button) => { const active = button.dataset.language === language; button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', String(active)); });
  const cleanLabel = cleanButton.querySelector('[data-i18n="cleanDownload"]');
  cleanLabel.textContent = state.processing ? t('processingButton') : t('cleanDownload');
  render();
}

function addFiles(fileListLike) {
  const selected = [...fileListLike];
  const incoming = selected.filter((file) => IMAGE_TYPES.has(file.type));
  const available = MAX_FILES - state.files.length;
  const additions = incoming.slice(0, Math.max(0, available));
  if (incoming.length > additions.length) showToast(t('maxFiles'));
  for (const file of additions) {
    if (state.files.some((item) => item.file.name === file.name && item.file.size === file.size)) continue;
    state.files.push({ file, previewUrl: URL.createObjectURL(file), status: 'pending' });
  }
  if (selected.some((file) => !IMAGE_TYPES.has(file.type))) showToast(t('unsupported'));
  render();
}

function render() {
  queueSection.hidden = state.files.length === 0;
  cleanButton.disabled = state.processing || state.files.length === 0;
  fileList.replaceChildren();
  state.files.forEach((item, index) => {
    const row = document.createElement('div'); row.className = 'file-row';
    const img = document.createElement('img'); img.className = 'thumb'; img.src = item.previewUrl; img.alt = '';
    const details = document.createElement('div');
    const name = document.createElement('div'); name.className = 'file-name'; name.title = item.file.name; name.textContent = item.file.name;
    const meta = document.createElement('div'); meta.className = 'file-meta'; meta.textContent = `${formatBytes(item.file.size)} · ${item.file.type.replace('image/', '').toUpperCase()}`;
    details.append(name, meta);
    const status = document.createElement('span'); status.className = 'file-status'; status.textContent = t(item.status);
    const remove = document.createElement('button'); remove.className = 'remove-file'; remove.type = 'button'; remove.setAttribute('aria-label', t('removeFile', item.file.name)); remove.textContent = '×'; remove.addEventListener('click', () => removeFile(index));
    row.append(img, details, status, remove); fileList.append(row);
  });
}

function removeFile(index) { URL.revokeObjectURL(state.files[index].previewUrl); state.files.splice(index, 1); render(); }
function formatBytes(bytes) { if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`; return `${(bytes / 1024 / 1024).toFixed(1)} MB`; }

async function cleanAndDownload() {
  if (!state.files.length || state.processing) return;
  state.processing = true; cleanButton.disabled = true; cleanButton.querySelector('[data-i18n="cleanDownload"]').textContent = t('processingButton');
  let success = 0;
  for (const item of state.files) {
    item.status = 'processing'; render();
    try { const blob = await reencodeWithoutMetadata(item.file, Number(qualityInput.value) / 100); downloadBlob(blob, cleanName(item.file.name, blob.type)); item.status = 'exported'; success++; }
    catch (error) { item.status = 'failed'; console.error(error); }
    render();
  }
  state.processing = false; cleanButton.disabled = false; cleanButton.querySelector('[data-i18n="cleanDownload"]').textContent = t('cleanDownload');
  render(); showToast(t('generated', success));
}

function cleanName(name, mime) { const base = name.replace(/\.[^.]+$/, ''); const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'; return `${base}_clean.${ext}`; }

function reencodeWithoutMetadata(file, quality) {
  return new Promise((resolve, reject) => {
    const image = new Image(); const url = URL.createObjectURL(file);
    image.onload = () => {
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { alpha: true }); context.drawImage(image, 0, 0); URL.revokeObjectURL(url);
      let type = file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
      canvas.toBlob((blob) => { if (blob) return resolve(blob); type = 'image/png'; canvas.toBlob((fallback) => fallback ? resolve(fallback) : reject(new Error(t('exportFailed'))), type); }, type, type === 'image/png' ? undefined : quality);
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error(t('readFailed'))); };
    image.src = url;
  });
}

function downloadBlob(blob, filename) { const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = filename; document.body.append(link); link.click(); setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 1000); }

let toastTimer;
function showToast(message) { toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2800); }

setLanguage(language);
