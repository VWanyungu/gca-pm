package ke.co.gca.mpp;

import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Round-trips the sample schedule through ScheduleBuilder and back through MppParser — the
 * MSPDI it writes is itself a format MppParser's UniversalProjectReader can read. Checks that
 * what the "export with current data" download exists for survives: every task, its hierarchy,
 * name, dates, percentages and type.
 */
class ScheduleBuilderTest {

  private static byte[] sample() throws Exception {
    try (InputStream in = MppParserTest.class.getResourceAsStream("/sample.mpp")) {
      assertNotNull(in, "sample.mpp missing from test resources");
      return in.readAllBytes();
    }
  }

  @Test
  void roundTripsEveryTaskThroughMspdi() throws Exception {
    ParseResult original = MppParser.parse(sample());
    assertEquals(List.of(), original.diagnostics());

    // schedule_version.status_date is a SQL date (AC-SCH-09): the backend always sends just the
    // date part, never the full date-time MppParser itself produces.
    String statusDate = original.statusDate() == null ? null : original.statusDate().substring(0, 10);
    byte[] xml = ScheduleBuilder.build(new BuildRequest(original.projectName(), statusDate, original.tasks()));

    ParseResult roundTripped = MppParser.parse(xml);
    assertEquals(
        List.of(),
        roundTripped.diagnostics(),
        () -> "re-parsing the export failed: " + roundTripped.diagnostics());
    assertEquals(original.tasks().size(), roundTripped.tasks().size());

    Map<Integer, TaskDto> before =
        original.tasks().stream().collect(Collectors.toMap(TaskDto::mppUniqueId, t -> t));
    Map<Integer, TaskDto> after =
        roundTripped.tasks().stream().collect(Collectors.toMap(TaskDto::mppUniqueId, t -> t));

    for (Map.Entry<Integer, TaskDto> entry : before.entrySet()) {
      TaskDto b = entry.getValue();
      TaskDto a = after.get(entry.getKey());
      String where = "task " + b.mppUniqueId() + " (" + b.taskName() + ")";
      assertNotNull(a, where + " missing after round trip");
      assertEquals(b.taskName(), a.taskName(), where + " name");
      assertEquals(b.parentMppUniqueId(), a.parentMppUniqueId(), where + " parent");
      assertEquals(b.outlineLevel(), a.outlineLevel(), where + " outline level");
      assertEquals(0, b.pctWorkComplete().compareTo(a.pctWorkComplete()), where + " pct_work_complete");
      assertEquals(0, b.plannedPctComplete().compareTo(a.plannedPctComplete()), where + " planned_pct_complete");
      assertEquals(b.isMilestone(), a.isMilestone(), where + " milestone");
      assertEquals(b.isSummary(), a.isSummary(), where + " summary");
      assertEquals(b.taskType(), a.taskType(), where + " task_type");
      assertEquals(b.start(), a.start(), where + " start");
      assertEquals(b.expectedFinish(), a.expectedFinish(), where + " expected_finish");
      assertTrue(
          a.predecessors().containsAll(b.predecessors()),
          where + " lost predecessors: had " + b.predecessors() + ", now " + a.predecessors());
    }
  }
}
