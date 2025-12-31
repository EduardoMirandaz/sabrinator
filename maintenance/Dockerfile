FROM python:3.11-alpine

RUN apk add --no-cache curl ca-certificates
# Install supercronic for simple cron in containers
RUN curl -fsSL -o /usr/local/bin/supercronic https://github.com/aptible/supercronic/releases/download/v0.2.24/supercronic-linux-amd64 && \
    chmod +x /usr/local/bin/supercronic

# Copy is optional; we mount scripts from host
WORKDIR /app

ENV TZ=UTC

ENTRYPOINT ["/usr/local/bin/supercronic", "/crontab"]
