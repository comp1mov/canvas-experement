(function () {
    const initCarousel = (gallery) => {
        if (!gallery || gallery.dataset.carouselInitialized === "true") return;

        let parent = gallery.closest('.notion-callout.bg-brown-light');
        if (!parent) return;

        const cards = Array.from(gallery.querySelectorAll('.notion-collection-card'));
        if (cards.length === 0) return;

        gallery.dataset.carouselInitialized = "true";

        let currentIndex = 0;
        let autoplayTimer = null;

        // Простая настройка - только текущая карточка видна
        cards.forEach((card, i) => {
            card.classList.remove('active');
            card.style.transition = 'opacity 0.4s ease, transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            
            if (i === 0) {
                card.classList.add('active');
                card.style.opacity = '1';
                card.style.pointerEvents = 'auto';
                card.style.zIndex = '1';
                card.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) scale(1)';
            } else {
                card.style.opacity = '0';
                card.style.pointerEvents = 'none';
                card.style.zIndex = '0';
            }
        });

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
                
                if (isActive) {
                    card.style.opacity = '1';
                    card.style.pointerEvents = 'auto';
                    card.style.zIndex = '1';
                    // Сброс трансформации при переключении
                    card.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) scale(1)';
                } else {
                    card.style.opacity = '0';
                    card.style.pointerEvents = 'none';
                    card.style.zIndex = '0';
                }
            });

            indicators.querySelectorAll('span').forEach((dot, i) => {
                dot.classList.toggle('active', i === currentIndex);
            });
        };

        const goToPrev = () => {
            currentIndex = (currentIndex - 1 + cards.length) % cards.length;
            updateCarousel();
            resetAutoplay();
        };

        const goToNext = () => {
            currentIndex = (currentIndex + 1) % cards.length;
            updateCarousel();
            resetAutoplay();
        };

        gallery.carouselNav = { goToPrev, goToNext };

        // ===== AUTOPLAY FUNCTIONALITY =====
        const startAutoplay = () => {
            if (cards.length <= 1) return; // Не запускаем для одной карточки
            
            autoplayTimer = setInterval(() => {
                goToNext();
            }, 30000); // 30 секунд
        };

        const stopAutoplay = () => {
            if (autoplayTimer) {
                clearInterval(autoplayTimer);
                autoplayTimer = null;
            }
        };

        const resetAutoplay = () => {
            stopAutoplay();
            startAutoplay();
        };

        // Останавливаем autoplay при взаимодействии и возобновляем после паузы
        let interactionTimeout = null;
        
        const pauseAutoplay = () => {
            stopAutoplay();
            if (interactionTimeout) clearTimeout(interactionTimeout);
            // Возобновляем через 5 секунд после последнего взаимодействия
            interactionTimeout = setTimeout(() => {
                startAutoplay();
            }, 5000);
        };

        // Запускаем autoplay
        startAutoplay();
        // ===== END AUTOPLAY FUNCTIONALITY =====

        // ===== FISHEYE EFFECT ON HOVER (Desktop) =====
        if (window.innerWidth > 768) {
            let isMouseInside = false;

            gallery.addEventListener('mouseenter', () => {
                isMouseInside = true;
                pauseAutoplay();
            });

            gallery.addEventListener('mousemove', (e) => {
                if (!isMouseInside) return;
                
                const activeCard = cards[currentIndex];
                if (!activeCard) return;

                const rect = gallery.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;

                const centerX = 0.5;
                const centerY = 0.5;
                const distX = (x - centerX) * 2;
                const distY = (y - centerY) * 2;

                const perspectiveX = distX * 8;
                const perspectiveY = distY * -8;
                const scale = 1 + (Math.abs(distX) + Math.abs(distY)) * 0.02;

                // Быстрый отклик при движении мыши
                activeCard.style.transition = 'transform 0.15s ease-out';
                activeCard.style.transform = `
                    perspective(1000px) 
                    rotateY(${perspectiveX}deg) 
                    rotateX(${perspectiveY}deg) 
                    scale(${scale})
                `;
            });

            gallery.addEventListener('mouseleave', () => {
                isMouseInside = false;
                const activeCard = cards[currentIndex];
                if (activeCard) {
                    // ПЛАВНЫЙ сброс при выходе мыши
                    activeCard.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                    activeCard.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) scale(1)';
                }
                pauseAutoplay();
            });
        }
        // ===== END FISHEYE EFFECT =====

        // ===== MOBILE SWIPE FEEDBACK EFFECT =====
        let swipeFeedbackTimeout = null;
        
        const triggerSwipeFeedback = (direction) => {
            const activeCard = cards[currentIndex];
            if (!activeCard) return;

            // Очищаем предыдущий таймаут
            if (swipeFeedbackTimeout) {
                clearTimeout(swipeFeedbackTimeout);
            }

            // Легкий наклон в направлении свайпа
            const tiltAngle = direction === 'left' ? -6 : 6;
            activeCard.style.transition = 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
            activeCard.style.transform = `perspective(1000px) rotateY(${tiltAngle}deg) rotateX(0deg) scale(1.02)`;

            // Плавный возврат к нулевой позиции
            swipeFeedbackTimeout = setTimeout(() => {
                activeCard.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                activeCard.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) scale(1)';
            }, 200);
        };

        gallery.swipeFeedback = triggerSwipeFeedback;
        // ===== END MOBILE SWIPE FEEDBACK =====

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
            stopAutoplay(); // Останавливаем autoplay в lightbox
            
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
                resetAutoplay(); // Возобновляем autoplay после закрытия
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
            pauseAutoplay();
        });

        rightBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            goToNext();
            pauseAutoplay();
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
                    pauseAutoplay();
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

    // ===== CLOSEST GALLERY SWIPE FOR MOBILE (Вариант B) =====
    if (window.innerWidth <= 768) {
        let swipeStartX = 0;
        let swipeStartY = 0;
        let swipeStartTime = 0;
        let activeGallery = null;
        let isSwipingCarousel = false;

        const findClosestGallery = (touchX, touchY) => {
            const galleries = document.querySelectorAll('.notion-callout.bg-brown-light .notion-collection-gallery[data-carousel-initialized="true"]');
            if (galleries.length === 0) return null;
            if (galleries.length === 1) return galleries[0];

            let closest = null;
            let minDistance = Infinity;

            galleries.forEach(gallery => {
                const rect = gallery.getBoundingClientRect();
                
                if (touchX >= rect.left && touchX <= rect.right &&
                    touchY >= rect.top && touchY <= rect.bottom) {
                    closest = gallery;
                    minDistance = 0;
                    return;
                }

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

            return minDistance < window.innerHeight * 0.8 ? closest : null;
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
                    // Определяем направление для feedback эффекта
                    const direction = diffX > 0 ? 'right' : 'left';
                    
                    if (diffX > 0) {
                        activeGallery.carouselNav.goToPrev();
                    } else {
                        activeGallery.carouselNav.goToNext();
                    }
                    
                    // Триггерим feedback эффект ПОСЛЕ переключения
                    if (activeGallery.swipeFeedback) {
                        setTimeout(() => {
                            activeGallery.swipeFeedback(direction);
                        }, 50);
                    }
                }
            }
            
            activeGallery = null;
            isSwipingCarousel = false;
        });
    }
    // ===== END CLOSEST GALLERY SWIPE =====
})();
