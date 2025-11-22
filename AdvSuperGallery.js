(function () {
    const initCarousel = (gallery) => {
        if (!gallery || gallery.dataset.carouselInitialized === "true") return;

        let parent = gallery.closest('.notion-callout.bg-brown-light');
        if (!parent) return;

        const cards = Array.from(gallery.querySelectorAll('.notion-collection-card'));
        if (cards.length === 0) return;

        gallery.dataset.carouselInitialized = "true";

        let currentIndex = 0;

        // ===== PEEK EFFECT SETUP =====
        // Определяем стиль отображения: с peek эффектом или обычный
        const usePeekEffect = true; // Можно сделать опциональным через data-атрибут

        if (usePeekEffect) {
            // Настройка для peek эффекта
            gallery.style.overflow = 'visible';
            gallery.style.display = 'flex';
            gallery.style.alignItems = 'center';
            gallery.style.justifyContent = 'center';
            
            cards.forEach((card, i) => {
                card.classList.remove('active');
                card.style.position = 'absolute';
                card.style.top = '0';
                card.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
                card.style.pointerEvents = 'none';
                
                if (i === 0) {
                    card.classList.add('active');
                    card.style.left = '50%';
                    card.style.transform = 'translateX(-50%) scale(1)';
                    card.style.opacity = '1';
                    card.style.zIndex = '2';
                    card.style.filter = 'blur(0px)';
                } else if (i === 1) {
                    // Следующий кадр справа
                    card.style.left = '50%';
                    card.style.transform = 'translateX(65%)';
                    card.style.opacity = '0.35';
                    card.style.zIndex = '1';
                    card.style.filter = 'blur(2px)';
                } else {
                    // Все остальные скрыты
                    card.style.left = '50%';
                    card.style.transform = 'translateX(200%)';
                    card.style.opacity = '0';
                    card.style.zIndex = '0';
                    card.style.filter = 'blur(5px)';
                }
            });
        } else {
            // Обычный режим (без peek)
            cards.forEach((card, i) => {
                card.classList.remove('active');
                card.style.display = i === 0 ? '' : 'none';
            });
            cards[0].classList.add('active');
        }

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
            if (usePeekEffect) {
                // Peek режим - показываем предыдущий, текущий и следующий
                cards.forEach((card, i) => {
                    card.classList.remove('active');
                    
                    const prevIndex = (currentIndex - 1 + cards.length) % cards.length;
                    const nextIndex = (currentIndex + 1) % cards.length;
                    
                    if (i === currentIndex) {
                        // Текущий кадр
                        card.classList.add('active');
                        card.style.left = '50%';
                        card.style.transform = 'translateX(-50%) scale(1)';
                        card.style.opacity = '1';
                        card.style.zIndex = '2';
                        card.style.filter = 'blur(0px)';
                    } else if (i === prevIndex) {
                        // Предыдущий кадр слева
                        card.style.left = '50%';
                        card.style.transform = 'translateX(-165%)';
                        card.style.opacity = '0.35';
                        card.style.zIndex = '1';
                        card.style.filter = 'blur(2px)';
                    } else if (i === nextIndex) {
                        // Следующий кадр справа
                        card.style.left = '50%';
                        card.style.transform = 'translateX(65%)';
                        card.style.opacity = '0.35';
                        card.style.zIndex = '1';
                        card.style.filter = 'blur(2px)';
                    } else {
                        // Все остальные скрыты
                        card.style.left = '50%';
                        card.style.transform = 'translateX(200%)';
                        card.style.opacity = '0';
                        card.style.zIndex = '0';
                        card.style.filter = 'blur(5px)';
                    }
                });
            } else {
                // Обычный режим
                cards.forEach((card, i) => {
                    const isActive = i === currentIndex;
                    card.classList.toggle('active', isActive);
                    card.style.display = isActive ? '' : 'none';
                });
            }

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

        gallery.carouselNav = { goToPrev, goToNext };

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
                
                lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
                lightbox.querySelector('.lightbox-overlay').addEventListener('click', closeLightbox);
                
                lightbox.querySelector('.lightbox-prev').addEventListener('click', (e) => {
                    e.stopPropagation();
                    showLightboxImage((currentLightboxIndex - 1 + cards.length) % cards.length);
                });
                
                lightbox.querySelector('.lightbox-next').addEventListener('click', (e) => {
                    e.stopPropagation();
                    showLightboxImage((currentLightboxIndex + 1) % cards.length);
                });
                
                const handleKeydown = (e) => {
                    if (!lightbox.classList.contains('active')) return;
                    if (e.key === 'Escape') closeLightbox();
                    if (e.key === 'ArrowLeft') showLightboxImage((currentLightboxIndex - 1 + cards.length) % cards.length);
                    if (e.key === 'ArrowRight') showLightboxImage((currentLightboxIndex + 1) % cards.length);
                };
                document.addEventListener('keydown', handleKeydown);
                
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

        // ===== CLICK ON HALVES (Desktop only) =====
        let clickStartX = 0;
        let clickStartTime = 0;
        const CLICK_THRESHOLD = 10;
        const TIME_THRESHOLD = 300;

        if (window.innerWidth > 768) {
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
                
                if (movedDistance < CLICK_THRESHOLD && timeDiff < TIME_THRESHOLD) {
                    const rect = gallery.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const halfWidth = rect.width / 2;
                    
                    if (e.detail === 2) {
                        openLightbox(currentIndex);
                        return;
                    }
                    
                    if (clickX < halfWidth) {
                        goToPrev();
                    } else {
                        goToNext();
                    }
                }
            });
        }
        // ===== END CLICK ON HALVES =====

        // Long press for lightbox on mobile
        let longPressTimer = null;
        gallery.addEventListener('touchstart', (e) => {
            if (e.target.closest('.carousel-button') || e.target.closest('.carousel-indicators')) return;
            longPressTimer = setTimeout(() => {
                openLightbox(currentIndex);
            }, 500);
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

    // ===== IMPROVED MULTI-GALLERY SWIPE FOR MOBILE =====
    if (window.innerWidth <= 768) {
        let swipeStartX = 0;
        let swipeStartY = 0;
        let swipeStartTime = 0;
        let activeGallery = null;
        let isSwipingCarousel = false;

        // Функция для поиска ближайшей галереи к точке касания
        const findClosestGallery = (touchX, touchY) => {
            const galleries = document.querySelectorAll('.notion-callout.bg-brown-light .notion-collection-gallery[data-carousel-initialized="true"]');
            if (galleries.length === 0) return null;
            if (galleries.length === 1) return galleries[0];

            let closest = null;
            let minDistance = Infinity;

            galleries.forEach(gallery => {
                const rect = gallery.getBoundingClientRect();
                // Проверяем, находится ли точка касания внутри галереи
                if (touchX >= rect.left && touchX <= rect.right &&
                    touchY >= rect.top && touchY <= rect.bottom) {
                    return closest = gallery;
                }

                // Если не внутри, считаем расстояние до центра галереи
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const distance = Math.sqrt(
                    Math.pow(touchX - centerX, 2) + 
                    Math.pow(touchY - centerY, 2)
                );

                if (distance < minDistance) {
                    minDistance = distance;
                    closest = gallery;
                }
            });

            // Возвращаем галерею только если она достаточно близко (в пределах экрана)
            return minDistance < window.innerHeight ? closest : null;
        };

        document.addEventListener('touchstart', (e) => {
            if (e.target.closest('.carousel-button') || e.target.closest('.carousel-indicators')) return;
            
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;
            
            activeGallery = findClosestGallery(touchX, touchY);
            
            if (activeGallery) {
                swipeStartX = touchX;
                swipeStartY = touchY;
                swipeStartTime = Date.now();
                isSwipingCarousel = false;
            }
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!activeGallery) return;
            
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const diffX = Math.abs(currentX - swipeStartX);
            const diffY = Math.abs(currentY - swipeStartY);
            
            // Определяем, что это горизонтальный свайп
            if (diffX > 15 && diffX > diffY * 1.5) {
                isSwipingCarousel = true;
                e.preventDefault();
            }
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            if (!activeGallery || !isSwipingCarousel) {
                activeGallery = null;
                isSwipingCarousel = false;
                return;
            }
            
            const swipeEndX = e.changedTouches[0].clientX;
            const swipeEndTime = Date.now();
            const diffX = swipeEndX - swipeStartX;
            const timeDiff = swipeEndTime - swipeStartTime;
            
            const minSwipeDistance = 30;
            const maxSwipeTime = 500;
            
            if (Math.abs(diffX) > minSwipeDistance && timeDiff < maxSwipeTime) {
                if (activeGallery.carouselNav) {
                    if (diffX > 0) {
                        activeGallery.carouselNav.goToPrev();
                    } else {
                        activeGallery.carouselNav.goToNext();
                    }
                }
            }
            
            activeGallery = null;
            isSwipingCarousel = false;
        });
    }
    // ===== END IMPROVED MULTI-GALLERY SWIPE =====
})();
