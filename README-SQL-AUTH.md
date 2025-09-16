# Gift Tracker Multi-Tenant - SQL Authentication System

This document describes the new SQL-based authentication system that replaces the hardcoded authentication with a proper database-driven approach.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Authentication Flow                         │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────────────────────────┐ │
│  │   User Login    │    │         PostgreSQL Database         │ │
│  │   (Basic Auth)  │    │                                     │ │
│  │                 │    │ • users table (credentials)        │ │
│  │ • admin/admin123│    │ • instances table (permissions)    │ │
│  │ • user/password │    │ • logs table (audit trail)         │ │
│  └─────────────────┘    │ • settings table (configuration)   │ │
│           │              └─────────────────────────────────────┘ │
│           │                              │                      │
│           ▼                              ▼                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Authentication Service                        │ │
│  │                                                             │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │ │
│  │  │   bcrypt    │ │   JWT       │ │   Session   │          │ │
│  │  │  Password   │ │   Tokens    │ │ Management  │          │ │
│  │  │   Hashing   │ │             │ │             │          │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘          │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Phase 1: Local Development

1. **Start the local system:**
   ```bash
   ./start-localhost.sh
   ```

2. **Test authentication:**
   ```bash
   ./test-local-auth.sh
   ```

3. **Access the system:**
   - Admin Panel: http://admin.localhost (admin/admin123)
   - Traefik Dashboard: http://traefik.localhost (admin/admin123)
   - Example Instance: http://gift-tracker-example.localhost (admin/admin123)

### Phase 2: Production Deployment

1. **Configure environment:**
   ```bash
   cp config.env .env
   # Edit .env with your production settings
   ```

2. **Deploy to production:**
   ```bash
   ./deploy-sql-production.sh
   ```

3. **Test production authentication:**
   ```bash
   ./test-sql-auth.sh
   ```

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Instances Table
```sql
CREATE TABLE instances (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    tiktok_username VARCHAR(100) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    port INTEGER UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'stopped',
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    config JSONB DEFAULT '{}',
    data_path VARCHAR(255) NOT NULL
);
```

## 🔐 Authentication Features

### User Management
- **User Creation**: Create new users with roles (admin, user)
- **Password Management**: Secure bcrypt password hashing
- **Role-Based Access**: Admin and user roles with different permissions
- **User Deactivation**: Soft delete users without losing data

### Security Features
- **bcrypt Hashing**: Industry-standard password hashing
- **SQL Injection Protection**: Parameterized queries
- **Connection Pooling**: Efficient database connections
- **Audit Trail**: Complete logging of user actions

### API Endpoints

#### User Management
- `GET /api/users` - List all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id/password` - Update user password
- `DELETE /api/users/:id` - Deactivate user

#### Instance Management
- `GET /api/instances` - List all instances
- `POST /api/instances` - Create new instance
- `PUT /api/instances/:id` - Update instance
- `DELETE /api/instances/:id` - Delete instance

## 🛠️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `gift_tracker` |
| `DB_USER` | Database user | `admin` |
| `DB_PASSWORD` | Database password | `admin123` |
| `NODE_ENV` | Environment | `development` |

### Docker Compose Files

- **Local Development**: `docker-compose.localhost.yml`
- **Production**: `docker-compose.prod.yml`

## 📋 Migration Guide

### From Hardcoded to SQL Authentication

1. **Backup existing data:**
   ```bash
   ./scripts/backup-data.sh
   ```

2. **Deploy new system:**
   ```bash
   ./deploy-sql-production.sh
   ```

3. **Migrate users:**
   ```sql
   -- Default admin user is created automatically
   -- Add additional users as needed
   INSERT INTO users (username, password_hash, email, role) 
   VALUES ('newuser', '$2b$10$...', 'user@example.com', 'user');
   ```

4. **Test authentication:**
   ```bash
   ./test-sql-auth.sh
   ```

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check if PostgreSQL is running
docker-compose -f docker-compose.prod.yml ps postgres

# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres

# Test connection manually
docker exec -it gift-tracker-postgres psql -U admin -d gift_tracker
```

#### Authentication Still Failing
```bash
# Check if users exist in database
docker exec -it gift-tracker-postgres psql -U admin -d gift_tracker -c "SELECT * FROM users;"

# Check admin panel logs
docker-compose -f docker-compose.prod.yml logs admin-panel

# Verify password hash
docker exec -it gift-tracker-postgres psql -U admin -d gift_tracker -c "SELECT username, password_hash FROM users WHERE username = 'admin';"
```

#### SSL Certificate Issues
```bash
# Check Traefik logs
docker-compose -f docker-compose.prod.yml logs traefik

# Check certificate files
ls -la traefik/certificates/

# Restart Traefik
docker-compose -f docker-compose.prod.yml restart traefik
```

### Debug Commands

```bash
# Check all containers
docker-compose -f docker-compose.prod.yml ps

# View logs for specific service
docker-compose -f docker-compose.prod.yml logs -f [service-name]

# Access database directly
docker exec -it gift-tracker-postgres psql -U admin -d gift_tracker

# Check network connectivity
docker network ls
docker network inspect gift-tracker-multi-tenant_gift-tracker-network
```

## 📈 Performance Considerations

### Database Optimization
- **Connection Pooling**: Configured for 20 concurrent connections
- **Indexes**: Added on frequently queried columns
- **Query Optimization**: Using parameterized queries

### Security Best Practices
- **Password Hashing**: bcrypt with salt rounds of 10
- **SQL Injection**: All queries use parameterized statements
- **Connection Security**: Database connections are internal to Docker network

## 🚀 Next Steps

1. **Test the local system** with `./test-local-auth.sh`
2. **Deploy to production** with `./deploy-sql-production.sh`
3. **Create additional users** via the admin panel
4. **Monitor system performance** and logs
5. **Set up automated backups** for the database

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [bcrypt Documentation](https://github.com/kelektiv/node.bcrypt.js)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Traefik Documentation](https://doc.traefik.io/traefik/)

---

**Note**: This SQL-based authentication system provides a more secure, scalable, and maintainable solution compared to hardcoded credentials. It supports user management, role-based access control, and provides a foundation for future enhancements.
