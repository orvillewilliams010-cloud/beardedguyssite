/**
 * Admin Dashboard & Gallery Manager Engine
 * Handles Firebase auth guard, image uploads, base64 conversion, and delete operations.
 */

import { initFirebase, db, auth, isFirebaseConfigured, handleFirestoreError, OperationType } from './firebase-client.js';
import { requireAuth, logout, getSession } from './auth.js';
import { CURATED_GALLERY } from './gallery.js';
import { doc, setDoc, deleteDoc, getDocs, collection, query, orderBy, limit, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Auth Guard
  const session = await requireAuth();
  if (!session) return;

  await initFirebase();

  // 2. Populate User Profile
  const email = session.user?.email || 'owner@beardedguys.com';
  const emailEl = document.getElementById('admin-user-email');
  const avatarEl = document.getElementById('admin-user-avatar');
  if (emailEl) emailEl.textContent = email;
  if (avatarEl) avatarEl.textContent = email.charAt(0).toUpperCase();

  // 3. Load Admin Gallery
  await loadAdminGallery();

  // 4. Setup Event Handlers
  setupUploadZone();

  // Sign out button
  document.getElementById('signout-btn')?.addEventListener('click', logout);
});

/**
 * Load and render images in admin grid
 */
async function loadAdminGallery() {
  const grid = document.getElementById('admin-gallery-grid');
  if (!grid) return;

  grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:3rem; font-family:var(--font-labels); font-size:1.2rem; letter-spacing:0.1em; text-transform:uppercase; color:var(--ink-faint);">Loading prints...</div>';

  let items = [];

  // If Firebase is connected, fetch files
  if (isFirebaseConfigured() && db) {
    const pathForGetDocs = 'gallery';
    try {
      const q = query(collection(db, pathForGetDocs), orderBy('createdAt', 'desc'), limit(100));
      const querySnapshot = await getDocs(q);
      
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          name: data.title,
          title: data.title || 'Client Cut',
          src: data.src,
          isFirebase: true
        });
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, pathForGetDocs);
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

  // Always include curated cuts for visual reference so they don't disappear
  const curatedItems = CURATED_GALLERY.map(c => ({
    id: c.id,
    name: c.title,
    title: c.title,
    src: c.thumb || c.src,
    isCurated: true
  }));
  items = [...items, ...curatedItems];

  grid.innerHTML = '';

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'admin-card';
    card.innerHTML = `
      <div class="admin-card-img-wrapper">
        <img src="${item.src}" alt="${item.title}" loading="lazy" />
        <button class="btn-delete-card" data-id="${item.id}" data-is-firebase="${Boolean(item.isFirebase)}" data-is-local="${Boolean(item.isLocal)}" type="button" aria-label="Delete Image">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
      <div class="admin-card-title">${item.title}</div>
    `;

    card.querySelector('.btn-delete-card')?.addEventListener('click', () => {
      deleteImage(item, card);
    });

    grid.appendChild(card);
  });
}

/**
 * Delete an image
 */
async function deleteImage(item, cardEl) {
  if (item.isCurated) {
    alert("Curated placeholder images cannot be deleted. They will naturally be replaced as you upload more of your own work.");
    return;
  }

  if (!confirm(`Are you sure you want to delete "${item.title}"?`)) return;

  if (item.isFirebase && isFirebaseConfigured() && db) {
    const pathForDelete = `gallery/${item.id}`;
    try {
      await deleteDoc(doc(db, 'gallery', item.id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, pathForDelete);
      showToast('Error removing from server.', true);
      return;
    }
  } else if (item.isLocal) {
    let local = JSON.parse(localStorage.getItem('bearded_demo_uploads') || '[]');
    local = local.filter(l => l.id !== item.id);
    localStorage.setItem('bearded_demo_uploads', JSON.stringify(local));
  }

  cardEl.remove();
  showToast('Photo removed from portfolio.');
}

async function resizeImage(file, maxDimension = 800) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
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
  
  const startUploadBtn = document.getElementById('start-upload-btn');
  const dzMainText = document.getElementById('dz-main-text');
  const dzSubText = document.getElementById('dz-sub-text');

  if (!dropZone || !fileInput) return;
  
  let pendingFiles = [];

  function updateFileSelection(files) {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      showToast('Please select valid image files (JPG, PNG, WebP).', true);
      return;
    }
    pendingFiles = imageFiles;
    if (dzMainText) dzMainText.textContent = `${pendingFiles.length} photo(s) selected`;
    if (dzSubText) dzSubText.textContent = 'Fill out details below, then click Upload Print';
    if (startUploadBtn) startUploadBtn.disabled = false;
  }

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
      updateFileSelection(Array.from(e.dataTransfer.files));
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      updateFileSelection(Array.from(fileInput.files));
    }
  });
  
  startUploadBtn?.addEventListener('click', () => {
    if (pendingFiles.length > 0) {
      handleFileUploads(pendingFiles);
    }
  });

  async function handleFileUploads(imageFiles) {
    if (imageFiles.length === 0) return;

    const titleInput = document.getElementById('upload-title-input');
    const categorySelect = document.getElementById('upload-cat-select');
    const customTitle = titleInput ? titleInput.value.trim() : '';
    const customType = categorySelect && categorySelect.value.trim() ? categorySelect.value.trim() : 'Custom Cut';

    progressWrap?.classList.add('show');
    if (progressFill) progressFill.style.width = '10%';
    if (progressStatus) progressStatus.textContent = `Uploading ${imageFiles.length} photo(s)...`;

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const percent = Math.round(((i + 1) / imageFiles.length) * 100);

      const base64Data = await resizeImage(file, 800);

      if (isFirebaseConfigured() && db && auth.currentUser) {
        const safeName = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const pathForWrite = `gallery/${safeName}`;

        try {
          await setDoc(doc(db, 'gallery', safeName), {
            title: customTitle || file.name.replace(/\.[^/.]+$/, '').substring(0, 50),
            category: customType,
            tag: customType,
            description: 'Freshly uploaded cut.',
            src: base64Data,
            thumb: base64Data,
            createdAt: serverTimestamp(),
            ownerId: auth.currentUser.uid
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, pathForWrite);
        }
      } else {
        // Save to demo local state
        const newItem = {
          id: `local-${Date.now()}-${i}`,
          title: customTitle || file.name.replace(/\.[^/.]+$/, ''),
          category: customType,
          tag: customType,
          barber: 'Master Barber',
          src: base64Data,
          thumb: base64Data,
          description: 'Freshly uploaded cut.'
        };
        const existing = JSON.parse(localStorage.getItem('bearded_demo_uploads') || '[]');
        existing.unshift(newItem);
        localStorage.setItem('bearded_demo_uploads', JSON.stringify(existing));
      }

      if (progressFill) progressFill.style.width = `${percent}%`;
    }

    if (progressStatus) progressStatus.textContent = 'Upload Complete! Refreshing...';

    setTimeout(async () => {
      progressWrap?.classList.remove('show');
      if (progressFill) progressFill.style.width = '0%';
      fileInput.value = '';
      if (titleInput) titleInput.value = '';
      if (categorySelect) categorySelect.value = '';
      
      pendingFiles = [];
      if (startUploadBtn) startUploadBtn.disabled = true;
      if (dzMainText) dzMainText.textContent = 'Drop Client Photos Here';
      if (dzSubText) dzSubText.textContent = 'or click to browse your files';

      showToast('Photos successfully uploaded!');
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

  toast.style.borderColor = isError ? 'var(--oxblood)' : 'var(--brass)';
  toast.innerHTML = isError ? `⚠️ ${message}` : `✓ ${message}`;
  toast.classList.add('active');

  setTimeout(() => {
    toast.classList.remove('active');
  }, 4000);
}

