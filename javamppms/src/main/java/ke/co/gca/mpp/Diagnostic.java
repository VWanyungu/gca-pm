package ke.co.gca.mpp;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * One reason a file could not be turned into schedule rows. Stored verbatim in
 * schedule_version.parse_diagnostics when the version is marked failed (AC-SCH-04).
 *
 * @param mppUniqueId the offending task, or null when the problem is with the file as a whole
 * @param field       the target column the value would have gone into, or null
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record Diagnostic(Integer mppUniqueId, String field, String message) {

  public static Diagnostic file(String message) {
    return new Diagnostic(null, null, message);
  }

  public static Diagnostic task(Integer mppUniqueId, String field, String message) {
    return new Diagnostic(mppUniqueId, field, message);
  }
}
