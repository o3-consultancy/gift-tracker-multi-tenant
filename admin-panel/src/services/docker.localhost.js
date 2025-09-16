import Docker from 'dockerode';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let docker = null;

export async function initializeDocker() {
    try {
        docker = new Docker({ socketPath: '/var/run/docker.sock' });

        // Test connection
        await docker.ping();
        console.log('Docker connection established');

        return docker;
    } catch (error) {
        console.error('Failed to connect to Docker:', error);
        throw error;
    }
}

export function getDocker() {
    return docker;
}

export async function createGiftTrackerInstance(instanceData) {
    const {
        name,
        tiktokUsername,
        subdomain,
        password,
        port,
        config = {}
    } = instanceData;

    try {
        // Create data directory for the instance
        const dataPath = path.join(__dirname, '../../data/instances', name);
        await fs.ensureDir(dataPath);

        // Create groups.json if not exists
        const groupsPath = path.join(dataPath, 'groups.json');
        if (!await fs.pathExists(groupsPath)) {
            await fs.writeJson(groupsPath, {}, { spaces: 2 });
        }

        // Create config.json
        const configPath = path.join(dataPath, 'config.json');
        await fs.writeJson(configPath, { target: 10000 }, { spaces: 2 });

        // Build the container name
        const containerName = `gift-tracker-${name}`;

        // Container configuration for localhost
        const containerConfig = {
            Image: 'gift-tracker-instance:latest',
            name: containerName,
            Env: [
                `TIKTOK_USERNAME=${tiktokUsername}`,
                `DASH_PASSWORD=${password}`,
                'PORT=3000'
            ],
            ExposedPorts: {
                '3000/tcp': {}
            },
            HostConfig: {
                PortBindings: {
                    '3000/tcp': [{ HostPort: port.toString() }]
                },
                Binds: [
                    `${dataPath}:/app/data:rw`
                ],
                RestartPolicy: {
                    Name: 'unless-stopped'
                },
                NetworkMode: 'gift-tracker-network'
            },
            Labels: {
                'traefik.enable': 'true',
                [`traefik.http.routers.gift-${name}.rule`]: `Host(\`${subdomain}.localhost\`)`,
                [`traefik.http.routers.gift-${name}.service`]: `gift-${name}`,
                [`traefik.http.services.gift-${name}.loadbalancer.server.port`]: '3000',
                [`traefik.http.routers.gift-${name}.middlewares`]: 'auth-basic',
                'traefik.http.middlewares.auth-basic.basicauth.users': `admin:${password}`,
                'gift-tracker.instance': name,
                'gift-tracker.tiktok-username': tiktokUsername
            }
        };

        // Create and start the container
        const container = await docker.createContainer(containerConfig);
        await container.start();

        console.log(`Created and started container: ${containerName}`);

        return {
            id: container.id,
            name: containerName,
            status: 'running',
            port: port
        };

    } catch (error) {
        console.error('Error creating gift tracker instance:', error);
        throw error;
    }
}

export async function stopGiftTrackerInstance(containerName) {
    try {
        const container = docker.getContainer(containerName);
        await container.stop();
        console.log(`Stopped container: ${containerName}`);
        return { status: 'stopped' };
    } catch (error) {
        console.error('Error stopping container:', error);
        throw error;
    }
}

export async function startGiftTrackerInstance(containerName) {
    try {
        const container = docker.getContainer(containerName);
        await container.start();
        console.log(`Started container: ${containerName}`);
        return { status: 'running' };
    } catch (error) {
        console.error('Error starting container:', error);
        throw error;
    }
}

export async function removeGiftTrackerInstance(containerName) {
    try {
        const container = docker.getContainer(containerName);
        await container.stop();
        await container.remove();
        console.log(`Removed container: ${containerName}`);
        return { status: 'removed' };
    } catch (error) {
        console.error('Error removing container:', error);
        throw error;
    }
}

export async function getContainerStatus(containerName) {
    try {
        const container = docker.getContainer(containerName);
        const info = await container.inspect();

        return {
            id: info.Id,
            name: info.Name,
            status: info.State.Status,
            running: info.State.Running,
            restartCount: info.RestartCount,
            createdAt: info.Created,
            startedAt: info.State.StartedAt,
            finishedAt: info.State.FinishedAt
        };
    } catch (error) {
        if (error.statusCode === 404) {
            return null; // Container doesn't exist
        }
        console.error('Error getting container status:', error);
        throw error;
    }
}

export async function getAllContainers() {
    try {
        const containers = await docker.listContainers({ all: true });

        return containers
            .filter(container =>
                container.Labels &&
                container.Labels['gift-tracker.instance']
            )
            .map(container => ({
                id: container.Id,
                name: container.Names[0].substring(1), // Remove leading slash
                status: container.State,
                image: container.Image,
                created: container.Created,
                labels: container.Labels
            }));
    } catch (error) {
        console.error('Error listing containers:', error);
        throw error;
    }
}

export async function getContainerLogs(containerName, tail = 100) {
    try {
        const container = docker.getContainer(containerName);
        const logs = await container.logs({
            stdout: true,
            stderr: true,
            tail: tail,
            timestamps: true
        });

        return logs.toString();
    } catch (error) {
        console.error('Error getting container logs:', error);
        throw error;
    }
}

export async function getNextAvailablePort() {
    try {
        const containers = await docker.listContainers({ all: true });
        const usedPorts = new Set();

        containers.forEach(container => {
            if (container.Ports) {
                container.Ports.forEach(port => {
                    if (port.PrivatePort === 3000) {
                        usedPorts.add(port.PublicPort);
                    }
                });
            }
        });

        // Start from port 3001 and find the first available
        let port = 3001;
        while (usedPorts.has(port)) {
            port++;
        }

        return port;
    } catch (error) {
        console.error('Error getting next available port:', error);
        throw error;
    }
}
