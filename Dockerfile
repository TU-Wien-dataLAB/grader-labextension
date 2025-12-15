# =========================
# Stage 1: Build extension
# =========================
ARG REGISTRY=quay.io
ARG OWNER=jupyter
ARG BASE_CONTAINER=$REGISTRY/$OWNER/minimal-notebook:latest

FROM $BASE_CONTAINER AS builder

USER root

# Install build dependencies only
RUN apt-get update && \
    apt-get install -yq --no-install-recommends \
        git \
        build-essential && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Node is only needed to build the labextension
RUN mamba install -y nodejs && \
    mamba clean -a -y

WORKDIR /build

# Copy only what is needed to build
COPY . /build

# Build & install into a temporary prefix
RUN python3 -m pip install --no-cache-dir --prefix=/install /build


# =========================
# Stage 2: Runtime image
# =========================
FROM $BASE_CONTAINER

USER root

# Copy only the installed artifacts
COPY --from=builder /install /usr/local

# Optional: clean caches
RUN rm -rf /root/.cache

WORKDIR /home/jovyan
USER jovyan
