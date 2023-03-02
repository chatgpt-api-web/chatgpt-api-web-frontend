FROM node:19.7-alpine3.16 as build

ARG CHINA_WORKAROUND=false
RUN if [ "${CHINA_WORKAROUND}" = "true" ] ; then \
      yarn config set registry https://registry.npmmirror.com && \
      yarn config set disturl https://npmmirror.com/mirrors/node && \
      true; \
    fi

WORKDIR /src
COPY package.json yarn.lock ./
RUN yarn install --verbose
COPY . .
RUN yarn build

FROM busybox:1.34.1
WORKDIR /src
COPY --from=build /src/build build
CMD [ "sh", "-c", "cp -r build/. /www/ && while :; do sleep 2073600; done" ]