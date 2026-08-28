/**
 * Admin Dashboard & Gallery Manager Engine
 * Handles Supabase auth guard, live credentials update, image uploads, and delete operations.
 */

import { supabase, BUCKET, isSupabaseConfigured, saveCredentials } from './supabase-client.js';
import { requireAuth, logout, getSession } from './auth.js';
import { CURATED_GALLERY } from './gallery.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Auth Guard
  const session = await requireAuth();
  if (!session) return;

  // 2. Populate User Profile
  const email = session.user?.email || 'owner@beardedguys.com';
  const emailEl = document.getElementById('admin-user-email');
  const avatarEl = document.getElementById('admin-user-avatar');
  if (emailEl) emailEl.textContent = email;
  if (avatarEl) avatarEl.textContent = email.charAt(0).toUpperCase();

  // 3. Populate Supabase credentials fields
  const urlInput = document.getElementById('sb-url-input');
  const keyInput = document.getElementById('sb-key-input');
  const bucketInput = document.getElementById('sb-bucket-input');

  if (urlInput) urlInput.value = localStorage.getItem('bearded_supabase_url') || (window.SUPABASE_CONFIG?.url) || '';
  if (keyInput) keyInput.value = localStorage.getItem('bearded_supabase_key') || (window.SUPABASE_CONFIG?.anonKey) || '';
  if (bucketInput) bucketInput.value = localStorage.getItem('bearded_supabase_bucket') || (window.SUPABASE_CONFIG?.bucket) || 'gallery';

  // 4. Update Status Indicators
  updateConnectionBadge();

  // 5. Load Admin Gallery
  await loadAdminGallery();

  // 6. Setup Event Handlers
  setupUploadZone();
  setupSettingsForm();

  // Sign out button
  document.getElementById('signout-btn')?.addEventListener('click', logout);

  // Mobile sidebar toggle
  const sidebar = document.getElementById('admin-sidebar');
  const toggleBtn = document.getElementById('menu-toggle');
  toggleBtn?.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });
});

/**
 * Check and display connection status
 */
function updateConnectionBadge() {
  const badge = document.getElementById('supabase-status-badge');
  const countEl = document.getElementById('metric-supabase-status');
  if (isSupabaseConfigured()) {
    if (badge) {
      badge.innerHTML = '<span style="color:var(--accent-green)">🟢 Supabase Live Cloud Connected</span>';
    }
    if (countEl) countEl.innerHTML = '<span style="color:var(--accent-green)">Connected</span>';
  } else {
    if (badge) {
      badge.innerHTML = '<span style="color:var(--gold-primary)">🟡 Demo Mode (Enter keys below to enable Cloud Storage)</span>';
    }
    if (countEl) countEl.innerHTML = '<span style="color:var(--gold-primary)">Local/Demo</span>';
  }
}

/**
 * Handle Settings Form (Saving Supabase keys in browser)
 */
function setupSettingsForm() {
  const form = document.getElementById('supabase-settings-form');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = document.getElementById('sb-url-input').value.trim();
    const key = document.getElementById('sb-key-input').value.trim();
    const bucket = document.getElementById('sb-bucket-input').value.trim() || 'gallery';

    if (url && key) {
      saveCredentials(url, key, bucket);
      showToast('Credentials saved! Reloading dashboard...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      showToast('Please enter both Supabase URL and Anon Key.', true);
    }
  });
}

/**
 * Load and render images in admin grid
 */
async function loadAdminGallery() {
  const grid = document.getElementById('admin-gallery-grid');
  const countEl = document.getElementById('metric-total-photos');
  const lastUploadEl = document.getElementById('metric-last-upload');
  if (!grid) return;

  grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:3rem; color:var(--gold-primary);">Loading gallery images...</div>';

  let items = [];

  // If Supabase is connected, fetch files
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: files, error } = await supabase.storage.from(BUCKET).list('', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      });

      if (!error && files) {
        const imageFiles = files.filter(f => /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(f.name));
        items = imageFiles.map(file => {
          const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(file.name);
          return {
            id: file.name,
            name: file.name,
            title: file.name.replace(/[-_]/g, ' ').replace(/\.[^/.]+$/, ''),
            src: publicUrl,
            isSupabase: true
          };
        });
      }
    } catch (e) {
      console.warn('Supabase storage error:', e);
    }
  }

  // Also include demo local uploads if any
  const localUploads = localStorage.getItem('bearded_demo_uploads');
  if (localUploads) {
    try {
      const parsed = JSON.parse(localUploads);
      if (Array.isArray(parsed)) {
        items = [...parsed.map(p => ({ ...p, name: p.id, isLocal: true })), ...items];
      }
    } catch (e) {}
  }

  // If completely empty, show curated cuts for visual reference
  if (items.length === 0) {
    items = CURATED_GALLERY.map(c => ({
      id: c.id,
      name: c.title,
      title: c.title,
      src: c.thumb || c.src,
      isCurated: true
    }));
  }

  if (countEl) countEl.textContent = items.length;
  if (lastUploadEl && items.length > 0) {
    lastUploadEl.textContent = 'Today';
  }

  grid.innerHTML = '';

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'admin-image-item';
    card.innerHTML = `
      <img src="${item.src}" alt="${item.title}" loading="lazy" />
      <div class="admin-item-overlay">
        <button class="btn-delete-img" data-id="${item.id}" data-is-supabase="${Boolean(item.isSupabase)}" data-is-local="${Boolean(item.isLocal)}" type="button">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          Delete
        </button>
        <div class="admin-item-title">${item.title}</div>
      </div>
    `;

    card.querySelector('.btn-delete-img')?.addEventListener('click', () => {
      deleteImage(item, card);
    });

    grid.appendChild(card);
  });
}

/**
 * Delete an image
 */
async function deleteImage(item, cardEl) {
  if (!confirm(`Are you sure you want to delete "${item.title}"?`)) return;

  if (item.isSupabase && isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase.storage.from(BUCKET).remove([item.id]);
      if (error) {
        showToast(`Delete failed: ${error.message}`, true);
        return;
      }
    } catch (err) {
      showToast('Error removing from Supabase.', true);
      return;
    }
  } else if (item.isLocal) {
    let local = JSON.parse(localStorage.getItem('bearded_demo_uploads') || '[]');
    local = local.filter(l => l.id !== item.id);
    localStorage.setItem('bearded_demo_uploads', JSON.stringify(local));
  }

  cardEl.remove();
  showToast('Photo removed from portfolio.');
  
  const countEl = document.getElementById('metric-total-photos');
  if (countEl) {
    const current = parseInt(countEl.textContent) || 1;
    countEl.textContent = Math.max(0, current - 1);
  }
}

/**
 * Drag and Drop Upload System
 */
function setupUploadZone() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const chooseBtn = document.getElementById('choose-files-btn');
  const progressWrap = document.getElementById('upload-progress-wrap');
  const progressFill = document.getElementById('progress-bar-fill');
  const progressStatus = document.getElementById('upload-status-text');

  if (!dropZone || !fileInput) return;

  chooseBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUploads(Array.from(e.dataTransfer.files));
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFileUploads(Array.from(fileInput.files));
    }
  });

  async function handleFileUploads(files) {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      showToast('Please select valid image files (JPG, PNG, WebP).', true);
      return;
    }

    const titleInput = document.getElementById('upload-title-input');
    const categorySelect = document.getElementById('upload-cat-select');
    const customTitle = titleInput ? titleInput.value.trim() : '';
    const category = categorySelect ? categorySelect.value : 'fades';

    progressWrap?.classList.add('show');
    if (progressFill) progressFill.style.width = '10%';
    if (progressStatus) progressStatus.textContent = `Uploading ${imageFiles.length} photo(s)...`;

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const percent = Math.round(((i + 1) / imageFiles.length) * 100);

      if (isSupabaseConfigured() && supabase) {
        // Upload directly to Supabase Storage Bucket
        const ext = file.name.split('.').pop();
        const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        try {
          const { data, error } = await supabase.storage.from(BUCKET).upload(safeName, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type
          });

          if (error) {
            console.error('Supabase upload error:', error);
            showToast(`Upload error for ${file.name}: ${error.message}`, true);
          }
        } catch (err) {
          console.error(err);
        }
      } else {
        // Save to demo local state using FileReader
        await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const newItem = {
              id: `local-${Date.now()}-${i}`,
              title: customTitle || file.name.replace(/\.[^/.]+$/, ''),
              category: category,
              tag: 'New Upload',
              barber: 'Master Barber',
              src: e.target.result,
              thumb: e.target.result,
              description: 'Freshly uploaded cut.'
            };
            const existing = JSON.parse(localStorage.getItem('bearded_demo_uploads') || '[]');
            existing.unshift(newItem);
            localStorage.setItem('bearded_demo_uploads', JSON.stringify(existing));
            resolve();
          };
          reader.readAsDataURL(file);
        });
      }

      if (progressFill) progressFill.style.width = `${percent}%`;
    }

    if (progressStatus) progressStatus.textContent = 'Upload Complete! Refreshing gallery...';

    setTimeout(async () => {
      progressWrap?.classList.remove('show');
      if (progressFill) progressFill.style.width = '0%';
      fileInput.value = '';
      if (titleInput) titleInput.value = '';
      showToast('Photos successfully uploaded to gallery!');
      await loadAdminGallery();
    }, 900);
  }
}

/**
 * Toast helper
 */
function showToast(message, isError = false) {
  let toast = document.getElementById('admin-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'admin-toast';
    toast.className = 'toast-bar';
    document.body.appendChild(toast);
  }

  toast.style.borderColor = isError ? 'var(--accent-red)' : 'var(--gold-primary)';
  toast.innerHTML = isError ? `⚠️ ${message}` : `✓ ${message}`;
  toast.classList.add('active');

  setTimeout(() => {
    toast.classList.remove('active');
  }, 4000);
}
