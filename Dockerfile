# 1. Build client SPA
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# 2. Build Java Spring Boot server JAR
FROM maven:3.9.6-eclipse-temurin-21-alpine AS server-builder
WORKDIR /app/server
COPY server/pom.xml .
COPY server/src ./src
COPY --from=client-builder /app/client/dist ./src/main/resources/static
RUN mvn clean package -DskipTests

# 3. Final lightweight runtime image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

COPY --from=server-builder /app/server/target/*.jar /app/server.jar

ENV PORT=3000
EXPOSE 3000

ENTRYPOINT ["java", "-jar", "/app/server.jar"]
