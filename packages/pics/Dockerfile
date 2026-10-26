FROM nginx:1.27-alpine

RUN apk add --no-cache wget

COPY packages/pics/dist /usr/share/nginx/html
COPY packages/pics/nginx/default.conf /etc/nginx/conf.d/default.conf
