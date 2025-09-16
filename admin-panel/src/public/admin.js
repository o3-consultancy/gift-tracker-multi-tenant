// Admin Panel JavaScript
class AdminPanel {
    constructor() {
        this.socket = null;
        this.instances = [];
        this.overview = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.connectSocket();
        this.loadData();

        // Auto-refresh every 30 seconds
        setInterval(() => this.loadData(), 30000);
    }

    setupEventListeners() {
        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadData();
        });

        // New instance button
        document.getElementById('newInstanceBtn').addEventListener('click', () => {
            this.showNewInstanceModal();
        });

        // Modal controls
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.hideNewInstanceModal();
        });

        // New instance form
        document.getElementById('newInstanceForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createNewInstance();
        });

        // Auto-generate subdomain from instance name
        document.getElementById('instanceName').addEventListener('input', (e) => {
            const subdomain = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
            document.getElementById('subdomain').value = subdomain;
        });
    }

    connectSocket() {
        this.socket = io();

        this.socket.on('connect', () => {
            console.log('Connected to admin panel');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from admin panel');
        });

        this.socket.on('instanceUpdate', (data) => {
            console.log('Instance update received:', data);
            this.loadData();
        });
    }

    async loadData() {
        try {
            this.showLoading();

            // Load overview and instances in parallel
            const [overviewResponse, instancesResponse] = await Promise.all([
                fetch('/api/admin/overview'),
                fetch('/api/instances')
            ]);

            if (!overviewResponse.ok || !instancesResponse.ok) {
                throw new Error('Failed to load data');
            }

            this.overview = await overviewResponse.json();
            this.instances = await instancesResponse.json();

            this.updateOverview();
            this.updateInstancesTable();
            this.updateRecentLogs();

        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load data');
        } finally {
            this.hideLoading();
        }
    }

    updateOverview() {
        if (!this.overview) return;

        const stats = this.overview.instances;
        document.getElementById('totalInstances').textContent = stats.total_instances || 0;
        document.getElementById('runningInstances').textContent = stats.running_instances || 0;
        document.getElementById('stoppedInstances').textContent = stats.stopped_instances || 0;
        document.getElementById('diskUsage').textContent = 'N/A'; // Placeholder
    }

    updateInstancesTable() {
        const tbody = document.getElementById('instancesTable');
        tbody.innerHTML = '';

        if (this.instances.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                        No instances found. Create your first instance to get started.
                    </td>
                </tr>
            `;
            return;
        }

        this.instances.forEach(instance => {
            const row = this.createInstanceRow(instance);
            tbody.appendChild(row);
        });
    }

    createInstanceRow(instance) {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';

        const statusClass = this.getStatusClass(instance.status);
        const createdDate = new Date(instance.created_at).toLocaleDateString();

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                        <div class="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <i class="fas fa-gift text-purple-600"></i>
                        </div>
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${instance.name}</div>
                        <div class="text-sm text-gray-500">Port: ${instance.port}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${instance.tiktok_username}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClass}">
                    ${instance.status}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <a href="${instance.url}" target="_blank" 
                   class="text-blue-600 hover:text-blue-800 text-sm">
                    ${instance.subdomain}.${window.location.hostname.includes('localhost') ? 'localhost' : 'o3consultancy.ae'}
                    <i class="fas fa-external-link-alt ml-1"></i>
                </a>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${createdDate}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                    ${this.createActionButtons(instance)}
                </div>
            </td>
        `;

        return row;
    }

    createActionButtons(instance) {
        const buttons = [];

        if (instance.status === 'running') {
            buttons.push(`
                <button onclick="adminPanel.stopInstance(${instance.id})" 
                        class="text-red-600 hover:text-red-900">
                    <i class="fas fa-stop"></i>
                </button>
            `);
        } else {
            buttons.push(`
                <button onclick="adminPanel.startInstance(${instance.id})" 
                        class="text-green-600 hover:text-green-900">
                    <i class="fas fa-play"></i>
                </button>
            `);
        }

        buttons.push(`
            <button onclick="adminPanel.viewLogs(${instance.id})" 
                    class="text-blue-600 hover:text-blue-900">
                <i class="fas fa-file-alt"></i>
            </button>
        `);

        buttons.push(`
            <button onclick="adminPanel.deleteInstance(${instance.id}, '${instance.name}')" 
                    class="text-red-600 hover:text-red-900">
                <i class="fas fa-trash"></i>
            </button>
        `);

        return buttons.join('');
    }

    getStatusClass(status) {
        switch (status) {
            case 'running': return 'status-running';
            case 'stopped': return 'status-stopped';
            case 'starting': return 'status-starting';
            case 'stopping': return 'status-stopping';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    updateRecentLogs() {
        if (!this.overview || !this.overview.recentLogs) return;

        const container = document.getElementById('recentLogs');
        container.innerHTML = '';

        this.overview.recentLogs.forEach(log => {
            const logElement = this.createLogElement(log);
            container.appendChild(logElement);
        });
    }

    createLogElement(log) {
        const div = document.createElement('div');
        div.className = 'px-4 py-3';

        const levelClass = this.getLogLevelClass(log.level);
        const timestamp = new Date(log.timestamp).toLocaleString();

        div.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${levelClass}">
                        ${log.level.toUpperCase()}
                    </span>
                    <span class="ml-3 text-sm text-gray-900">${log.message}</span>
                </div>
                <div class="flex items-center text-sm text-gray-500">
                    <span class="mr-2">${log.instance_name}</span>
                    <span>${timestamp}</span>
                </div>
            </div>
        `;

        return div;
    }

    getLogLevelClass(level) {
        switch (level) {
            case 'error': return 'bg-red-100 text-red-800';
            case 'warning': return 'bg-yellow-100 text-yellow-800';
            case 'info': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    showNewInstanceModal() {
        document.getElementById('newInstanceModal').classList.remove('hidden');
        document.getElementById('instanceName').focus();
    }

    hideNewInstanceModal() {
        document.getElementById('newInstanceModal').classList.add('hidden');
        document.getElementById('newInstanceForm').reset();
    }

    async createNewInstance() {
        const formData = new FormData(document.getElementById('newInstanceForm'));
        const data = Object.fromEntries(formData.entries());

        try {
            this.showLoading();

            const response = await fetch('/api/instances', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create instance');
            }

            this.hideNewInstanceModal();
            this.showSuccess('Instance created successfully!');
            this.loadData();

        } catch (error) {
            console.error('Error creating instance:', error);
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    async startInstance(id) {
        try {
            this.showLoading();

            const response = await fetch(`/api/instances/${id}/start`, {
                method: 'POST'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to start instance');
            }

            this.showSuccess('Instance started successfully!');
            this.loadData();

        } catch (error) {
            console.error('Error starting instance:', error);
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    async stopInstance(id) {
        try {
            this.showLoading();

            const response = await fetch(`/api/instances/${id}/stop`, {
                method: 'POST'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to stop instance');
            }

            this.showSuccess('Instance stopped successfully!');
            this.loadData();

        } catch (error) {
            console.error('Error stopping instance:', error);
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    async deleteInstance(id, name) {
        if (!confirm(`Are you sure you want to delete the instance "${name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            this.showLoading();

            const response = await fetch(`/api/instances/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete instance');
            }

            this.showSuccess('Instance deleted successfully!');
            this.loadData();

        } catch (error) {
            console.error('Error deleting instance:', error);
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    async viewLogs(id) {
        try {
            const response = await fetch(`/api/instances/${id}/logs`);
            if (!response.ok) {
                throw new Error('Failed to fetch logs');
            }

            const data = await response.json();
            this.showLogsModal(data.logs);

        } catch (error) {
            console.error('Error fetching logs:', error);
            this.showError('Failed to fetch logs');
        }
    }

    showLogsModal(logs) {
        // Create a simple modal to display logs
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50';
        modal.innerHTML = `
            <div class="relative top-20 mx-auto p-5 border w-3/4 shadow-lg rounded-md bg-white">
                <div class="mt-3">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">Instance Logs</h3>
                    <div class="max-h-96 overflow-y-auto bg-gray-900 text-green-400 p-4 rounded font-mono text-sm">
                        <pre>${logs}</pre>
                    </div>
                    <div class="mt-4 flex justify-end">
                        <button onclick="this.closest('.fixed').remove()" 
                                class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    showLoading() {
        document.getElementById('loadingOverlay').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';

        notification.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-md shadow-lg z-50`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});
