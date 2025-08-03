// AI Summarizer Pro - Welcome Page Script (FIXED)
class WelcomeController {
    constructor() {
        this.sparkleInterval = null;
        this.init();
    }

    init() {
        try {
            this.setupEventListeners();
            this.startAnimations();
            this.createSparkleEffect();
        } catch (error) {
            console.error('Welcome page initialization error:', error);
        }
    }

    setupEventListeners() {
        try {
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
        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }

    startTour() {
        try {
            // Show success message
            const ctaButton = document.getElementById('startTourBtn');
            if (ctaButton) {
                ctaButton.textContent = '✅ Extension Ready!';
                ctaButton.style.background = 'linear-gradient(45deg, #4ecdc4, #44a08d)';
            }
            
            // Show instruction
            setTimeout(() => {
                alert('🎉 AI Summarizer Pro is ready!\n\n✨ Look for the sparkle button on any webpage\n📱 Or click the extension icon in your toolbar\n🖱️ Right-click for context menu options');
            }, 500);

            // Close tab after delay
            setTimeout(() => {
                this.closeTab();
            }, 3000);
        } catch (error) {
            console.error('Error in start tour:', error);
        }
    }

    closeTab() {
        try {
            if (typeof chrome !== 'undefined' && chrome.tabs) {
                chrome.tabs.getCurrent((tab) => {
                    if (tab && chrome.tabs.remove) {
                        chrome.tabs.remove(tab.id);
                    } else {
                        window.close();
                    }
                });
            } else {
                window.close();
            }
        } catch (error) {
            console.error('Error closing tab:', error);
            try {
                window.close();
            } catch (closeError) {
                console.error('Could not close window:', closeError);
            }
        }
    }

    handleCardClick(card) {
        try {
            // Add click animation
            if (card) {
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
        } catch (error) {
            console.error('Error handling card click:', error);
        }
    }

    handleKeydown(e) {
        try {
            if (e.key === 'Enter' && e.target && e.target.classList.contains('cta-button')) {
                this.startTour();
            }
            
            // Allow Escape to close if needed
            if (e.key === 'Escape') {
                this.closeTab();
            }
        } catch (error) {
            console.error('Error handling keydown:', error);
        }
    }

    startAnimations() {
        try {
            // Animate feature cards on scroll/load
            const observerOptions = {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            };

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && entry.target) {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }
                });
            }, observerOptions);

            // Observe all feature cards
            document.querySelectorAll('.feature-card').forEach((card, index) => {
                try {
                    // Add initial hidden state
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(30px)';
                    card.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
                    
                    observer.observe(card);
                } catch (error) {
                    console.error('Error setting up card animation:', error);
                }
            });

            // Trigger animations on load
            setTimeout(() => {
                document.querySelectorAll('.feature-card').forEach(card => {
                    try {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    } catch (error) {
                        console.error('Error animating card:', error);
                    }
                });
            }, 100);
        } catch (error) {
            console.error('Error starting animations:', error);
        }
    }

    createSparkleEffect() {
        try {
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
            this.sparkleInterval = setInterval(() => {
                try {
                    this.createSparkle();
                } catch (error) {
                    console.error('Error creating sparkle:', error);
                }
            }, 2000);
            
            // Create initial sparkles
            setTimeout(() => {
                try {
                    this.createSparkle();
                } catch (error) {
                    console.error('Error creating initial sparkle:', error);
                }
            }, 1000);
        } catch (error) {
            console.error('Error setting up sparkle effect:', error);
        }
    }

    createSparkle() {
        try {
            const sparkles = ['✨', '⭐', '🌟', '💫'];
            const sparkle = document.createElement('div');
            sparkle.className = 'sparkle';
            sparkle.textContent = sparkles[Math.floor(Math.random() * sparkles.length)];
            
            const size = Math.random() * 20 + 10;
            const left = Math.random() * (window.innerWidth - 50);
            const top = Math.random() * (window.innerHeight - 50);
            
            sparkle.style.cssText = `
                position: fixed;
                font-size: ${size}px;
                pointer-events: none;
                z-index: 1000;
                animation: sparkleAnimation 3s ease-out forwards;
                left: ${left}px;
                top: ${top}px;
                user-select: none;
            `;

            document.body.appendChild(sparkle);

            // Remove sparkle after animation
            setTimeout(() => {
                try {
                    if (sparkle && sparkle.parentNode) {
                        sparkle.remove();
                    }
                } catch (error) {
                    console.error('Error removing sparkle:', error);
                }
            }, 3000);
        } catch (error) {
            console.error('Error in createSparkle:', error);
        }
    }

    // Cleanup method
    destroy() {
        try {
            if (this.sparkleInterval) {
                clearInterval(this.sparkleInterval);
                this.sparkleInterval = null;
            }
            
            // Remove any remaining sparkles
            document.querySelectorAll('.sparkle').forEach(sparkle => {
                try {
                    sparkle.remove();
                } catch (error) {
                    console.error('Error removing sparkle in cleanup:', error);
                }
            });
        } catch (error) {
            console.error('Error in destroy method:', error);
        }
    }
}

// Initialize when DOM is ready with error handling
function initializeWelcome() {
    try {
        const welcomeController = new WelcomeController();
        
        // Cleanup when page is about to unload
        window.addEventListener('beforeunload', () => {
            try {
                welcomeController.destroy();
            } catch (error) {
                console.error('Error during cleanup:', error);
            }
        });
        
        // Store reference for global access if needed
        window.welcomeController = welcomeController;
        
    } catch (error) {
        console.error('Welcome page initialization error:', error);
    }
}

// Multiple initialization methods for reliability
document.addEventListener('DOMContentLoaded', initializeWelcome);

// Fallback for already loaded DOM
if (document.readyState !== 'loading') {
    initializeWelcome();
}

// Additional safety fallback
window.addEventListener('load', () => {
    if (!window.welcomeController) {
        initializeWelcome();
    }
});