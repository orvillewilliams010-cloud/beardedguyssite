/**
 * Admin Dashboard Logic
 * Handles auth guard, image upload (drag-drop + file picker),
 * gallery management, and delete operations via Supabase Storage.
 */

import { supabase, BUCKET } from './supabase-client.js';
import { requireAuth, logout } from './auth.js';

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Auth guard — redirect to login if no session
  const session = await requireAuth();
  if (!session) return;

  // Show logged-in user email
  const emailEl = document.getElementById('admin-email');
  if (emailEl) emailEl.textContent = session.user.email;

  // 2. Load existing gallery
  await loadAdminGallery();

  // 3. Wire up upload form
  setupUploadZone();

  // 4. Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
});

// ─── Admin Gallery ────────────────────────────────────────────────────────────
async function loadAdminGallery() {
  const grid = document.getElementById('admin-gallery-grid');
  if (!grid) return;

  grid.innerHTML = '<p class="admin-loading">Loading images...</p>';

  const { data: files, error } = await supabase.storage.from(BUCKET).list('', {
    limit: 200,
    sortBy: { column: 'created_at', order: 'desc' },
  });

  if (error) {
    grid.innerHTML = `<p class="admin-error">Error loading gallery: ${error.message}</p>`;
    return;
  }

  const imageFiles = (files || []).filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f.name));

  if (imageFiles.length === 0) {
    grid.innerHTML = '<p class="admin-empty">No images uploaded yet. Use the form above to add your first photo!</p>';
    return;
  }

  grid.innerHTML = '';
  imageFiles.forEach(file => renderAdminCard(file, grid));
}

function renderAdminCard(file, grid) {
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(file.name);

  const card = document.createElement('div');
  card.className = 'admin-img-card';
  card.dataset.filename = file.name;
  card.innerHTML = `
    <img src="${publicUrl}" alt="${file.name}" loading="lazy" />
    <div class="admin-img-overlay">
      <span class="admin-img-name">${file.name}</span>
      <button class="btn-delete" aria-label="Delete ${file.name}" data-filename="${file.name}">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
        Delete
      </button>
    </div>
  `;

  card.querySelector('.btn-delete').addEventListener('click', () => deleteImage(file.name, card));
  grid.appendChild(card);
}

// ─── Delete ───────────────────────────────────────────────────────────────────
async function deleteImage(filename, cardEl) {
  if (!confirm(`Delete "${filename}"? This cannot be undone.`)) return;

  cardEl.classList.add('deleting');
  const { error } = await supabase.storage.from(BUCKET).remove([filename]);

  if (error) {
    showToast(`Delete failed: ${error.message}`, 'error');
    cardEl.classList.remove('deleting');
    return;
  }

  cardEl.style.animation = 'fadeOut 0.3s forwards';
  setTimeout(() => {
    cardEl.remove();
    const grid = document.getElementById('admin-gallery-grid');
    if (grid && grid.children.length === 0) {
      grid.innerHTML = '<p class="admin-empty">No images uploaded yet.</p>';
    }
  }, 320);

  showToast('Image deleted successfully.', 'success');
}

// ─── Upload Zone ──────────────────────────────────────────────────────────────
function setupUploadZone() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const uploadBtn = document.getElementById('upload-btn');
  const progressBar = document.getElementById('upload-progress');
  const progressWrap = document.getElementById('progress-wrap');

  if (!dropZone || !fileInput) return;

  // Click to browse
  dropZone.addEventListener('click', () => fileInput.click());
  uploadBtn?.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });

  // File input change
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) handleFiles(Array.from(fileInput.files));
  });

  // Drag-and-drop events
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) handleFiles(files);
    else showToast('Please drop image files only (JPG, PNG, WebP).', 'error');
  });

  async function handleFiles(files) {
    if (progressWrap) progressWrap.hidden = false;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const pct = Math.round(((i) / files.length) * 100);
      if (progressBar) progressBar.value = pct;

      await uploadImage(file);
    }

    if (progressBar) progressBar.value = 100;
    setTimeout(() => {
      if (progressWrap) progressWrap.hidden = true;
      if (progressBar) progressBar.value = 0;
    }, 800);

    // Refresh gallery
    await loadAdminGallery();
    fileInput.value = '';
  }
}

// ─── Upload ───────────────────────────────────────────────────────────────────
async function uploadImage(file) {
  const ext = file.name.split('.').pop();
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(safeName, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    showToast(`Upload failed for "${file.name}": ${error.message}`, 'error');
    return;
  }

  showToast(`"${file.name}" uploaded!`, 'success');
}

// ─── Toast Notifications ──────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.textContent = message;

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast--visible'));

  setTimeout(() => {
    toast.classList.remove('toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 4000);
}
