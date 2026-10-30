package ke.co.gca.mpp;

import java.util.List;

/**
 * Input to {@link ScheduleBuilder}: the schedule's current state, shaped exactly like
 * {@link ParseResult}'s success case so the backend can send what it already has.
 */
public record BuildRequest(String projectName, String statusDate, List<TaskDto> tasks) {}
