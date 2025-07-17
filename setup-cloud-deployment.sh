#!/bin/bash

# Mission Control - Cloud Deployment Script

echo "☁️ Setting up Cloud Deployment"
echo "=============================="

# Create Dockerfile for backend
cat > server/Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3001

# Start application
CMD ["npm", "start"]
EOF

# Create docker-compose for full stack
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  backend:
    build: ./server
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - FRONTEND_URL=https://your-domain.com
    restart: unless-stopped

  frontend:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - backend
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    restart: unless-stopped
EOF

# Create nginx configuration
cat > nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server frontend:3000;
    }
    
    upstream backend {
        server backend:3001;
    }
    
    server {
        listen 80;
        server_name your-domain.com;
        
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
        
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
        
        location /socket.io/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
        }
    }
}
EOF

# Create deployment script for various platforms
cat > deploy-cloud.sh << 'EOF'
#!/bin/bash

echo "Choose deployment platform:"
echo "1. Railway"
echo "2. Heroku"
echo "3. DigitalOcean"
echo "4. AWS (Docker)"
echo "5. Manual VPS"

read -p "Enter choice (1-5): " choice

case $choice in
  1)
    echo "🚂 Railway Deployment"
    echo "1. Install Railway CLI: npm install -g @railway/cli"
    echo "2. Login: railway login"
    echo "3. Create project: railway new"
    echo "4. Deploy: railway up"
    ;;
  2)
    echo "🟣 Heroku Deployment"
    echo "1. Install Heroku CLI"
    echo "2. Login: heroku login"
    echo "3. Create app: heroku create mission-control-app"
    echo "4. Deploy: git push heroku main"
    ;;
  3)
    echo "🌊 DigitalOcean Deployment"
    echo "1. Create droplet"
    echo "2. Install Docker: apt install docker.io docker-compose"
    echo "3. Clone repo and run: docker-compose up -d"
    ;;
  4)
    echo "☁️ AWS Deployment"
    echo "1. Install AWS CLI and configure"
    echo "2. Build: docker-compose build"
    echo "3. Push to ECR"
    echo "4. Deploy with ECS/EKS"
    ;;
  5)
    echo "🖥️ Manual VPS Deployment"
    echo "1. Setup VPS with Ubuntu 20.04+"
    echo "2. Install Node.js, nginx, SSL certificates"
    echo "3. Clone repo and run: npm install && npm run build"
    echo "4. Configure nginx and start services"
    ;;
esac
EOF

chmod +x deploy-cloud.sh

echo "✅ Cloud deployment files created"
echo "📝 Run ./deploy-cloud.sh to choose deployment platform"
