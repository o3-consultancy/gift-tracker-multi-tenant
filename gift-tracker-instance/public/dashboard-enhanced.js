/* ========================================
   ENHANCED GIFT TRACKER DASHBOARD
   Advanced UI with Analytics & Real-time Charts
   ======================================== */

class EnhancedGiftTrackerDashboard {
    constructor() {
        this.socket = null;
        this.data = {
            groups: {},
            counters: {},
            target: 10000,
            totalGifts: 0,
            totalDiamonds: 0,
            viewers: 0,
            uniqueViewers: 0,
            giftCatalog: [],
            recentGifts: []
        };

        this.selectedOverlayStyle = 'classic';
        this.selectedTheme = 'dark';
        this.selectedAnimation = 'normal';

        this.giftsChart = null;
        this.chartData = {
            labels: [],
            datasets: [{
                label: 'Gifts per Minute',
                data: [],
                borderColor: '#4ecdc4',
                backgroundColor: 'rgba(78, 205, 196, 0.2)',
                tension: 0.4
            }]
        };

        this.init();
    }

    init() {
        this.setupSocket();
        this.setupEventListeners();
        this.initializeChart();
        this.loadData();
    }

    setupSocket() {
        this.socket = io();

        this.socket.on('update', (data) => {
            this.handleUpdate(data);
        });

        this.socket.on('giftStream', (data) => {
            this.handleGiftStream(data);
        });

        this.socket.on('connect', () => {
            this.updateConnectionStatus(true);
        });

        this.socket.on('disconnect', () => {
            this.updateConnectionStatus(false);
        });
    }

    setupEventListeners() {
        // Control buttons
        document.getElementById('connect').addEventListener('click', () => {
            this.connect();
        });

        document.getElementById('disconnect').addEventListener('click', () => {
            this.disconnect();
        });

        document.getElementById('newGroup').addEventListener('click', () => {
            this.createNewGroup();
        });

        document.getElementById('reset').addEventListener('click', () => {
            this.reset();
        });

        document.getElementById('targetBtn').addEventListener('click', () => {
            this.setTarget();
        });

        // Overlay style selection
        document.querySelectorAll('.overlay-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.selectOverlayStyle(e.target.dataset.style);
            });
        });

        // Theme selection
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.selectTheme(e.target.dataset.theme);
            });
        });
    }

    initializeChart() {
        const ctx = document.getElementById('giftsChart').getContext('2d');

        this.giftsChart = new Chart(ctx, {
            type: 'line',
            data: this.chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: 'white'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: 'white'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        ticks: {
                            color: 'white'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });

        // Update chart every minute
        setInterval(() => {
            this.updateChart();
        }, 60000);
    }

    handleUpdate(data) {
        this.data = { ...this.data, ...data };
        this.updateDisplay();
        this.updateChart();
    }

    handleGiftStream(giftData) {
        // Add to recent gifts
        this.data.recentGifts.unshift({
            ...giftData,
            timestamp: new Date()
        });

        // Keep only last 50 gifts
        if (this.data.recentGifts.length > 50) {
            this.data.recentGifts = this.data.recentGifts.slice(0, 50);
        }

        this.updateGiftStream();
    }

    updateDisplay() {
        this.updateStats();
        this.updateGroups();
    }

    updateStats() {
        document.getElementById('totalGifts').textContent = this.data.totalGifts || 0;
        document.getElementById('totalDiamonds').textContent = this.data.totalDiamonds || 0;
        document.getElementById('currentViewers').textContent = this.data.viewers || 0;
        document.getElementById('uniqueViewers').textContent = this.data.uniqueViewers || 0;
    }

    updateGroups() {
        const groupsGrid = document.getElementById('groupsGrid');
        groupsGrid.innerHTML = '';

        Object.entries(this.data.groups).forEach(([groupId, group]) => {
            const counter = this.data.counters[groupId] || { count: 0, diamonds: 0 };
            const percentage = Math.min(100, (counter.diamonds / this.data.target) * 100);

            const groupCard = document.createElement('div');
            groupCard.className = 'group-card';
            groupCard.innerHTML = `
                <div class="group-header">
                    <div class="group-name">${group.name}</div>
                    <div style="color: #4ecdc4; font-size: 12px;">${counter.diamonds}/${this.data.target}</div>
                </div>
                <div class="group-progress">
                    <div class="group-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="group-stats">
                    <span>Gifts: ${counter.count}</span>
                    <span>Diamonds: ${counter.diamonds}</span>
                </div>
            `;

            // Add click handler to open overlay
            groupCard.addEventListener('click', () => {
                this.openOverlay(groupId);
            });

            groupsGrid.appendChild(groupCard);
        });
    }

    updateGiftStream() {
        const giftStream = document.getElementById('giftStream');
        giftStream.innerHTML = '';

        this.data.recentGifts.slice(0, 10).forEach(gift => {
            const giftItem = document.createElement('div');
            giftItem.className = 'gift-item';
            giftItem.innerHTML = `
                <img src="${gift.giftPictureUrl}" alt="${gift.giftName}" class="gift-icon" onerror="this.style.display='none'">
                <div class="gift-details">
                    <div class="gift-sender">${gift.nickname}</div>
                    <div>${gift.giftName} x${gift.repeatCount || 1}</div>
                    <div class="gift-value">${gift.diamondCount} 💎</div>
                </div>
            `;
            giftStream.appendChild(giftItem);
        });
    }

    updateChart() {
        const now = new Date();
        const timeLabel = now.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
        });

        // Add new data point
        this.chartData.labels.push(timeLabel);
        this.chartData.datasets[0].data.push(this.data.totalGifts || 0);

        // Keep only last 20 data points
        if (this.chartData.labels.length > 20) {
            this.chartData.labels.shift();
            this.chartData.datasets[0].data.shift();
        }

        this.giftsChart.update('none');
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        const statusDot = statusElement.querySelector('.status-dot');
        const statusText = statusElement.querySelector('span');

        if (connected) {
            statusElement.className = 'connection-status status-connected';
            statusText.textContent = 'Connected';
        } else {
            statusElement.className = 'connection-status status-disconnected';
            statusText.textContent = 'Disconnected';
        }
    }

    selectOverlayStyle(style) {
        this.selectedOverlayStyle = style;

        // Update UI
        document.querySelectorAll('.overlay-option').forEach(option => {
            option.classList.remove('active');
        });
        document.querySelector(`[data-style="${style}"]`).classList.add('active');
    }

    selectTheme(theme) {
        this.selectedTheme = theme;

        // Update UI
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.remove('active');
        });
        document.querySelector(`[data-theme="${theme}"]`).classList.add('active');
    }

    openOverlay(groupId) {
        const group = this.data.groups[groupId];
        if (!group) return;

        const overlayUrl = this.getOverlayUrl(groupId);
        window.open(overlayUrl, '_blank', 'width=400,height=300');
    }

    getOverlayUrl(groupId) {
        const baseUrl = window.location.origin;
        const style = this.selectedOverlayStyle;
        const theme = this.selectedTheme;
        const animation = this.selectedAnimation;

        return `${baseUrl}/overlay-${style}.html?id=${groupId}&pw=${encodeURIComponent(this.getPassword())}&theme=${theme}&animation=${animation}`;
    }

    getPassword() {
        // Get password from URL or prompt user
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('pw') || prompt('Enter dashboard password:') || '';
    }

    connect() {
        this.socket.emit('connect');
    }

    disconnect() {
        this.socket.emit('disconnect');
    }

    createNewGroup() {
        const name = prompt('Enter group name:');
        if (!name) return;

        const giftIds = prompt('Enter gift IDs (comma-separated):');
        const color = prompt('Enter color (hex):') || '#ff6b6b';
        const goal = parseInt(prompt('Enter goal (diamonds):')) || 1000;

        const newGroup = {
            name,
            giftIds: giftIds ? giftIds.split(',').map(id => parseInt(id.trim())) : [],
            color,
            goal
        };

        // Send to server
        fetch('/api/groups', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ...this.data.groups, [Date.now()]: newGroup })
        }).then(response => {
            if (response.ok) {
                this.loadData();
            }
        });
    }

    reset() {
        if (confirm('Are you sure you want to reset all counters?')) {
            fetch('/api/reset', { method: 'POST' })
                .then(response => {
                    if (response.ok) {
                        this.loadData();
                    }
                });
        }
    }

    setTarget() {
        const newTarget = prompt('Enter new target (diamonds):', this.data.target);
        if (newTarget && !isNaN(newTarget)) {
            fetch('/api/target', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ target: parseInt(newTarget) })
            }).then(response => {
                if (response.ok) {
                    this.data.target = parseInt(newTarget);
                    this.updateDisplay();
                }
            });
        }
    }

    loadData() {
        // Load initial data
        fetch('/api/state')
            .then(response => response.json())
            .then(data => {
                this.handleUpdate(data);
            })
            .catch(error => {
                console.error('Error loading data:', error);
            });
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new EnhancedGiftTrackerDashboard();
});

// Export for potential external use
window.EnhancedGiftTrackerDashboard = EnhancedGiftTrackerDashboard;
