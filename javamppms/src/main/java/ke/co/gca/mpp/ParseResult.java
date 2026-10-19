package ke.co.gca.mpp;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/**
 * The service's only response shape. {@code tasks} is populated only when
 * {@code diagnostics} is empty: parsing is all-or-nothing (AC-SCH-04), so a file
 * with any diagnostic yields no rows for the backend to apply.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ParseResult(
    String statusDate,
    String projectName,
    Integer taskCount,
    List<TaskDto> tasks,
    List<Diagnostic> diagnostics) {

  public static ParseResult ok(String statusDate, String projectName, List<TaskDto> tasks) {
    return new ParseResult(statusDate, projectName, tasks.size(), tasks, List.of());
  }

  public static ParseResult failed(List<Diagnostic> diagnostics) {
    return new ParseResult(null, null, null, null, diagnostics);
  }
}
