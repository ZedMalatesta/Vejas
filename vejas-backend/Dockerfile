FROM node:22-alpine AS builder

WORKDIR /usr/src/app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY package-lock.json* ./
COPY prisma ./prisma/

RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

FROM node:22-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma
# Prisma CLI is a devDependency, so it is not in the production install —
# copy it from the builder to run "migrate deploy" against a fresh database.
COPY --from=builder /usr/src/app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /usr/src/app/node_modules/.bin/prisma ./node_modules/.bin/prisma

ENV PORT=4000
EXPOSE ${PORT}

CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main"]
