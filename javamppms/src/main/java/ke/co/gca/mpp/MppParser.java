package ke.co.gca.mpp;

import net.sf.mpxj.Duration;
import net.sf.mpxj.MPXJException;
import net.sf.mpxj.ProjectFile;
import net.sf.mpxj.ProjectProperties;
import net.sf.mpxj.Relation;
import net.sf.mpxj.Resource;
import net.sf.mpxj.ResourceAssignment;
import net.sf.mpxj.Task;
import net.sf.mpxj.TaskType;
import net.sf.mpxj.TimeUnit;
import net.sf.mpxj.reader.UniversalProjectReader;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/** Reads an MS Project file and maps it onto the backend's schedule columns. */
public final class MppParser {

  /** schedule_task_revision.task_name is varchar(500). */
  private static final int MAX_NAME_LENGTH = 500;

  private MppParser() {}

  public static ParseResult parse(byte[] bytes) {
    ProjectFile project;
    try (InputStream in = new ByteArrayInputStream(bytes)) {
      project = new UniversalProjectReader().read(in);
    } catch (MPXJException | IOException | RuntimeException e) {
      return ParseResult.failed(
          List.of(Diagnostic.file("Could not read this file as an MS Project schedule: " + describe(e))));
    }

    if (project == null) {
      return ParseResult.failed(List.of(Diagnostic.file("Unrecognised file format.")));
    }

    ProjectProperties props = project.getProjectProperties();
    List<TaskDto> tasks = new ArrayList<>();
    List<Diagnostic> diagnostics = new ArrayList<>();

    for (Task task : project.getTasks()) {
      if (task.getNull()) {
        continue; // blank spacer rows the planner left in the file
      }
      Integer uniqueId = task.getUniqueID();
      if (uniqueId == null) {
        diagnostics.add(Diagnostic.task(null, "mpp_unique_id", "Task has no Unique ID."));
        continue;
      }
      if (uniqueId == 0) {
        continue; // AC-SCH-05: the MS Project project-summary row is not a task
      }
      TaskDto dto = map(task, uniqueId, props, diagnostics);
      if (dto != null) {
        tasks.add(dto);
      }
    }

    if (diagnostics.isEmpty() && tasks.isEmpty()) {
      return ParseResult.failed(List.of(Diagnostic.file("The file contains no tasks.")));
    }
    if (!diagnostics.isEmpty()) {
      return ParseResult.failed(diagnostics);
    }
    return ParseResult.ok(iso(props.getStatusDate()), projectName(props), tasks);
  }

  /** Returns null when the task produced a diagnostic, so the caller drops it. */
  private static TaskDto map(
      Task task, int uniqueId, ProjectProperties props, List<Diagnostic> diagnostics) {
    int before = diagnostics.size();

    String name = task.getName();
    if (name == null || name.isBlank()) {
      diagnostics.add(Diagnostic.task(uniqueId, "task_name", "Task has no name."));
    } else if (name.length() > MAX_NAME_LENGTH) {
      diagnostics.add(
          Diagnostic.task(
              uniqueId,
              "task_name",
              "Task name is longer than " + MAX_NAME_LENGTH + " characters."));
    }

    Integer outlineLevel = task.getOutlineLevel();
    if (outlineLevel == null) {
      diagnostics.add(Diagnostic.task(uniqueId, "outline_level", "Task has no outline level."));
    }

    LocalDateTime start = task.getStart();
    if (start == null) {
      diagnostics.add(Diagnostic.task(uniqueId, "start", "Task has no start date."));
    }

    LocalDateTime finish = task.getFinish();
    if (finish == null) {
      diagnostics.add(Diagnostic.task(uniqueId, "expected_finish", "Task has no finish date."));
    }

    Integer durationMinutes = durationMinutes(task.getDuration(), props);
    if (durationMinutes == null) {
      diagnostics.add(Diagnostic.task(uniqueId, "duration_minutes", "Task has no duration."));
    }

    BigDecimal pctWork = percentage(task.getPercentageWorkComplete());
    if (outOfRange(pctWork)) {
      diagnostics.add(
          Diagnostic.task(uniqueId, "pct_work_complete", "% Work Complete is " + pctWork + ", outside 0-100."));
    }

    BigDecimal pctComplete = percentage(task.getPercentageComplete());
    if (outOfRange(pctComplete)) {
      diagnostics.add(
          Diagnostic.task(uniqueId, "planned_pct_complete", "% Complete is " + pctComplete + ", outside 0-100."));
    }

    if (diagnostics.size() != before) {
      return null;
    }

    Integer parentId = task.getParentTaskUniqueID();
    if (parentId != null && parentId == 0) {
      parentId = null; // parented to the project-summary row means top level
    }

    return new TaskDto(
        uniqueId,
        parentId,
        outlineLevel,
        task.getWBS(),
        name,
        durationMinutes,
        iso(task.getBaselineStart()),
        iso(task.getBaselineFinish()),
        iso(start),
        iso(finish),
        iso(task.getActualStart()),
        iso(task.getActualFinish()),
        pctWork,
        pctComplete,
        task.getMilestone(),
        task.getSummary(),
        task.getCritical(),
        task.getActive(),
        taskType(task.getType()),
        predecessors(task),
        resourceNames(task));
  }

  private static Integer durationMinutes(Duration duration, ProjectProperties props) {
    if (duration == null) {
      return null;
    }
    double minutes = duration.convertUnits(TimeUnit.MINUTES, props).getDuration();
    return (int) Math.round(minutes);
  }

  /** Absent means zero: MS Project omits the field rather than storing 0. */
  private static BigDecimal percentage(Number value) {
    double raw = value == null ? 0d : value.doubleValue();
    return BigDecimal.valueOf(raw).setScale(2, RoundingMode.HALF_UP);
  }

  private static boolean outOfRange(BigDecimal pct) {
    return pct.signum() < 0 || pct.compareTo(BigDecimal.valueOf(100)) > 0;
  }

  private static String taskType(TaskType type) {
    if (type == null) {
      return "fixed_units"; // the MS Project default
    }
    return switch (type) {
      case FIXED_DURATION, FIXED_DURATION_AND_UNITS -> "fixed_duration";
      case FIXED_WORK -> "fixed_work";
      case FIXED_UNITS -> "fixed_units";
    };
  }

  private static List<Integer> predecessors(Task task) {
    return task.getPredecessors().stream()
        .map(Relation::getPredecessorTask)
        .filter(Objects::nonNull)
        .map(Task::getUniqueID)
        .filter(Objects::nonNull)
        .distinct()
        .toList();
  }

  private static List<String> resourceNames(Task task) {
    return task.getResourceAssignments().stream()
        .map(ResourceAssignment::getResource)
        .filter(Objects::nonNull)
        .map(Resource::getName)
        .filter(n -> n != null && !n.isBlank())
        .distinct()
        .toList();
  }

  private static String projectName(ProjectProperties props) {
    String title = props.getProjectTitle();
    return title == null || title.isBlank() ? props.getName() : title;
  }

  private static String iso(LocalDateTime value) {
    return value == null ? null : value.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
  }

  private static String describe(Exception e) {
    String message = e.getMessage();
    return message == null || message.isBlank() ? e.getClass().getSimpleName() : message;
  }
}
