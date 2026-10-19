package ke.co.gca.mpp;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Parses a real planner-produced .mpp and checks every field the backend stores is usable. */
class MppParserTest {

  private static byte[] sample() throws Exception {
    try (InputStream in = MppParserTest.class.getResourceAsStream("/sample.mpp")) {
      assertNotNull(in, "sample.mpp missing from test resources");
      return in.readAllBytes();
    }
  }

  @Test
  void parsesTheSampleScheduleWithoutDiagnostics() throws Exception {
    ParseResult result = MppParser.parse(sample());

    assertEquals(
        java.util.List.of(),
        result.diagnostics(),
        () -> "expected a clean parse, got: " + result.diagnostics());
    assertNotNull(result.tasks());
    assertTrue(result.tasks().size() > 10, "expected a real schedule, got " + result.tasks().size());
    assertEquals(result.tasks().size(), result.taskCount());

    System.out.println("project      = " + result.projectName());
    System.out.println("status_date  = " + result.statusDate());
    System.out.println("task_count   = " + result.taskCount());

    ObjectMapper json =
        new ObjectMapper()
            .setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
            .enable(SerializationFeature.INDENT_OUTPUT);
    System.out.println("first summary row:\n"
        + json.writeValueAsString(
            result.tasks().stream().filter(TaskDto::isSummary).findFirst().orElse(result.tasks().get(0))));
    System.out.println("first leaf row:\n"
        + json.writeValueAsString(
            result.tasks().stream().filter(t -> !t.isSummary()).findFirst().orElse(result.tasks().get(0))));
    System.out.println("milestones   = " + result.tasks().stream().filter(TaskDto::isMilestone).count());
    System.out.println("with preds   = " + result.tasks().stream().filter(t -> !t.predecessors().isEmpty()).count());
    System.out.println("with resources = " + result.tasks().stream().filter(t -> !t.resourceNames().isEmpty()).count());
    System.out.println("inactive     = " + result.tasks().stream().filter(t -> !t.isActive()).count());
    System.out.println("baselined    = " + result.tasks().stream().filter(t -> t.baselineStart() != null).count());
    System.out.println("top level    = " + result.tasks().stream().filter(t -> t.parentMppUniqueId() == null).count());
  }

  /** Every NOT NULL column must have a value, and nothing may point at a task that is not here. */
  @Test
  void everyRowCanBeInsertedByTheBackend() throws Exception {
    ParseResult result = MppParser.parse(sample());
    Set<Integer> ids = new HashSet<>();

    for (TaskDto task : result.tasks()) {
      String where = "task " + task.mppUniqueId() + " (" + task.taskName() + ")";
      assertTrue(ids.add(task.mppUniqueId()), "duplicate mpp_unique_id in " + where);
      assertNotEqualsZero(task.mppUniqueId());
      assertNotNull(task.taskName(), where + " task_name");
      assertFalse(task.taskName().isBlank(), where + " task_name blank");
      assertTrue(task.taskName().length() <= 500, where + " task_name too long");
      assertNotNull(task.start(), where + " start");
      assertNotNull(task.expectedFinish(), where + " expected_finish");
      assertNotNull(task.pctWorkComplete(), where + " pct_work_complete");
      assertNotNull(task.plannedPctComplete(), where + " planned_pct_complete");
      assertTrue(task.durationMinutes() >= 0, where + " duration_minutes negative");
      assertTrue(task.outlineLevel() >= 0, where + " outline_level negative");
      assertNotNull(task.taskType(), where + " task_type");
      assertTrue(
          Set.of("fixed_units", "fixed_duration", "fixed_work").contains(task.taskType()),
          where + " task_type not in the schedule_task_type enum: " + task.taskType());
      assertNotNull(task.predecessors(), where + " predecessors");
      assertNotNull(task.resourceNames(), where + " resource_names");
    }

    // parent_task_id and predecessors are resolved against this same payload, so both must point inside it.
    for (TaskDto task : result.tasks()) {
      if (task.parentMppUniqueId() != null) {
        assertTrue(
            ids.contains(task.parentMppUniqueId()),
            "task " + task.mppUniqueId() + " has parent " + task.parentMppUniqueId() + " which is not in the payload");
      }
      for (Integer predecessor : task.predecessors()) {
        assertTrue(
            ids.contains(predecessor),
            "task " + task.mppUniqueId() + " has predecessor " + predecessor + " which is not in the payload");
      }
    }
  }

  /**
   * A leaf milestone is a zero-duration marker. Summary rows are a different matter: this
   * sample carries three ("Ground Floor", "1st Floor", "2nd Floor") that are flagged as
   * milestones and still span weeks, so nothing downstream may infer duration from the flag.
   */
  @Test
  void leafMilestonesHaveZeroDuration() throws Exception {
    ParseResult result = MppParser.parse(sample());
    String offenders =
        result.tasks().stream()
            .filter(TaskDto::isMilestone)
            .filter(t -> !t.isSummary())
            .filter(t -> t.durationMinutes() != 0)
            .map(t -> t.mppUniqueId() + "=" + t.durationMinutes() + "m")
            .collect(Collectors.joining(", "));
    assertEquals("", offenders, "leaf milestones with non-zero duration: " + offenders);
  }

  /** The milestone flag is passed through as the file sets it, never derived from duration. */
  @Test
  void summaryRowsCanAlsoBeFlaggedAsMilestones() throws Exception {
    ParseResult result = MppParser.parse(sample());
    long summaryMilestones =
        result.tasks().stream().filter(TaskDto::isMilestone).filter(TaskDto::isSummary).count();
    assertEquals(
        3,
        summaryMilestones,
        "sample.mpp has three summary rows flagged as milestones; the parser must not zero or drop them");
  }

  @Test
  void rejectsSomethingThatIsNotAProjectFile() {
    ParseResult result = MppParser.parse("this is not a project file".getBytes());
    assertFalse(result.diagnostics().isEmpty(), "expected a diagnostic");
    assertNull(result.tasks(), "a failed parse must yield no rows (AC-SCH-04)");
  }

  @Test
  void rejectsAnEmptyBody() {
    ParseResult result = MppParser.parse(new byte[0]);
    assertFalse(result.diagnostics().isEmpty(), "expected a diagnostic");
  }

  private static void assertNotEqualsZero(int uniqueId) {
    assertTrue(uniqueId != 0, "the project-summary row (UniqueID 0) must be skipped (AC-SCH-05)");
  }

  private static void assertNull(Object value, String message) {
    assertTrue(value == null, message);
  }
}
