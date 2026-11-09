package ke.co.gca.mpp;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;

/**
 * The whole service: POST the bytes of an .mpp to /parse, get schedule rows back.
 *
 * <p>Binds to localhost by default and carries no authentication of its own — it is
 * reached only by the backend on the same host. Set HOST to expose it, and put a
 * shared secret in front of it if you do.
 */
public final class Main {

  /** AC-FIL-02 caps schedule_mpp uploads at 50 MB. */
  private static final int MAX_BYTES = 50 * 1024 * 1024;

  /** Only the frontend origin may call this service directly (e.g. a future browser-facing endpoint). */
  private static final String CORS_ORIGIN =
      System.getenv().getOrDefault("CORS_ORIGIN", "https://gca-pm.vercel.app");

  private static final ObjectMapper JSON =
      new ObjectMapper().setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);

  public static void main(String[] args) throws IOException {
    String host = System.getenv().getOrDefault("MPP_HOST", "127.0.0.1");
    // Containers need PORT (Cloud Run, Fly.io, Railway, Render all inject it); MPP_PORT still wins if set.
    int port = Integer.parseInt(
        System.getenv().getOrDefault("MPP_PORT", System.getenv().getOrDefault("PORT", "8081")));

    HttpServer server = HttpServer.create(new InetSocketAddress(host, port), 0);
    // MPXJ holds the whole project graph in memory, so cap concurrent parses at what the heap is sized for.
    server.setExecutor(Executors.newFixedThreadPool(2));
    server.createContext("/health", exchange -> {
      if (handleCorsPreflight(exchange)) return;
      respond(exchange, 200, Map.of("status", "ok"));
    });
    server.createContext("/parse", Main::handleParse);
    server.createContext("/export", Main::handleExport);
    server.start();

    System.out.println("javamppms listening on http://" + host + ":" + port);
  }

  /** Returns true if this was an OPTIONS preflight and the exchange is already closed. */
  private static boolean handleCorsPreflight(HttpExchange exchange) throws IOException {
    exchange.getResponseHeaders().set("Access-Control-Allow-Origin", CORS_ORIGIN);
    exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
    if ("OPTIONS".equals(exchange.getRequestMethod())) {
      exchange.sendResponseHeaders(204, -1);
      exchange.close();
      return true;
    }
    return false;
  }

  private static void handleParse(HttpExchange exchange) throws IOException {
    if (handleCorsPreflight(exchange)) return;
    if (!"POST".equals(exchange.getRequestMethod())) {
      respond(exchange, 405, ParseResult.failed(List.of(Diagnostic.file("POST the file bytes to this endpoint."))));
      return;
    }

    byte[] body;
    try (InputStream in = exchange.getRequestBody()) {
      body = in.readNBytes(MAX_BYTES + 1);
    }

    if (body.length == 0) {
      respond(exchange, 400, ParseResult.failed(List.of(Diagnostic.file("Request body was empty."))));
      return;
    }
    if (body.length > MAX_BYTES) {
      respond(exchange, 413, ParseResult.failed(List.of(Diagnostic.file("File is larger than 50 MB."))));
      return;
    }

    ParseResult result;
    try {
      result = MppParser.parse(body);
    } catch (RuntimeException | OutOfMemoryError e) {
      // Never let one bad file take the service down; the backend records it as a failed version.
      result = ParseResult.failed(List.of(Diagnostic.file("Parsing failed: " + e.getClass().getSimpleName())));
    }

    respond(exchange, result.diagnostics().isEmpty() ? 200 : 422, result);
  }

  private static void handleExport(HttpExchange exchange) throws IOException {
    if (handleCorsPreflight(exchange)) return;
    if (!"POST".equals(exchange.getRequestMethod())) {
      respond(exchange, 405, Map.of("status", "error", "message", "POST the schedule JSON to this endpoint."));
      return;
    }

    byte[] body;
    try (InputStream in = exchange.getRequestBody()) {
      body = in.readNBytes(MAX_BYTES + 1);
    }
    if (body.length == 0) {
      respond(exchange, 400, Map.of("status", "error", "message", "Request body was empty."));
      return;
    }
    if (body.length > MAX_BYTES) {
      respond(exchange, 413, Map.of("status", "error", "message", "Request body is larger than 50 MB."));
      return;
    }

    byte[] xml;
    try {
      BuildRequest request = JSON.readValue(body, BuildRequest.class);
      xml = ScheduleBuilder.build(request);
    } catch (RuntimeException | IOException e) {
      respond(exchange, 500, Map.of("status", "error", "message", "Could not build the export: " + describe(e)));
      return;
    }

    exchange.getResponseHeaders().set("Content-Type", "application/xml; charset=utf-8");
    exchange.sendResponseHeaders(200, xml.length);
    try (OutputStream os = exchange.getResponseBody()) {
      os.write(xml);
    }
  }

  private static String describe(Exception e) {
    String message = e.getMessage();
    return message == null || message.isBlank() ? e.getClass().getSimpleName() : message;
  }

  private static void respond(HttpExchange exchange, int status, Object body) throws IOException {
    byte[] out = JSON.writeValueAsBytes(body);
    exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
    exchange.sendResponseHeaders(status, out.length);
    try (OutputStream os = exchange.getResponseBody()) {
      os.write(out);
    }
  }
}
