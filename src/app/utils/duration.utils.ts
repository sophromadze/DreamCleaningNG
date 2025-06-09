export class DurationUtils {
  /**
   * Rounds duration to nearest 30 minutes for display purposes
   * @param totalMinutes The actual duration in minutes
   * @returns Rounded duration in minutes
   */
  static roundToNearestHalfHour(totalMinutes: number): number {
    // Round to nearest 30 minutes
    return Math.round(totalMinutes / 30) * 30;
  }

  /**
   * Formats duration for display with rounding
   * @param totalMinutes The actual duration in minutes
   * @returns Formatted string like "2h 30m" or "45m"
   */
  static formatDurationRounded(totalMinutes: number): string {
    const roundedMinutes = this.roundToNearestHalfHour(totalMinutes);
    const hours = Math.floor(roundedMinutes / 60);
    const mins = roundedMinutes % 60;
    
    if (hours === 0) {
      return `${mins}m`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}m`;
    }
  }
}
