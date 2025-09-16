/* ========================================
   ENHANCED GIFT TRACKER OVERLAY
   Multiple Styles & Advanced Animations
   ======================================== */

class GiftTrackerOverlay {
    constructor() {
        this.queryParams = new URLSearchParams(location.search);
        this.groupId = this.queryParams.get('id');
        this.password = this.queryParams.get('pw') || '';
        this.style = this.queryParams.get('style') || 'classic';
        this.theme = this.queryParams.get('theme') || 'dark';
        this.animation = this.queryParams.get('animation') || 'normal';

        this.target = 1;
        this.current = 0;
        this.lastValue = 0;
        this.percentage = 0;

        this.socket = null;
        this.particles = [];
        this.animationFrame = null;

        this.init();
    }

    init() {
        this.setupDOM();
        this.setupSocket();
        this.setupEventListeners();
        this.applyTheme();
        this.startAnimationLoop();
    }

    setupDOM() {
        // Create main container
        this.container = document.createElement('div');
        this.container.className = `overlay-${this.style} theme-${this.theme}`;
        this.container.id = 'gift-tracker-overlay';

        // Create overlay content based on style
        this.createOverlayContent();

        // Add to body
        document.body.appendChild(this.container);

        // Set up responsive behavior
        this.setupResponsive();
    }

    createOverlayContent() {
        switch (this.style) {
            case 'classic':
                this.createClassicOverlay();
                break;
            case 'circular':
                this.createCircularOverlay();
                break;
            case 'dashboard':
                this.createDashboardOverlay();
                break;
            case 'bubbles':
                this.createBubblesOverlay();
                break;
            case 'minimalist':
                this.createMinimalistOverlay();
                break;
            case 'showcase':
                this.createShowcaseOverlay();
                break;
            default:
                this.createClassicOverlay();
        }
    }

    createClassicOverlay() {
        this.container.innerHTML = `
            <div class="progress-fill" id="progress-fill"></div>
            <div class="progress-text" id="progress-text">0</div>
        `;

        this.progressFill = this.container.querySelector('#progress-fill');
        this.progressText = this.container.querySelector('#progress-text');
    }

    createCircularOverlay() {
        this.container.innerHTML = `
            <svg class="progress-ring" viewBox="0 0 100 100">
                <circle class="progress-ring-circle" cx="50" cy="50" r="45" />
            </svg>
            <div class="progress-text" id="progress-text">0</div>
        `;

        this.progressCircle = this.container.querySelector('.progress-ring-circle');
        this.progressText = this.container.querySelector('#progress-text');

        // Calculate circumference
        const radius = 45;
        this.circumference = 2 * Math.PI * radius;
        this.progressCircle.style.strokeDasharray = this.circumference;
    }

    createDashboardOverlay() {
        this.container.innerHTML = `
            <div class="dashboard-header">
                <div class="dashboard-title">Gift Progress</div>
                <div class="dashboard-percentage" id="dashboard-percentage">0%</div>
            </div>
            <div class="dashboard-progress">
                <div class="dashboard-fill" id="dashboard-fill"></div>
            </div>
            <div class="dashboard-footer">
                <div class="dashboard-current" id="dashboard-current">0</div>
                <div class="dashboard-target" id="dashboard-target">/ 0</div>
            </div>
        `;

        this.dashboardFill = this.container.querySelector('#dashboard-fill');
        this.dashboardCurrent = this.container.querySelector('#dashboard-current');
        this.dashboardTarget = this.container.querySelector('#dashboard-target');
        this.dashboardPercentage = this.container.querySelector('#dashboard-percentage');
    }

    createBubblesOverlay() {
        this.container.innerHTML = '';

        // Create 16 bubbles (4x4 grid)
        for (let i = 0; i < 16; i++) {
            const bubble = document.createElement('div');
            bubble.className = 'bubble';
            bubble.dataset.index = i;
            this.container.appendChild(bubble);
        }

        this.bubbles = this.container.querySelectorAll('.bubble');
    }

    createMinimalistOverlay() {
        this.container.innerHTML = `
            <div class="minimalist-current" id="minimalist-current">0</div>
            <div class="minimalist-separator">/</div>
            <div class="minimalist-target" id="minimalist-target">0</div>
            <div class="minimalist-progress">
                <div class="minimalist-fill" id="minimalist-fill"></div>
            </div>
        `;

        this.minimalistCurrent = this.container.querySelector('#minimalist-current');
        this.minimalistTarget = this.container.querySelector('#minimalist-target');
        this.minimalistFill = this.container.querySelector('#minimalist-fill');
    }

    createShowcaseOverlay() {
        this.container.innerHTML = `
            <div class="showcase-icon">🎁</div>
            <div class="showcase-content">
                <div class="showcase-title">Gift Progress</div>
                <div class="showcase-progress">
                    <div class="showcase-fill" id="showcase-fill"></div>
                </div>
                <div class="showcase-stats">
                    <div class="showcase-current" id="showcase-current">0</div>
                    <div class="showcase-percentage" id="showcase-percentage">0%</div>
                </div>
            </div>
        `;

        this.showcaseFill = this.container.querySelector('#showcase-fill');
        this.showcaseCurrent = this.container.querySelector('#showcase-current');
        this.showcasePercentage = this.container.querySelector('#showcase-percentage');
    }

    setupSocket() {
        this.socket = io();

        this.socket.on('update', (data) => {
            this.handleUpdate(data);
        });

        this.socket.on('giftStream', (data) => {
            this.handleGiftEvent(data);
        });
    }

    handleUpdate(data) {
        this.target = data.target || this.target;

        const group = data.groups[this.groupId];
        if (!group) return;

        const counter = data.counters[this.groupId] || { diamonds: 0 };
        this.current = counter.diamonds;
        this.percentage = Math.min(100, (this.current / this.target) * 100);

        // Set color if not already set
        if (!document.documentElement.style.getPropertyValue('--c')) {
            document.documentElement.style.setProperty('--c', group.color);
            this.updateColors(group.color);
        }

        this.updateDisplay();

        // Trigger animations if value increased
        if (this.current > this.lastValue) {
            this.triggerAnimations();
        }

        this.lastValue = this.current;
    }

    handleGiftEvent(giftData) {
        // Create particle effects for gift events
        if (this.animation !== 'none') {
            this.createParticles(giftData);
        }
    }

    updateDisplay() {
        switch (this.style) {
            case 'classic':
                this.updateClassicDisplay();
                break;
            case 'circular':
                this.updateCircularDisplay();
                break;
            case 'dashboard':
                this.updateDashboardDisplay();
                break;
            case 'bubbles':
                this.updateBubblesDisplay();
                break;
            case 'minimalist':
                this.updateMinimalistDisplay();
                break;
            case 'showcase':
                this.updateShowcaseDisplay();
                break;
        }
    }

    updateClassicDisplay() {
        this.progressFill.style.width = this.percentage + '%';
        this.progressText.textContent = this.current;
    }

    updateCircularDisplay() {
        const offset = this.circumference - (this.percentage / 100) * this.circumference;
        this.progressCircle.style.strokeDashoffset = offset;
        this.progressText.textContent = this.current;
    }

    updateDashboardDisplay() {
        this.dashboardFill.style.width = this.percentage + '%';
        this.dashboardCurrent.textContent = this.current;
        this.dashboardTarget.textContent = `/ ${this.target}`;
        this.dashboardPercentage.textContent = Math.round(this.percentage) + '%';
    }

    updateBubblesDisplay() {
        const activeBubbles = Math.floor((this.percentage / 100) * this.bubbles.length);

        this.bubbles.forEach((bubble, index) => {
            if (index < activeBubbles) {
                bubble.classList.add('active');
                bubble.textContent = Math.floor(this.current / activeBubbles);
            } else {
                bubble.classList.remove('active');
                bubble.textContent = '';
            }
        });
    }

    updateMinimalistDisplay() {
        this.minimalistCurrent.textContent = this.current;
        this.minimalistTarget.textContent = this.target;
        this.minimalistFill.style.width = this.percentage + '%';
    }

    updateShowcaseDisplay() {
        this.showcaseFill.style.width = this.percentage + '%';
        this.showcaseCurrent.textContent = this.current;
        this.showcasePercentage.textContent = Math.round(this.percentage) + '%';
    }

    triggerAnimations() {
        const elements = this.getAnimatedElements();

        elements.forEach(element => {
            // Flash animation
            if (this.animation === 'flash' || this.animation === 'normal') {
                element.classList.remove('flash');
                void element.offsetWidth; // Force reflow
                element.classList.add('flash');
            }

            // Bounce animation
            if (this.animation === 'bounce') {
                element.classList.remove('bounce');
                void element.offsetWidth;
                element.classList.add('bounce');
            }

            // Shake animation
            if (this.animation === 'shake') {
                element.classList.remove('shake');
                void element.offsetWidth;
                element.classList.add('shake');
            }
        });

        // Glow effect for milestones
        if (this.percentage >= 100) {
            this.container.classList.add('glow');
        } else {
            this.container.classList.remove('glow');
        }
    }

    getAnimatedElements() {
        switch (this.style) {
            case 'classic':
                return [this.progressText];
            case 'circular':
                return [this.progressText];
            case 'dashboard':
                return [this.dashboardCurrent];
            case 'bubbles':
                return Array.from(this.bubbles);
            case 'minimalist':
                return [this.minimalistCurrent];
            case 'showcase':
                return [this.showcaseCurrent, this.container.querySelector('.showcase-icon')];
            default:
                return [];
        }
    }

    createParticles(giftData) {
        const particleCount = Math.min(10, Math.max(3, Math.floor(giftData.diamondCount / 100)));

        for (let i = 0; i < particleCount; i++) {
            setTimeout(() => {
                this.createParticle();
            }, i * 50);
        }
    }

    createParticle() {
        const particle = document.createElement('div');
        particle.className = 'particle';

        // Random position
        const x = Math.random() * this.container.offsetWidth;
        const y = this.container.offsetHeight;

        particle.style.left = x + 'px';
        particle.style.top = y + 'px';

        this.container.appendChild(particle);

        // Remove after animation
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 2000);
    }

    updateColors(color) {
        // Update CSS custom properties
        document.documentElement.style.setProperty('--primary-color', color);

        // Update any hardcoded colors in the current style
        const elements = this.container.querySelectorAll('[style*="color"]');
        elements.forEach(element => {
            if (element.style.color && element.style.color.includes('var(--primary-color)')) {
                element.style.color = color;
            }
        });
    }

    applyTheme() {
        // Theme is applied via CSS class
        this.container.className = `overlay-${this.style} theme-${this.theme}`;
    }

    setupResponsive() {
        const updateSize = () => {
            // Adjust sizes based on viewport
            const vw = window.innerWidth;
            const vh = window.innerHeight;

            if (vw < 768) {
                this.container.style.transform = 'scale(0.8)';
            } else if (vw < 1024) {
                this.container.style.transform = 'scale(0.9)';
            } else {
                this.container.style.transform = 'scale(1)';
            }
        };

        window.addEventListener('resize', updateSize);
        updateSize();
    }

    setupEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.setupResponsive();
        });

        // Handle visibility change (for performance)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseAnimations();
            } else {
                this.resumeAnimations();
            }
        });
    }

    startAnimationLoop() {
        const animate = () => {
            this.updateParticles();
            this.animationFrame = requestAnimationFrame(animate);
        };
        animate();
    }

    updateParticles() {
        // Update particle positions and remove expired ones
        const particles = this.container.querySelectorAll('.particle');
        particles.forEach(particle => {
            const currentTop = parseFloat(particle.style.top);
            particle.style.top = (currentTop - 2) + 'px';

            if (currentTop < -50) {
                particle.remove();
            }
        });
    }

    pauseAnimations() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    resumeAnimations() {
        if (!this.animationFrame) {
            this.startAnimationLoop();
        }
    }
}

// Initialize overlay when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new GiftTrackerOverlay();
});

// Export for potential external use
window.GiftTrackerOverlay = GiftTrackerOverlay;
