FROM caddy:2-builder AS builder
RUN xcaddy build --with github.com/caddy-dns/godaddy@v1.2.0 && setcap -r /usr/bin/caddy

FROM caddy:2-alpine
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
