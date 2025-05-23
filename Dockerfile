FROM node:lts-bookworm-slim as base
LABEL Author="Nanahira <nanahira@momobako.com>"

RUN apt update && apt -y install python3 build-essential && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* /var/log/*
WORKDIR /usr/src/app
COPY ./package*.json ./

FROM base as builder
RUN npm ci && npm cache clean --force
COPY . ./
RUN npm run build

FROM base
ENV NODE_ENV production
RUN npm ci && npm cache clean --force
COPY --from=builder /usr/src/app/dist ./dist

CMD [ "npm", "start" ]
