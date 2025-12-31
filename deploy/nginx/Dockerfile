FROM nginx:alpine

# Copy production nginx config and built static assets
COPY nginx/nginx.prod.conf /etc/nginx/nginx.conf
COPY frontend/dist /usr/share/nginx/html
