/**
 * Gallery & Portfolio Engine
 * Loads dynamic images from Firebase Firestore + curated showcase gallery
 * Supports category filtering, lazy-loading, and interactive lightbox modal.
 */

import { initFirebase, db, isFirebaseConfigured, handleFirestoreError, OperationType } from './firebase-client.js';
import { collection, query, orderBy, limit, getDocs } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

// Curated high-resolution barbershop cuts without mentioning individual barber names
export const CURATED_GALLERY = [

  {
    id: 'curated-1',
    title: 'Precision Razor Skin Fade & Beard Lineup',
    category: 'fades',
    tag: 'Skin Fade',
    src: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=900&auto=format&fit=crop&q=85',
    thumb: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=600&auto=format&fit=crop&q=80',
    description: 'Zero taper skin fade with seamless blending and sharp razor-crisped beard outline.'
  },
  {
    id: 'curated-2',
    title: 'Textured Crop & Mid Drop Fade',
    category: 'fades',
    tag: 'Modern Crop',
    src: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=900&auto=format&fit=crop&q=85',
    thumb: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&auto=format&fit=crop&q=80',
    description: 'Point-cut heavy top texture with matte clay finish and a clean drop fade around the ears.'
  },
  {
    id: 'curated-3',
    title: 'Full Beard Sculpting & Oil Treatment',
    category: 'beards',
    tag: 'Beard Sculpt',
    src: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=900&auto=format&fit=crop&q=85',
    thumb: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&auto=format&fit=crop&q=80',
    description: 'Custom jawline contouring, bulk tapering, and warm cedarwood beard oil conditioning.'
  },
  {
    id: 'curated-4',
    title: 'Classic Executive Scissor Taper',
    category: 'classics',
    tag: 'Classic Cut',
    src: 'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?w=900&auto=format&fit=crop&q=85',
    thumb: 'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?w=600&auto=format&fit=crop&q=80',
    description: 'Clean side part taper with natural sheen finish and crisp neckline detailing.'
  },
  {
    id: 'curated-5',
    title: 'Hot Towel Straight Blade Shave',
    category: 'beards',
    tag: 'Hot Towel Ritual',
    src: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=900&auto=format&fit=crop&q=85',
    thumb: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&auto=format&fit=crop&q=80',
    description: 'Double eucalyptus hot steam wrap with rich lather and Japanese straight blade shave.'
  },
  {
    id: 'curated-6',
    title: 'Curly Fade & Sponge Top Finish',
    category: 'textured',
    tag: 'Textured & Curly',
    src: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&auto=format&fit=crop&q=85',
    thumb: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
    description: 'Specialist curl definition, sponge texture styling, and crispy perimeter tape.'
  },
  {
    id: 'curated-7',
    title: 'High Taper Fade & Undercut',
    category: 'fades',
    tag: 'High Taper',
    src: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=900&auto=format&fit=crop&q=85',
    thumb: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&auto=format&fit=crop&q=80',
    description: 'Crisp hairline and high taper blend with textured top pushed back.'
  },
  {
    id: 'curated-8',
    title: 'Beard Fade & Sharp Mustache Sculpt',
    category: 'beards',
    tag: 'Beard Fade',
    src: 'https://images.unsplash.com/photo-1567894340315-735d7c361db0?w=900&auto=format&fit=crop&q=85',
    thumb: 'https://images.unsplash.com/photo-1567894340315-735d7c361db0?w=600&auto=format&fit=crop&q=80',
    description: 'Flawless sideburn-to-beard fade transition with styled handlebar mustache accent.'
  }
];

let allGalleryItems = [];
let currentFilteredItems = [];
let currentLightboxIndex = 0;

/**
 * Main Loader
 */
export async function loadGalleryImages() {
  const grid = document.querySelector('#gallery-grid');
  if (!grid) return;

  allGalleryItems = [...CURATED_GALLERY];

  const configured = await initFirebase();

  // Firebase Firestore dynamic fetch
  if (configured && db) {
    const pathForGetDocs = 'gallery';
    try {
      const q = query(collection(db, pathForGetDocs), orderBy('createdAt', 'desc'), limit(50));
      const querySnapshot = await getDocs(q);
      
      const uploadedItems = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        uploadedItems.push({
          id: doc.id,
          title: data.title || 'Latest Client Cut',
          category: data.category || 'fades',
          tag: data.tag || 'Studio Cut',
          src: data.src,
          thumb: data.thumb || data.src,
          description: data.description || 'Freshly uploaded master cut from Bearded Guys Barber Shop.'
        });
      });

      if (uploadedItems.length > 0) {
        allGalleryItems = [...uploadedItems, ...CURATED_GALLERY];
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, pathForGetDocs);
    }
  }

  // Local demo uploads check
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

function setupGalleryFilters() {
  // Filters removed for infinite carousel design
}

let galleryLimit = 12;

function renderGalleryGrid(category = 'all') {
  const grid = document.querySelector('#gallery-grid');
  const viewMoreActions = document.querySelector('#gallery-actions');
  const viewMoreBtn = document.querySelector('#view-more-prints-btn');
  
  if (!grid) return;

  if (category === 'all') {
    currentFilteredItems = allGalleryItems;
  } else {
    currentFilteredItems = allGalleryItems.filter(item => item.category === category);
  }

  // Sort by newest first (assuming createdAt exists or they are prepended)
  // They are already prepended in fetch so it's fine.

  if (currentFilteredItems.length === 0) {
    grid.innerHTML = `
      <div class="gallery-empty">
        <h3>Nothing in this category yet</h3>
        <p>New work gets added as it comes off the chairs, so check back soon.</p>
      </div>
    `;
    if (viewMoreActions) viewMoreActions.style.display = 'none';
    return;
  }

  grid.innerHTML = '';
  
  // Create a track for the horizontal scrolling marquee
  const track = document.createElement('div');
  track.className = 'gallery-track';
  
  const itemsToRender = currentFilteredItems.slice(0, galleryLimit);

  itemsToRender.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'gallery-card';
    card.setAttribute('role', 'listitem');

    card.innerHTML = `
      <img
        src="${item.thumb || item.src}"
        alt="${item.title}"
        loading="${index < 4 ? 'eager' : 'lazy'}"
        class="gallery-image"
        onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&auto=format&fit=crop&q=80';"
      />
      <div class="gallery-caption-overlay">
        <span class="gallery-item-tag">${item.tag || 'From the shop'}</span>
        <h4 class="gallery-item-title">${item.title}</h4>
      </div>
    `;

    card.addEventListener('click', () => {
      openLightbox(index); // Ensure it opens the correct index in currentFilteredItems
    });

    track.appendChild(card);
  });
  
  grid.appendChild(track);
  
  // Hide view more button since it's a scrolling section again
  if (viewMoreActions) {
    viewMoreActions.style.display = 'none';
  }
}

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
        <img id="lb-image" src="" alt="Barber Cut Preview" class="lightbox-img" />
        <div class="lightbox-caption">
          <div class="lb-caption-header">
            <span class="lb-tag" id="lb-tag">Master Cut</span>
            <span class="lb-counter" id="lb-counter">1 of 8</span>
          </div>
          <h3 id="lb-title" class="lb-title">Cut Title</h3>
          <p id="lb-desc" class="lb-desc">Description...</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(lb);

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
  desc.textContent = item.description || 'Crafted at Bearded Guys Barber Shop.';
  tag.textContent = item.tag || 'Master Cut';
  counter.textContent = `${currentLightboxIndex + 1} of ${currentFilteredItems.length}`;
}
