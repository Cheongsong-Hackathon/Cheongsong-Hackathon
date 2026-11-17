# 배포 단위 하나: server가 API와 web 빌드 결과를 함께 서빙한다.
FROM node:24-alpine AS build
WORKDIR /app
COPY web/package*.json web/
RUN cd web && npm ci
COPY server/package*.json server/
RUN cd server && npm ci
COPY web web
COPY server server
RUN cd web && npm run build && cd ../server && npm run build && npm prune --omit=dev

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/server/package.json /app/server/schema.sql server/
COPY --from=build /app/server/node_modules server/node_modules
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/web/dist web/dist
EXPOSE 3000
# 시작할 때 마이그레이션을 하고, DB가 비어 있으면 seed를 넣는다.
CMD ["node", "server/dist/index.js"]
