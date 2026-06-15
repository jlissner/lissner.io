FROM nginx:1.27-alpine

RUN apk add --no-cache wget

COPY ui/dist /usr/share/nginx/html
COPY ui/nginx/default.conf /etc/nginx/conf.d/default.conf
