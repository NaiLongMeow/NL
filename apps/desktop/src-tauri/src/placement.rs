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

/// Physical pixel size of a window configured as `logical_size` on a monitor
/// with the given scale factor, rounded to whole pixels.
///
/// The pet's size is taken from its configuration rather than asked from the
/// window: on Linux a hidden GTK window is not realized yet and reports a size
/// of 0x0, which would place the pet almost entirely off screen.
pub fn physical_size(logical_size: (f64, f64), scale_factor: f64) -> (u32, u32) {
    // `as u32` saturates, so negative or NaN inputs become 0 instead of wrapping.
    (
        (logical_size.0 * scale_factor).round() as u32,
        (logical_size.1 * scale_factor).round() as u32,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn logical_size_is_scaled_to_physical_pixels() {
        assert_eq!(physical_size((240.0, 320.0), 1.0), (240, 320));
        assert_eq!(physical_size((240.0, 320.0), 1.5), (360, 480));
        // 125% scaling yields fractional pixels, which round to the nearest one.
        assert_eq!(physical_size((241.0, 321.0), 1.25), (301, 401));
    }

    #[test]
    fn nonsensical_inputs_saturate_to_zero() {
        assert_eq!(physical_size((-10.0, f64::NAN), 1.0), (0, 0));
    }

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
