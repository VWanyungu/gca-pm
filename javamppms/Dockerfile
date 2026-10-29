FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --no-create-home appuser
COPY --from=build /build/target/javamppms.jar ./javamppms.jar
USER appuser

# Containers must listen on all interfaces, not just localhost, or the platform's
# edge/proxy can't reach them; see MPP_HOST in Main.java.
ENV MPP_HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "javamppms.jar"]
