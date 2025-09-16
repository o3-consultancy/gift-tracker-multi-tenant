# Gift Tracker Multi-Tenant System - Localhost Testing

This guide will help you set up and test the Gift Tracker Multi-Tenant system on your local machine for development and testing purposes.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Ports 80, 443, and 8080 available on your machine

### 1. Start the System
```bash
./start.localhost.sh
```

This script will:
- Create necessary directories
- Set up localhost configuration
- Build Docker images
- Start all services
- Display access information

### 2. Add to /etc/hosts (Required)
Add these lines to your `/etc/hosts` file:
```
127.0.0.1 admin.localhost
127.0.0.1 traefik.localhost
127.0.0.1 gift-tracker-example.localhost
```

### 3. Access the System
- **Admin Panel**: http://admin.localhost
- **Traefik Dashboard**: http://traefik.localhost
- **Example Instance**: http://gift-tracker-example.localhost

## 📊 Default Credentials

| Service | Username | Password |
|---------|----------|----------|
| Admin Panel | admin | admin123 |
| Example Instance | admin | example_password |

## 🧪 Testing

### Run Tests
```bash
./test.localhost.sh
```

### Manual Testing

#### 1. Test Admin Panel
```bash
curl http://admin.localhost
```

#### 2. Test Health Endpoints
```bash
# Admin panel health
curl http://localhost:3000/health

# Traefik dashboard
curl http://localhost:8080/api/overview
```

#### 3. Test Example Instance
```bash
# Get instance state
curl -u admin:example_password http://gift-tracker-example.localhost/api/state

# Connect to TikTok (requires valid username)
curl -X POST -u admin:example_password http://gift-tracker-example.localhost/api/connect
```

## 🛠️ Management Commands

### View Logs
```bash
# All services
docker compose -f docker-compose.localhost.yml logs -f

# Specific service
docker compose -f docker-compose.localhost.yml logs -f admin-panel
docker compose -f docker-compose.localhost.yml logs -f traefik
docker compose -f docker-compose.localhost.yml logs -f gift-tracker-example
```

### Stop System
```bash
docker compose -f docker-compose.localhost.yml down
```

### Restart Services
```bash
docker compose -f docker-compose.localhost.yml restart
```

### Rebuild and Restart
```bash
docker compose -f docker-compose.localhost.yml down
docker compose -f docker-compose.localhost.yml build
docker compose -f docker-compose.localhost.yml up -d
```

## 🔧 Configuration Files

### Localhost-Specific Files
- `docker-compose.localhost.yml` - Localhost Docker Compose configuration
- `traefik/traefik.localhost.yml` - Traefik configuration without SSL
- `config.localhost.env` - Environment variables for localhost
- `start.localhost.sh` - Localhost startup script

### Key Differences from Production
- **No SSL certificates** - Uses HTTP instead of HTTPS
- **localhost domains** - Uses `.localhost` instead of `.o3consultancy.ae`
- **Development mode** - NODE_ENV=development
- **Relaxed security** - Reduced rate limiting and security headers

## 📋 Creating New Instances

### Via Admin Panel (Recommended)
1. Open http://admin.localhost
2. Click "New Instance"
3. Fill in:
   - **Instance Name**: `test-instance`
   - **TikTok Username**: `your_tiktok_username`
   - **Subdomain**: `gift-tracker-test`
   - **Password**: `test123`
4. Click "Create Instance"

### Via Command Line
```bash
# The system will automatically use localhost domains in development mode
# New instances will be accessible at: http://gift-tracker-test.localhost
```

## 🔍 Troubleshooting

### Common Issues

#### 1. "Connection refused" errors
- Check if containers are running: `docker compose -f docker-compose.localhost.yml ps`
- Check logs: `docker compose -f docker-compose.localhost.yml logs`

#### 2. "Host not found" errors
- Ensure `/etc/hosts` entries are added
- Try accessing via `http://localhost:3000` instead of `http://admin.localhost`

#### 3. Admin panel not starting
- Check Docker logs: `docker compose -f docker-compose.localhost.yml logs admin-panel`
- Verify database initialization

#### 4. Traefik routing issues
- Check Traefik logs: `docker compose -f docker-compose.localhost.yml logs traefik`
- Verify container labels in Traefik dashboard: http://traefik.localhost

### Debug Commands
```bash
# Check container status
docker compose -f docker-compose.localhost.yml ps

# Check network connectivity
docker network ls
docker network inspect gift-tracker-multi-tenant_gift-tracker-network

# Check container logs
docker compose -f docker-compose.localhost.yml logs [service-name]

# Restart specific service
docker compose -f docker-compose.localhost.yml restart [service-name]
```

## 🚀 Next Steps

1. **Test the system** - Use the test script and manual tests
2. **Create instances** - Try creating new gift tracker instances
3. **Test TikTok integration** - Use real TikTok usernames
4. **Monitor performance** - Check logs and resource usage
5. **Deploy to production** - Use the main docker-compose.yml for production

## 📚 Additional Resources

- [Main README](README.md) - Production deployment guide
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [TikTok Live Connector](https://github.com/isaackogan/TikTok-Live-Connector)

---

**Note**: This is a development setup. For production deployment, use the main configuration files and ensure proper domain setup and SSL certificates.
