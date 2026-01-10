# Build Stage
FROM rust:1.83-slim AS builder

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
  pkg-config \
  libssl-dev \
  && rm -rf /var/lib/apt/lists/*

# Copy manifests
COPY Cargo.toml Cargo.lock ./

# Create dummy main to cache dependencies
RUN mkdir src && \
  echo "fn main() {}" > src/main.rs && \
  echo "pub fn lib() {}" > src/lib.rs

# Build dependencies (this layer will be cached)
RUN cargo build --release && \
  rm -rf src target/release/deps/giro_license_server*

# Copy source code
COPY . .

# Build application
ENV SQLX_OFFLINE=true
RUN cargo build --release

# Runtime Stage (Production)
FROM debian:bookworm-slim AS production

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
  ca-certificates \
  libssl3 \
  curl \
  && rm -rf /var/lib/apt/lists/*

# Copy binary from builder
COPY --from=builder /app/target/release/giro-license-server /usr/local/bin/giro-license-server
COPY --from=builder /app/migrations ./migrations

# Create non-root user
RUN useradd -m -u 1000 giro && \
  chown -R giro:giro /app

USER giro

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

EXPOSE 3000

ENV RUST_LOG=info

CMD ["giro-license-server"]

# Development Stage
FROM rust:1.83-slim AS development

WORKDIR /app

# Install dependencies + cargo-watch
RUN apt-get update && apt-get install -y \
  pkg-config \
  libssl-dev \
  && rm -rf /var/lib/apt/lists/* && \
  cargo install cargo-watch

# Copy source
COPY . .

EXPOSE 3000

ENV RUST_LOG=debug

CMD ["cargo", "watch", "-x", "run"]
