# --- Étape 1 : build Maven ---
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Cache des dépendances : on copie d'abord le pom puis on télécharge.
COPY pom.xml ./
RUN mvn -q -B dependency:go-offline

COPY src ./src
RUN mvn -q -B clean package -DskipTests

# --- Étape 2 : image d'exécution ---
FROM eclipse-temurin:17-jre-jammy AS runtime
WORKDIR /app

RUN addgroup --system app && adduser --system --ingroup app app
COPY --from=build /app/target/*.jar app.jar
USER app

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8080/api/v1/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
