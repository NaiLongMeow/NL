/// Greeting the companion opens with, chosen by the local time of day.
///
/// Boundaries: morning is 05:00-11:59, afternoon 12:00-17:59, evening
/// 18:00-22:59, and anything later or earlier counts as late night, when the
/// companion nudges the user to rest instead.
String greetingFor(DateTime time) {
  final hour = time.hour;
  if (hour >= 5 && hour < 12) return '早上好';
  if (hour >= 12 && hour < 18) return '下午好';
  if (hour >= 18 && hour < 23) return '晚上好';
  return '夜深了，早点休息';
}
