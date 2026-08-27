/**
 * Public Gallery Loader
 * Fetches images from Supabase Storage and renders them into the gallery grid.
 * Includes lazy loading and a vanilla lightbox.
 */

import { supabase, BUCKET } from './supabase-client.js';

const GALLERY_SELECTOR = '#gallery-grid';

/**
 * Load images from Supabase Storage and inject into the gallery grid.
 */
export async function loadGalleryImages() {
  const grid = document.querySelector(GALLERY_SELECTOR);
  if (!grid) return;

  grid.innerHTML = '<p class="gallery-loading">Loading gallery...</p>';

  const { data: files, error } = await supabase.storage.from(BUCKET).list('', {
    limit: 100,
    sortBy: { column: 'created_at', order: 'desc' },
  });

  if (error || !files || files.length === 0) {
    grid.innerHTML = '<p class="gallery-empty">No photos yet. Check back soon!</p>';
    return;
  }

  const imageFiles = files.filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f.name));

  if (imageFiles.length === 0) {
    grid.innerHTML = '<p class="gallery-empty">No photos yet. Check back soon!</p>';
    return;
  }

  grid.innerHTML = '';

  imageFiles.forEach((file, index) => {
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(file.name);

    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.innerHTML = `
      <img
        src="${publicUrl}"
        alt="Bearded Guys — barber work photo ${index + 1}"
        loading="${index === 0 ? 'eager' : 'lazy'}"
        ${index === 0 ? 'fetchpriority="high"' : ''}
        class="gallery-img"
      />
      <div class="gallery-overlay">
        <span class="gallery-zoom-icon">&#9906;</span>
      </div>
    `;

    item.addEventListener('click', () => openLightbox(publicUrl, index + 1));
    grid.appendChild(item);
  });

  setupLightbox();
}

// ─── Lightbox ────────────────────────────────────────────────────────────────

function setupLightbox() {
  if (document.getElementById('lightbox')) return;

  const lb = document.createElement('div');
  lb.id = 'lightbox';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Image lightbox');
  lb.innerHTML = `
    <button class="lb-close" aria-label="Close lightbox">&times;</button>
    <img id="lb-img" src="" alt="" />
  `;
  document.body.appendChild(lb);

  lb.querySelector('.lb-close').addEventListener('click', closeLightbox);
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });
}

function openLightbox(src, index) {
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lb-img');
  img.src = src;
  img.alt = `Barber work photo ${index}`;
  lb.classList.add('active');
  document.body.style.overflow = 'hidden';
  lb.querySelector('.lb-close').focus();
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  lb.classList.remove('active');
  document.body.style.overflow = '';
}
