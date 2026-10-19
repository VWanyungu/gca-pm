package ke.co.gca.mpp;

import java.math.BigDecimal;
import java.util.List;

/**
 * One schedule task, named exactly as the columns it lands in
 * (schedule_task.mpp_unique_id and schedule_task_revision.*), so the backend
 * inserts it without renaming anything.
 *
 * <p>Dates are ISO-8601 local date-times exactly as MS Project stored them: the
 * file carries no zone, and the backend resolves them against project.timezone
 * (AC-GEN-06). Nullable fields here are the ones nullable in the schema.
 */
public record TaskDto(
    int mppUniqueId,
    Integer parentMppUniqueId,
    int outlineLevel,
    String wbs,
    String taskName,
    int durationMinutes,
    String baselineStart,
    String baselineFinish,
    String start,
    String expectedFinish,
    String actualStart,
    String actualFinish,
    BigDecimal pctWorkComplete,
    BigDecimal plannedPctComplete,
    boolean isMilestone,
    boolean isSummary,
    boolean isCritical,
    boolean isActive,
    String taskType,
    List<Integer> predecessors,
    List<String> resourceNames) {}
