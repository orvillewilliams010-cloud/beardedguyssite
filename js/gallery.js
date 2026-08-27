/**
 * Gallery & Portfolio Engine
 * Loads dynamic images from Supabase Storage + curated showcase gallery
 * Supports category filtering, lazy-loading, and interactive lightbox modal.
 */

import { supabase, BUCKET, isSupabaseConfigured } from './supabase-client.js';

// Curated high-resolution barbershop cuts for instant rich presentation
export const CURATED_GALLERY = [
  {
    id: 'curated-1',
    title: 'Razor Low Skin Fade & Beard Sculpt',
    category: 'fades',
    tag: 'Signature Fade',
    barber: 'Marcus Vance',
    src: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=900&auto=format&fit=crop&q=85',
    thumb: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=600&auto=format&fit=crop&q=80',
    description: 'Ultra-clean zero taper fade paired with precision geometric beard line-up and organic oil finish.'
  },
  {
    id: 'curated-2',
    title: 'Textured Crop with Mid Drop Fade',
    category: 'fades',
    tag: 'Modern Crop',
    barber: 'Leo Santana',
    src: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=900&auto=format&fit=crop&q=85',
    thumb: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&auto=format&fit=crop&q=80',
    description: 'Heavy point-cut texture on top with matte clay styling and a seamless drop fade around the ears.'
  },
  {
    id: 'curated-3',
    title: 'Full Lumberjack Beard Sculpt & Line-Up',
    category: 'beards',
    tag: 'Beard Master',
    barber: 'Diego Cruz',
    src: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=900&auto=format&fit=crop&q=85',
    thumb: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&auto=format&fit=crop&q=80',
    description: 'Freehand scissor tapered full beard shaped to client jawline, finished with cedarwood hot balm.'
  },
  {
    id: 'curated-4',
    title: 'Classic Executive Pompadour',
    category: 'classics',
    tag: 'Gentlemen Classic',
    barber: 'Marcus Vance',
    src: 'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?w=900&auto=format&fit=crop&q=85',
    thumb: 'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?w=600&auto=format&fit=crop&q=80',
    description: 'High volume side part pompadour with classic scissor taper and high-shine water pomade.'
  },
  {
    id: 'curated-5',
    title: 'Hot Towel Straight Razor Beard Shave',
    category: 'beards',
    tag: 'Hot Towel Ritual',
    barber: 'Diego Cruz',
    src: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=900&auto=format&fit=crop&q=85',
    thumb: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&auto=format&fit=crop&q=80',
    description: 'Traditional 3-step hot towel treatment, pre-shave eucalyptus lather, and Japanese straight blade shave.'
  },
  {
    id: 'curated-6',
    title: 'High Skin Taper & Slicked Undercut',
    category: 'fades',
    tag: 'Taper Fade',
    barber: 'Leo Santana',
    src: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=900&auto=format&fit=crop&q=85',
    thumb: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&auto=format&fit=crop&q=80',
    description: 'Disconnected undercut styled back with natural sheen and crispy neckline detailing.'
  },
  {
    id: 'curated-7',
    title: 'Custom Curved Hair Tattoo & Burst Fade',
    category: 'designs',
    tag: 'Freestyle Art',
    barber: 'Leo Santana',
    src: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&auto=format&fit=crop&q=85',
    thumb: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
    description: 'Bespoke razor-etched geometric hair design with textured curls and sharp perimeter edges.'
  },
  {
    id: 'curated-8',
    title: 'Clean Beard Fade & Sharp Mustache Trim',
    category: 'beards',
    tag: 'Beard Fade',
    barber: 'Marcus Vance',
    src: 'https://images.unsplash.com/photo-1567894340315-735d7c361db0?w=900&auto=format&fit=crop&q=85',
    thumb: 'https://images.unsplash.com/photo-1567894340315-735d7c361db0?w=600&auto=format&fit=crop&q=80',
    description: 'Flawless sideburn-to-beard fade transition with styled handlebar mustache accent.'
  }
];

let allGalleryItems = [];
let currentFilteredItems = [];
let currentLightboxIndex = 0;

/**
 * Main Loader: Combines Supabase Storage uploads with curated cuts
 */
export async function loadGalleryImages() {
  const grid = document.querySelector('#gallery-grid');
  if (!grid) return;

  allGalleryItems = [...CURATED_GALLERY];

  // Try to load any real uploads from Supabase Storage
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: files, error } = await supabase.storage.from(BUCKET).list('', {
        limit: 50,
        sortBy: { column: 'created_at', order: 'desc' }
      });

      if (!error && files && files.length > 0) {
        const imageFiles = files.filter(f => /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(f.name));
        
        const uploadedItems = imageFiles.map((file, idx) => {
          const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(file.name);
          return {
            id: `supabase-${file.name}`,
            title: file.name.replace(/[-_]/g, ' ').replace(/\.[^/.]+$/, '').replace(/\d+/g, '').trim() || 'Latest Client Cut',
            category: 'fades',
            tag: 'New Upload',
            barber: 'The Master Barber',
            src: publicUrl,
            thumb: publicUrl,
            description: 'Freshly uploaded master cut directly from the Bearded Guys chair.'
          };
        });

        // Prepend uploads to the top of the gallery
        allGalleryItems = [...uploadedItems, ...CURATED_GALLERY];
      }
    } catch (err) {
      console.warn('[Gallery] Supabase fetch notice:', err);
    }
  }

  // Also check local storage for any demo uploads created in admin
  const demoUploads = localStorage.getItem('bearded_demo_uploads');
  if (demoUploads) {
    try {
      const parsed = JSON.parse(demoUploads);
      if (Array.isArray(parsed) && parsed.length > 0) {
        allGalleryItems = [...parsed, ...allGalleryItems];
      }
    } catch (e) {}
  }

  setupGalleryFilters();
  renderGalleryGrid('all');
  setupLightbox();
}

/**
 * Filter handler
 */
function setupGalleryFilters() {
  const filterBtns = document.querySelectorAll('.gallery-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.getAttribute('data-filter') || 'all';
      renderGalleryGrid(cat);
    });
  });
}

/**
 * Render items in the grid
 */
function renderGalleryGrid(category = 'all') {
  const grid = document.querySelector('#gallery-grid');
  if (!grid) return;

  if (category === 'all') {
    currentFilteredItems = allGalleryItems;
  } else {
    currentFilteredItems = allGalleryItems.filter(item => item.category === category);
  }

  if (currentFilteredItems.length === 0) {
    grid.innerHTML = `
      <div class="gallery-empty-state">
        <div class="empty-icon">✂️</div>
        <h3>No Photos in This Category Yet</h3>
        <p>Stay tuned — our master barbers are constantly adding fresh cuts!</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = '';

  currentFilteredItems.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'gallery-card reveal-child';
    card.setAttribute('role', 'listitem');
    card.style.animationDelay = `${index * 0.06}s`;

    card.innerHTML = `
      <div class="gallery-img-container">
        <img
          src="${item.thumb || item.src}"
          alt="${item.title}"
          loading="${index < 3 ? 'eager' : 'lazy'}"
          ${index === 0 ? 'fetchpriority="high"' : ''}
          class="gallery-image"
          onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&auto=format&fit=crop&q=80';"
        />
        <div class="gallery-badge">${item.tag || 'Master Cut'}</div>
        <div class="gallery-card-overlay">
          <div class="gallery-overlay-top">
            <span class="gallery-barber-tag">💈 ${item.barber || 'Master Barber'}</span>
          </div>
          <div class="gallery-overlay-bottom">
            <h4 class="gallery-item-title">${item.title}</h4>
            <p class="gallery-item-desc">${item.description || ''}</p>
            <div class="gallery-card-action">
              <span class="view-zoom-btn">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                </svg>
                Zoom Cut
              </span>
            </div>
          </div>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      openLightbox(index);
    });

    grid.appendChild(card);
  });
}

// ─── Lightbox Modal ──────────────────────────────────────────────────────────

function setupLightbox() {
  if (document.getElementById('lightbox-modal')) return;

  const lb = document.createElement('div');
  lb.id = 'lightbox-modal';
  lb.className = 'lightbox-modal';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Image preview');

  lb.innerHTML = `
    <div class="lightbox-backdrop"></div>
    <div class="lightbox-dialog">
      <button class="lb-btn lb-close" id="lb-close-btn" aria-label="Close modal">
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <button class="lb-nav-btn lb-prev" id="lb-prev-btn" aria-label="Previous photo">
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <button class="lb-nav-btn lb-next" id="lb-next-btn" aria-label="Next photo">
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>

      <div class="lightbox-media-wrapper">
        <img id="lb-image" src="" alt="Barbershop Cut Preview" class="lightbox-img" />
        <div class="lightbox-caption">
          <div class="lb-caption-header">
            <span class="lb-tag" id="lb-tag">Signature Cut</span>
            <span class="lb-counter" id="lb-counter">1 of 8</span>
          </div>
          <h3 id="lb-title" class="lb-title">Haircut Title</h3>
          <p id="lb-desc" class="lb-desc">Detailed haircut description...</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(lb);

  // Wire events
  document.getElementById('lb-close-btn').addEventListener('click', closeLightbox);
  lb.querySelector('.lightbox-backdrop').addEventListener('click', closeLightbox);
  document.getElementById('lb-prev-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    navigateLightbox(-1);
  });
  document.getElementById('lb-next-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    navigateLightbox(1);
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
  });
}

function openLightbox(index) {
  if (!currentFilteredItems || currentFilteredItems.length === 0) return;
  currentLightboxIndex = index;
  updateLightboxContent();

  const lb = document.getElementById('lightbox-modal');
  lb.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lb = document.getElementById('lightbox-modal');
  if (lb) lb.classList.remove('active');
  document.body.style.overflow = '';
}

function navigateLightbox(direction) {
  if (!currentFilteredItems || currentFilteredItems.length === 0) return;
  currentLightboxIndex = (currentLightboxIndex + direction + currentFilteredItems.length) % currentFilteredItems.length;
  updateLightboxContent();
}

function updateLightboxContent() {
  const item = currentFilteredItems[currentLightboxIndex];
  if (!item) return;

  const img = document.getElementById('lb-image');
  const title = document.getElementById('lb-title');
  const desc = document.getElementById('lb-desc');
  const tag = document.getElementById('lb-tag');
  const counter = document.getElementById('lb-counter');

  img.style.opacity = '0';
  img.src = item.src;
  img.alt = item.title;
  
  img.onload = () => {
    img.style.opacity = '1';
  };

  title.textContent = item.title;
  desc.textContent = item.description || `Crafted by ${item.barber || 'Master Barber'} at Bearded Guys.`;
  tag.textContent = item.tag || 'Master Cut';
  counter.textContent = `${currentLightboxIndex + 1} of ${currentFilteredItems.length}`;
}
