package ke.co.gca.mpp;

import net.sf.mpxj.ChildTaskContainer;
import net.sf.mpxj.Duration;
import net.sf.mpxj.ProjectFile;
import net.sf.mpxj.ProjectProperties;
import net.sf.mpxj.Relation;
import net.sf.mpxj.RelationType;
import net.sf.mpxj.Resource;
import net.sf.mpxj.Task;
import net.sf.mpxj.TaskType;
import net.sf.mpxj.TimeUnit;
import net.sf.mpxj.mspdi.MSPDIWriter;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The inverse of {@link MppParser}: the schedule's current DB state in, an MS Project file
 * out. Used for the "export with current data" download — write-backs and everything else
 * that only ever lived in the database, not in any uploaded file. There is no way to produce
 * a binary .mpp without a commercial library (MPXJ cannot write one), so this writes MSPDI,
 * the XML interchange format MS Project opens natively.
 */
public final class ScheduleBuilder {

  private ScheduleBuilder() {}

  public static byte[] build(BuildRequest request) throws IOException {
    ProjectFile project = new ProjectFile();
    project.getProjectProperties().setDefaultCalendar(project.addDefaultBaseCalendar());

    ProjectProperties props = project.getProjectProperties();
    if (request.projectName() != null && !request.projectName().isBlank()) {
      props.setProjectTitle(request.projectName());
      props.setName(request.projectName());
    }
    if (request.statusDate() != null) {
      // schedule_version.status_date is a SQL date, not a timestamp (AC-SCH-09) — it comes
      // across as "2026-10-26", never a full date-time.
      props.setStatusDate(LocalDate.parse(request.statusDate()).atStartOfDay());
    }

    List<TaskDto> tasks = request.tasks() == null ? List.of() : request.tasks();
    Map<Integer, List<TaskDto>> childrenByParent = new LinkedHashMap<>();
    for (TaskDto dto : tasks) {
      childrenByParent.computeIfAbsent(dto.parentMppUniqueId(), k -> new ArrayList<>()).add(dto);
    }

    Map<Integer, Task> byUniqueId = new HashMap<>();
    Map<String, Resource> resourcesByName = new HashMap<>();
    for (TaskDto root : childrenByParent.getOrDefault(null, List.of())) {
      createTaskTree(project, root, childrenByParent, byUniqueId, resourcesByName);
    }

    // Predecessors last: a task can reference any other task regardless of hierarchy order.
    for (TaskDto dto : tasks) {
      Task task = byUniqueId.get(dto.mppUniqueId());
      for (Integer predecessorId : dto.predecessors()) {
        Task predecessor = byUniqueId.get(predecessorId);
        if (predecessor != null) {
          task.addPredecessor(
              new Relation.Builder().predecessorTask(predecessor).type(RelationType.FINISH_START));
        }
      }
    }

    project.updateStructure();

    ByteArrayOutputStream out = new ByteArrayOutputStream();
    new MSPDIWriter().write(project, out);
    return out.toByteArray();
  }

  private static void createTaskTree(
      ChildTaskContainer parent,
      TaskDto dto,
      Map<Integer, List<TaskDto>> childrenByParent,
      Map<Integer, Task> byUniqueId,
      Map<String, Resource> resourcesByName) {
    Task task = parent.addTask();
    task.setUniqueID(dto.mppUniqueId());
    task.setName(dto.taskName());
    task.setOutlineLevel(dto.outlineLevel());
    task.setWBS(dto.wbs());
    task.setDuration(Duration.getInstance(dto.durationMinutes(), TimeUnit.MINUTES));
    task.setStart(LocalDateTime.parse(dto.start()));
    task.setFinish(LocalDateTime.parse(dto.expectedFinish()));
    if (dto.baselineStart() != null) {
      task.setBaselineStart(LocalDateTime.parse(dto.baselineStart()));
    }
    if (dto.baselineFinish() != null) {
      task.setBaselineFinish(LocalDateTime.parse(dto.baselineFinish()));
    }
    if (dto.actualStart() != null) {
      task.setActualStart(LocalDateTime.parse(dto.actualStart()));
    }
    if (dto.actualFinish() != null) {
      task.setActualFinish(LocalDateTime.parse(dto.actualFinish()));
    }
    task.setPercentageWorkComplete(dto.pctWorkComplete());
    task.setPercentageComplete(dto.plannedPctComplete());
    task.setMilestone(dto.isMilestone());
    task.setSummary(dto.isSummary());
    task.setCritical(dto.isCritical());
    task.setActive(dto.isActive());
    task.setType(taskType(dto.taskType()));

    for (String resourceName : dto.resourceNames()) {
      if (resourceName == null || resourceName.isBlank()) {
        continue;
      }
      Resource resource =
          resourcesByName.computeIfAbsent(
              resourceName,
              name -> {
                Resource r = task.getParentFile().addResource();
                r.setName(name);
                return r;
              });
      task.addResourceAssignment(resource);
    }

    byUniqueId.put(dto.mppUniqueId(), task);

    for (TaskDto child : childrenByParent.getOrDefault(dto.mppUniqueId(), List.of())) {
      createTaskTree(task, child, childrenByParent, byUniqueId, resourcesByName);
    }
  }

  private static TaskType taskType(String type) {
    if (type == null) {
      return TaskType.FIXED_UNITS;
    }
    return switch (type) {
      case "fixed_duration" -> TaskType.FIXED_DURATION;
      case "fixed_work" -> TaskType.FIXED_WORK;
      default -> TaskType.FIXED_UNITS;
    };
  }
}
