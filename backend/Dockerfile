FROM oven/bun:1.3.13

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl git \
  && rm -rf /var/lib/apt/lists/*
ARG RAILPACK_VERSION=0.23.0
ARG DOCKER_CLI_VERSION=28.5.2
ARG TARGETARCH
RUN set -eux; \
  case "$TARGETARCH" in \
    arm64) docker_arch="aarch64" ;; \
    amd64|"") docker_arch="x86_64" ;; \
    *) echo "Unsupported architecture: $TARGETARCH" >&2; exit 1 ;; \
  esac; \
  curl -fsSL "https://download.docker.com/linux/static/stable/${docker_arch}/docker-${DOCKER_CLI_VERSION}.tgz" \
    | tar -xz -C /tmp docker/docker; \
  mv /tmp/docker/docker /usr/local/bin/docker; \
  chmod +x /usr/local/bin/docker; \
  docker --version; \
  case "$TARGETARCH" in \
    arm64) railpack_arch="arm64" ;; \
    amd64|"") railpack_arch="x86_64" ;; \
    *) echo "Unsupported architecture: $TARGETARCH" >&2; exit 1 ;; \
  esac; \
  curl -fsSL "https://github.com/railwayapp/railpack/releases/download/v${RAILPACK_VERSION}/railpack-v${RAILPACK_VERSION}-${railpack_arch}-unknown-linux-musl.tar.gz" \
    | tar -xz -C /usr/local/bin railpack; \
  chmod +x /usr/local/bin/railpack; \
  railpack --version

WORKDIR /app

COPY package.json bun.lock ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN bun install --frozen-lockfile

COPY backend backend

WORKDIR /app/backend

EXPOSE 3001

CMD ["bun", "run", "src/index.ts"]
