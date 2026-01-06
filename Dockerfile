# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_HA_URL
ARG VITE_HA_TOKEN
ARG VITE_FRIGATE_URL
ARG VITE_CLAUDE_API_KEY

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
