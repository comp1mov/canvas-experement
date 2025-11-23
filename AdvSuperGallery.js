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

        // Настройка карточек
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

        // Autoplay
        const startAutoplay = () => {
            if (cards.length <= 1) return;
            if (autoplayTimer) clearInterval(autoplayTimer);
            autoplayTimer = setInterval(() => {
                goToNext();
            }, 30000);
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

        let interactionTimeout = null;
        const pauseAutoplay = () => {
            stopAutoplay();
            if (interactionTimeout) clearTimeout(interactionTimeout);
            interactionTimeout = setTimeout(() => {
                startAutoplay();
            }, 5000);
        };

        startAutoplay();

        // Fisheye на desktop - простое затухание от центра к краям
        if (window.innerWidth > 768) {
            let isMouseInside = false;
            let animationFrameId = null;

            gallery.addEventListener('mouseenter', () => {
                isMouseInside = true;
                pauseAutoplay();
            });

            gallery.addEventListener('mousemove', (e) => {
                if (!isMouseInside) return;
                
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                }

                animationFrameId = requestAnimationFrame(() => {
                    const activeCard = cards[currentIndex];
                    if (!activeCard) return;

                    const rect = gallery.getBoundingClientRect();
                    const x = (e.clientX - rect.left) / rect.width; // 0-1
                    const y = (e.clientY - rect.top) / rect.height; // 0-1

                    const centerX = 0.5;
                    const centerY = 0.5;
                    
                    // Расстояние от центра (0 в центре, 1 на краях)
                    const distX = (x - centerX) * 2; // -1 to 1
                    const distY = (y - centerY) * 2; // -1 to 1
                    const distanceFromCenter = Math.sqrt(distX * distX + distY * distY); // 0 до ~1.4

                    // ПРОСТОЕ ЗАТУХАНИЕ: сила = 100% в центре, 0% на краях
                    // Нормализуем расстояние: 0 (центр) до 1 (край)
                    const normalizedDistance = Math.min(distanceFromCenter / 1.0, 1.0);
                    
                    // Инвертируем: 1 в центре, 0 на краях
                    const effectStrength = 1.0 - normalizedDistance;
                    
                    // Применяем плавную кривую для более естественного затухания
                    const smoothStrength = Math.pow(effectStrength, 0.7);

                    // Применяем эффект
                    const maxRotation = 10; // максимальный угол поворота в центре
                    const perspectiveX = distX * maxRotation * smoothStrength;
                    const perspectiveY = distY * -maxRotation * smoothStrength;
                    const scale = 1 + (0.03 * smoothStrength);

                    activeCard.style.transition = 'transform 0.1s ease-out';
                    activeCard.style.transform = `
                        perspective(1000px) 
                        rotateY(${perspectiveX}deg) 
                        rotateX(${perspectiveY}deg) 
                        scale(${scale})
                    `;
                });
            });

            gallery.addEventListener('mouseleave', () => {
                isMouseInside = false;
                
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                    animationFrameId = null;
                }
                
                const activeCard = cards[currentIndex];
                if (activeCard) {
                    // ПЛАВНЫЙ СБРОС при выходе мыши
                    activeCard.style.transition = 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    activeCard.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) scale(1)';
                }
                pauseAutoplay();
            });
        }

        // Mobile swipe feedback
        let swipeFeedbackTimeout = null;
        const triggerSwipeFeedback = (direction) => {
            const activeCard = cards[currentIndex];
            if (!activeCard) return;

            if (swipeFeedbackTimeout) clearTimeout(swipeFeedbackTimeout);

            const tiltAngle = direction === 'left' ? -6 : 6;
            activeCard.style.transition = 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
            activeCard.style.transform = `perspective(1000px) rotateY(${tiltAngle}deg) rotateX(0deg) scale(1.02)`;

            swipeFeedbackTimeout = setTimeout(() => {
                activeCard.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                activeCard.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) scale(1)';
            }, 200);
        };

        gallery.swipeFeedback = triggerSwipeFeedback;

        // Lightbox
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
        let currentLightboxIndex = 0;

        const openLightbox = (index) => {
            stopAutoplay();
            
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
                
                document.addEventListener('keydown', (e) => {
                    if (!lightbox.classList.contains('active')) return;
                    if (e.key === 'Escape') closeLightbox();
                    if (e.key === 'ArrowLeft') showLightboxImage((currentLightboxIndex - 1 + cards.length) % cards.length);
                    if (e.key === 'ArrowRight') showLightboxImage((currentLightboxIndex + 1) % cards.length);
                });
                
                const lightboxContent = lightbox.querySelector('.lightbox-content');
                let lightboxStartX = 0;
                
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
                resetAutoplay();
            }
        };

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

        // Click на половинки (desktop)
        if (window.innerWidth > 768) {
            let clickStartX = 0;
            let clickStartTime = 0;

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
                
                if (movedDistance < 10 && timeDiff < 300) {
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

        // Long press для lightbox (mobile)
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

    // Mobile swipe (Вариант B - ближайшая галерея)
    if (window.innerWidth <= 768) {
        let swipeStartX = 0;
        let swipeStartY = 0;
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
            const diffX = swipeEndX - swipeStartX;
            
            if (Math.abs(diffX) > 30) {
                if (activeGallery.carouselNav) {
                    const direction = diffX > 0 ? 'right' : 'left';
                    
                    if (diffX > 0) {
                        activeGallery.carouselNav.goToPrev();
                    } else {
                        activeGallery.carouselNav.goToNext();
                    }
                    
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
})();
