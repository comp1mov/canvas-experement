(function () {
    const initCarousel = (gallery) => {
        if (!gallery || gallery.dataset.carouselInitialized === "true") return;

        let parent = gallery.closest('.notion-callout.bg-brown-light');
        if (!parent) return;

        const cards = Array.from(gallery.querySelectorAll('.notion-collection-card'));
        if (cards.length === 0) return;

        gallery.dataset.carouselInitialized = "true";

        let currentIndex = 0;

        cards.forEach((card, i) => {
            card.classList.remove('active');
            card.style.display = i === 0 ? '' : 'none';
        });
        cards[0].classList.add('active');

        const leftBtn = document.createElement('button');
        leftBtn.className = 'carousel-button left';
        leftBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="14 6 8 12 14 18" /></svg>`;

        const rightBtn = document.createElement('button');
        rightBtn.className = 'carousel-button right';
        rightBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="10 6 16 12 10 18" /></svg>`;

        gallery.appendChild(leftBtn);
        gallery.appendChild(rightBtn);

        const indicators = document.createElement('div');
        indicators.className = 'carousel-indicators';
        cards.forEach((_, i) => {
            const dot = document.createElement('span');
            if (i === 0) dot.classList.add('active');
            indicators.appendChild(dot);
        });
        gallery.appendChild(indicators);

        const updateCarousel = () => {
            cards.forEach((card, i) => {
                const isActive = i === currentIndex;
                card.classList.toggle('active', isActive);
                card.style.display = isActive ? '' : 'none';
            });

            indicators.querySelectorAll('span').forEach((dot, i) => {
                dot.classList.toggle('active', i === currentIndex);
            });
        };

        const goToPrev = () => {
            currentIndex = (currentIndex - 1 + cards.length) % cards.length;
            updateCarousel();
        };

        const goToNext = () => {
            currentIndex = (currentIndex + 1) % cards.length;
            updateCarousel();
        };

        // ===== LIGHTBOX FUNCTIONALITY =====
        const createLightbox = () => {
            const lightbox = document.createElement('div');
            lightbox.className = 'carousel-lightbox';
            lightbox.innerHTML = `
                <div class="lightbox-overlay"></div>
                <div class="lightbox-content">
                    <button class="lightbox-close" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                    <button class="lightbox-nav lightbox-prev" aria-label="Previous">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </button>
                    <button class="lightbox-nav lightbox-next" aria-label="Next">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                    <img class="lightbox-image" src="" alt="">
                    <div class="lightbox-indicators"></div>
                </div>
            `;
            document.body.appendChild(lightbox);
            return lightbox;
        };

        let lightbox = null;

        const openLightbox = (index) => {
            if (!lightbox) {
                lightbox = createLightbox();
                
                // Close button
                lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
                
                // Overlay click to close
                lightbox.querySelector('.lightbox-overlay').addEventListener('click', closeLightbox);
                
                // Navigation buttons
                lightbox.querySelector('.lightbox-prev').addEventListener('click', (e) => {
                    e.stopPropagation();
                    showLightboxImage((currentLightboxIndex - 1 + cards.length) % cards.length);
                });
                
                lightbox.querySelector('.lightbox-next').addEventListener('click', (e) => {
                    e.stopPropagation();
                    showLightboxImage((currentLightboxIndex + 1) % cards.length);
                });
                
                // Keyboard navigation
                const handleKeydown = (e) => {
                    if (!lightbox.classList.contains('active')) return;
                    if (e.key === 'Escape') closeLightbox();
                    if (e.key === 'ArrowLeft') showLightboxImage((currentLightboxIndex - 1 + cards.length) % cards.length);
                    if (e.key === 'ArrowRight') showLightboxImage((currentLightboxIndex + 1) % cards.length);
                };
                document.addEventListener('keydown', handleKeydown);
                
                // Touch swipe in lightbox
                let lightboxStartX = 0;
                const lightboxContent = lightbox.querySelector('.lightbox-content');
                
                lightboxContent.addEventListener('touchstart', (e) => {
                    if (e.target.closest('.lightbox-nav') || e.target.closest('.lightbox-close')) return;
                    lightboxStartX = e.touches[0].clientX;
                }, { passive: true });
                
                lightboxContent.addEventListener('touchend', (e) => {
                    if (e.target.closest('.lightbox-nav') || e.target.closest('.lightbox-close')) return;
                    const diff = e.changedTouches[0].clientX - lightboxStartX;
                    if (Math.abs(diff) > 50) {
                        diff > 0 ? 
                            showLightboxImage((currentLightboxIndex - 1 + cards.length) % cards.length) :
                            showLightboxImage((currentLightboxIndex + 1) % cards.length);
                    }
                });
            }
            
            currentLightboxIndex = index;
            showLightboxImage(index);
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        };

        const closeLightbox = () => {
            if (lightbox) {
                lightbox.classList.remove('active');
                document.body.style.overflow = '';
            }
        };

        let currentLightboxIndex = 0;

        const showLightboxImage = (index) => {
            currentLightboxIndex = index;
            const card = cards[index];
            const img = card.querySelector('img');
            
            if (img && lightbox) {
                const lightboxImg = lightbox.querySelector('.lightbox-image');
                lightboxImg.src = img.src;
                lightboxImg.alt = img.alt || '';
                
                // Update indicators
                const lightboxIndicators = lightbox.querySelector('.lightbox-indicators');
                lightboxIndicators.innerHTML = '';
                cards.forEach((_, i) => {
                    const dot = document.createElement('span');
                    if (i === index) dot.classList.add('active');
                    lightboxIndicators.appendChild(dot);
                });
            }
        };
        // ===== END LIGHTBOX FUNCTIONALITY =====

        leftBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            goToPrev();
        });

        rightBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            goToNext();
        });

        // ===== CLICK ON HALVES (Desktop & Mobile) =====
        let clickStartX = 0;
        let clickStartTime = 0;
        const CLICK_THRESHOLD = 10; // pixels
        const TIME_THRESHOLD = 300; // ms

        gallery.addEventListener('mousedown', (e) => {
            if (e.target.closest('.carousel-button') || e.target.closest('.carousel-indicators')) return;
            clickStartX = e.clientX;
            clickStartTime = Date.now();
        });

        gallery.addEventListener('mouseup', (e) => {
            if (e.target.closest('.carousel-button') || e.target.closest('.carousel-indicators')) return;
            
            const clickEndX = e.clientX;
            const clickEndTime = Date.now();
            const movedDistance = Math.abs(clickEndX - clickStartX);
            const timeDiff = clickEndTime - clickStartTime;
            
            // If it's a click (not a drag)
            if (movedDistance < CLICK_THRESHOLD && timeDiff < TIME_THRESHOLD) {
                const rect = gallery.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const halfWidth = rect.width / 2;
                
                // Check if double-click for lightbox
                if (e.detail === 2) {
                    openLightbox(currentIndex);
                    return;
                }
                
                // Single click navigation
                if (clickX < halfWidth) {
                    goToPrev();
                } else {
                    goToNext();
                }
            }
        });

        // Touch events for mobile (tap on halves)
        let touchStartX = 0;
        let touchStartTime = 0;
        let touchMoved = false;

        gallery.addEventListener('touchstart', (e) => {
            if (e.target.closest('.carousel-button') || e.target.closest('.carousel-indicators')) return;
            touchStartX = e.touches[0].clientX;
            touchStartTime = Date.now();
            touchMoved = false;
        }, { passive: true });

        gallery.addEventListener('touchmove', (e) => {
            touchMoved = true;
        }, { passive: true });

        gallery.addEventListener('touchend', (e) => {
            if (e.target.closest('.carousel-button') || e.target.closest('.carousel-indicators')) return;
            
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndTime = Date.now();
            const movedDistance = Math.abs(touchEndX - touchStartX);
            const timeDiff = touchEndTime - touchStartTime;
            
            // If it's a tap (not a swipe)
            if (!touchMoved && movedDistance < CLICK_THRESHOLD && timeDiff < TIME_THRESHOLD) {
                const rect = gallery.getBoundingClientRect();
                const tapX = touchEndX - rect.left;
                const halfWidth = rect.width / 2;
                
                // Tap navigation
                if (tapX < halfWidth) {
                    goToPrev();
                } else {
                    goToNext();
                }
            }
        });
        // ===== END CLICK ON HALVES =====

        // Drag/swipe support (original functionality)
        let startX = 0;
        let isDragging = false;

        const onStart = (x) => {
            startX = x;
            isDragging = true;
        };

        const onMove = (x) => {
            if (!isDragging) return;
        };

        const onEnd = (x) => {
            if (!isDragging) return;
            isDragging = false;
            const diff = x - startX;
            if (Math.abs(diff) > 30) {
                diff > 0 ? goToPrev() : goToNext();
            }
        };

        // Long press for lightbox on mobile
        let longPressTimer = null;
        gallery.addEventListener('touchstart', (e) => {
            if (e.target.closest('.carousel-button') || e.target.closest('.carousel-indicators')) return;
            longPressTimer = setTimeout(() => {
                openLightbox(currentIndex);
            }, 500); // 500ms long press
        }, { passive: true });

        gallery.addEventListener('touchend', () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        });

        gallery.addEventListener('touchmove', () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        });

        // Prevent browser drag behavior on images
        cards.forEach(card => {
            card.setAttribute('draggable', 'false');
        });
    };

    const initializeAllGalleries = () => {
        const galleries = document.querySelectorAll('.notion-collection-gallery');
        galleries.forEach(initCarousel);
    };

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (!(node instanceof HTMLElement)) continue;
                const galleries = node.matches('.notion-collection-gallery')
                    ? [node]
                    : node.querySelectorAll('.notion-collection-gallery');
                galleries.forEach(initCarousel);
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    initializeAllGalleries();
})();
