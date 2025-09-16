# Gift Tracker Multi-Tenant System

A comprehensive multi-tenant architecture for managing multiple TikTok gift tracker instances on a single VM, replacing expensive Cloud Run deployments with a cost-effective solution.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    VM Instance (Single)                        │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────────────────────────┐ │
│  │   DNS Router    │    │         Admin Panel                 │ │
│  │   (Traefik)     │    │     (Container Management)         │ │
│  │                 │    │                                     │ │
│  │ • Route requests│    │ • View all instances               │ │
│  │ • SSL termination│   │ • Start/stop containers           │ │
│  │ • Load balancing│    │ • Monitor health                   │ │
│  └─────────────────┘    │ • Create new instances             │ │
│           │              └─────────────────────────────────────┘ │
│           │                              │                      │
│           ▼                              ▼                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Docker Container Orchestration                │ │
│  │                                                             │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │ │
│  │  │ Gift Tracker│ │ Gift Tracker│ │ Gift Tracker│   ...     │ │
│  │  │ Instance 1  │ │ Instance 2  │ │ Instance 3  │          │ │
│  │  │ (user1)     │ │ (user2)     │ │ (user3)     │          │ │
│  │  │ :3001       │ │ :3002       │ │ :3003       │          │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘          │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Domain configured to point to your VM
- Ports 80, 443, and 8080 open

### Installation

1. **Clone and setup the project:**
   ```bash
   git clone <your-repo>
   cd gift-tracker-multi-tenant
   ```

2. **Configure environment:**
   ```bash
   cp config.env .env
   # Edit .env with your domain and settings
   ```

3. **Start the system:**
   ```bash
   docker-compose up -d
   ```

4. **Access the admin panel:**
   - URL: `https://admin.o3consultancy.ae`
   - Default credentials: `admin` / `admin123`

## 📋 Features

### 🎯 Core Features
- **Multi-tenant Architecture**: Run unlimited gift tracker instances on a single VM
- **Dynamic DNS Routing**: Automatic subdomain routing with Traefik
- **SSL Automation**: Automatic Let's Encrypt SSL certificates
- **Admin Panel**: Web-based management interface
- **Container Orchestration**: Docker Compose-based deployment
- **Real-time Monitoring**: Live status updates and health checks

### 🛠️ Management Features
- **Instance Management**: Create, start, stop, and delete instances
- **Configuration Management**: Update TikTok usernames and passwords
- **Log Viewing**: Real-time container logs
- **Backup System**: Automated data backups
- **Health Monitoring**: System health checks and alerts

### 💰 Cost Benefits
- **70-80% Cost Reduction**: Single VM vs multiple Cloud Run instances
- **Predictable Pricing**: Fixed monthly VM cost
- **No Per-Request Charges**: Unlimited API calls
- **Resource Optimization**: Shared infrastructure

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DOMAIN` | Your domain name | `o3consultancy.ae` |
| `ACME_EMAIL` | Email for SSL certificates | `admin@o3consultancy.ae` |
| `ADMIN_PASSWORD` | Admin panel password | `admin123` |
| `BASE_PORT` | Starting port for instances | `3001` |
| `MAX_INSTANCES` | Maximum number of instances | `50` |

### DNS Configuration

Configure your domain's DNS to point to your VM:
```
A    *.o3consultancy.ae    -> YOUR_VM_IP
A    o3consultancy.ae      -> YOUR_VM_IP
```

## 📖 Usage

### Creating a New Instance

#### Via Admin Panel (Recommended)
1. Open the admin panel at `https://admin.o3consultancy.ae`
2. Click "New Instance"
3. Fill in the details:
   - **Instance Name**: Unique identifier (e.g., `gift-ss1`)
   - **TikTok Username**: The TikTok account to monitor
   - **Subdomain**: URL subdomain (e.g., `gift-tracker-ss1`)
   - **Password**: Dashboard password
4. Click "Create Instance"

#### Via Command Line
```bash
./scripts/deploy-instance.sh gift-ss1 yalastars1 gift-tracker-ss1 mypassword123
```

### Managing Instances

- **Start/Stop**: Use the admin panel or Docker commands
- **View Logs**: Click the logs button in the admin panel
- **Update Config**: Modify TikTok username or password via admin panel
- **Delete**: Remove instance and all associated data

### Backup and Recovery

#### Create Backup
```bash
./scripts/backup-data.sh
```

#### List Backups
```bash
ls -la data/backups/
```

#### Restore from Backup
```bash
# Stop all services
docker-compose down

# Restore data
cp -r data/backups/backup-YYYYMMDD-HHMMSS/* data/

# Restart services
docker-compose up -d
```

## 🔍 Monitoring

### Health Checks
- **System Health**: `https://admin.o3consultancy.ae/api/admin/health`
- **Instance Status**: Real-time status in admin panel
- **Container Logs**: Available via admin panel

### Logs
- **System Logs**: Available in admin panel
- **Container Logs**: Individual instance logs
- **Traefik Logs**: DNS routing and SSL logs

## 🛡️ Security

### SSL/TLS
- Automatic Let's Encrypt certificates
- HTTPS redirect for all traffic
- Secure cookie settings

### Authentication
- Basic auth for gift tracker dashboards
- Admin panel authentication
- Rate limiting on API endpoints

### Network Security
- Isolated Docker network
- Firewall recommendations
- Regular security updates

## 🔧 Troubleshooting

### Common Issues

#### Instance Won't Start
1. Check container logs: `docker logs gift-tracker-<name>`
2. Verify port availability
3. Check TikTok username validity

#### SSL Certificate Issues
1. Verify DNS configuration
2. Check ACME email setting
3. Review Traefik logs

#### Admin Panel Not Accessible
1. Check if Traefik is running: `docker ps`
2. Verify domain DNS settings
3. Check firewall rules

### Debug Commands

```bash
# Check all containers
docker ps -a

# View Traefik logs
docker logs traefik

# Check network connectivity
docker network ls
docker network inspect gift-tracker-network

# View admin panel logs
docker logs admin-panel
```

## 📊 Migration from Cloud Run

### Step-by-Step Migration

1. **Setup New System**
   ```bash
   # Deploy the multi-tenant system
   docker-compose up -d
   ```

2. **Migrate First Instance**
   ```bash
   # Create instance with same configuration
   ./scripts/deploy-instance.sh gift-ss1 yalastars1 gift-tracker-ss1 password123
   ```

3. **Test and Verify**
   - Verify instance is working
   - Check SSL certificate
   - Test gift tracking functionality

4. **Update DNS**
   - Point subdomain to new system
   - Monitor for any issues

5. **Migrate Remaining Instances**
   - Repeat for each instance
   - Update DNS gradually

6. **Cleanup Cloud Run**
   - Delete old Cloud Run services
   - Remove unused images

### Migration Checklist

- [ ] New system deployed and tested
- [ ] First instance migrated and verified
- [ ] DNS updated for first instance
- [ ] All instances migrated
- [ ] All DNS records updated
- [ ] Old Cloud Run services deleted
- [ ] Cost savings verified

## 🚀 Deployment Options

### VM Requirements
- **Minimum**: 2 CPU, 4GB RAM, 20GB storage
- **Recommended**: 4 CPU, 8GB RAM, 50GB storage
- **OS**: Ubuntu 20.04+ or similar

### Cloud Providers
- **Google Cloud Platform**: Compute Engine
- **AWS**: EC2 instances
- **DigitalOcean**: Droplets
- **Linode**: Nanode/Shared CPU

### Scaling Considerations
- **Horizontal**: Deploy multiple VMs with load balancer
- **Vertical**: Upgrade VM resources as needed
- **Database**: Consider external database for large deployments

## 📈 Performance Optimization

### Resource Management
- **Memory**: Monitor container memory usage
- **CPU**: Optimize container resource limits
- **Storage**: Regular cleanup of old logs and backups

### Network Optimization
- **CDN**: Consider CloudFlare for static assets
- **Caching**: Implement Redis for session management
- **Load Balancing**: Multiple Traefik instances for high availability

## 🤝 Support

### Getting Help
1. Check the troubleshooting section
2. Review container logs
3. Check system health endpoints
4. Create an issue with detailed logs

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Original gift tracker implementation
- Traefik for reverse proxy and SSL
- Docker for containerization
- Node.js and Express for the admin panel

---

**Cost Savings Example:**
- **Before**: 10 Cloud Run instances × $20/month = $200/month
- **After**: 1 VM × $40/month = $40/month
- **Savings**: $160/month (80% reduction)
