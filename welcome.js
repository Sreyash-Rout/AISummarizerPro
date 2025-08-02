// AI Summarizer Pro - Welcome Page Script
class WelcomeController {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.startAnimations();
        this.createSparkleEffect();
    }

    setupEventListeners() {
        // CTA button
        const ctaButton = document.getElementById('startTourBtn');
        if (ctaButton) {
            ctaButton.addEventListener('click', () => this.startTour());
        }

        // Feature card interactions
        document.querySelectorAll('.feature-card').forEach(card => {
            card.addEventListener('click', () => this.handleCardClick(card));
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
    }

    startTour() {
        // Show success message
        const ctaButton = document.getElementById('startTourBtn');
        ctaButton.textContent = '✅ Extension Ready!';
        ctaButton.style.background = 'linear-gradient(45deg, #4ecdc4, #44a08d)';
        
        // Show instruction
        setTimeout(() => {
            alert('🎉 AI Summarizer Pro is ready!\n\n✨ Look for the sparkle button on any webpage\n📱 Or click the extension icon in your toolbar\n🖱️ Right-click for context menu options');
        }, 500);

        // Close tab after delay
        setTimeout(() => {
            if (typeof chrome !== 'undefined' && chrome.tabs) {
                chrome.tabs.getCurrent((tab) => {
                    if (tab) {
                        chrome.tabs.remove(tab.id);
                    }
                });
            } else {
                window.close();
            }
        }, 3000);
    }

    handleCardClick(card) {
        // Add click animation
        card.style.transform = 'scale(0.95)';
        setTimeout(() => {
            card.style.transform = '';
        }, 150);

        // Add temporary highlight
        const originalBg = card.style.background;
        card.style.background = 'rgba(255,255,255,0.2)';
        setTimeout(() => {
            card.style.background = originalBg;
        }, 300);
    }

    handleKeydown(e) {
        if (e.key === 'Enter' && e.target.classList.contains('cta-button')) {
            this.startTour();
        }
        
        // Allow Escape to close if needed
        if (e.key === 'Escape') {
            if (typeof chrome !== 'undefined' && chrome.tabs) {
                chrome.tabs.getCurrent((tab) => {
                    if (tab) {
                        chrome.tabs.remove(tab.id);
                    }
                });
            }
        }
    }

    startAnimations() {
        // Animate feature cards on scroll/load
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Observe all feature cards
        document.querySelectorAll('.feature-card').forEach((card, index) => {
            // Add initial hidden state
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            card.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
            
            observer.observe(card);
        });

        // Trigger animations on load
        setTimeout(() => {
            document.querySelectorAll('.feature-card').forEach(card => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            });
        }, 100);
    }

    createSparkleEffect() {
        // Add sparkle animation styles if not already present
        if (!document.querySelector('#sparkle-styles')) {
            const style = document.createElement('style');
            style.id = 'sparkle-styles';
            style.textContent = `
                @keyframes sparkleAnimation {
                    0% {
                        opacity: 0;
                        transform: scale(0) rotate(0deg);
                    }
                    50% {
                        opacity: 1;
                        transform: scale(1) rotate(180deg);
                    }
                    100% {
                        opacity: 0;
                        transform: scale(0) rotate(360deg);
                    }
                }
                
                .sparkle {
                    position: fixed;
                    pointer-events: none;
                    z-index: 1000;
                    font-size: 12px;
                }
            `;
            document.head.appendChild(style);
        }

        // Create sparkles periodically
        this.sparkleInterval = setInterval(() => this.createSparkle(), 2000);
        
        // Create initial sparkles
        setTimeout(() => this.createSparkle(), 1000);
    }

    createSparkle() {
        const sparkles = ['✨', '⭐', '🌟', '💫'];
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        sparkle.textContent = sparkles[Math.floor(Math.random() * sparkles.length)];
        
        const size = Math.random() * 20 + 10;
        sparkle.style.cssText = `
            position: fixed;
            font-size: ${size}px;
            pointer-events: none;
            z-index: 1000;
            animation: sparkleAnimation 3s ease-out forwards;
            left: ${Math.random() * (window.innerWidth - 50)}px;
            top: ${Math.random() * (window.innerHeight - 50)}px;
            user-select: none;
        `;

        document.body.appendChild(sparkle);

        // Remove sparkle after animation
        setTimeout(() => {
            if (sparkle.parentNode) {
                sparkle.remove();
            }
        }, 3000);
    }

    // Cleanup method
    destroy() {
        if (this.sparkleInterval) {
            clearInterval(this.sparkleInterval);
        }
        
        // Remove any remaining sparkles
        document.querySelectorAll('.sparkle').forEach(sparkle => {
            sparkle.remove();
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        const welcomeController = new WelcomeController();
        
        // Cleanup when page is about to unload
        window.addEventListener('beforeunload', () => {
            welcomeController.destroy();
        });
        
    } catch (error) {
        console.error('Welcome page initialization error:', error);
    }
});

// Fallback for already loaded DOM
if (document.readyState !== 'loading') {
    try {
        const welcomeController = new WelcomeController();
        
        window.addEventListener('beforeunload', () => {
            welcomeController.destroy();
        });
        
    } catch (error) {
        console.error('Welcome page initialization error:', error);
    }
}