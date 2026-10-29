FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY server/package.json server/package-lock.json ./server/
RUN npm --prefix server ci --omit=dev
COPY . .
RUN npm run build

FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/server ./server
COPY --from=build /app/src/shared ./src/shared
COPY --from=build /app/src/units.js ./src/units.js
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "server/server.js"]
