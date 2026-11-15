//! Where the pet window appears on screen.

/// Top-left position, in physical pixels, that puts a window of `window_size`
/// in the bottom-right corner of the monitor with `margin` pixels to spare.
///
/// Monitor positions can be negative (a screen left of or above the primary
/// one), so everything is computed in the monitor's own coordinates first.
/// If the window is larger than the monitor minus margins, it is pinned to the
/// monitor's top-left corner instead of being pushed off screen.
pub fn bottom_right(
    monitor_position: (i32, i32),
    monitor_size: (u32, u32),
    window_size: (u32, u32),
    margin: i32,
) -> (i32, i32) {
    let axis = |origin: i32, monitor: u32, window: u32| {
        let free = i64::from(monitor) - i64::from(window) - i64::from(margin);
        // Clamped to i32 so huge or bogus monitor sizes cannot overflow.
        let offset = free.clamp(0, i64::from(i32::MAX)) as i32;
        origin.saturating_add(offset)
    };
    (
        axis(monitor_position.0, monitor_size.0, window_size.0),
        axis(monitor_position.1, monitor_size.1, window_size.1),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sits_in_the_bottom_right_corner_of_the_primary_monitor() {
        assert_eq!(
            bottom_right((0, 0), (1920, 1080), (240, 320), 64),
            (1616, 696)
        );
    }

    #[test]
    fn follows_monitors_at_negative_coordinates() {
        assert_eq!(
            bottom_right((-1920, -200), (1920, 1080), (240, 320), 64),
            (-304, 496)
        );
    }

    #[test]
    fn oversized_window_is_pinned_to_the_monitor_origin() {
        assert_eq!(
            bottom_right((100, 50), (200, 200), (240, 320), 64),
            (100, 50)
        );
    }
}
