import 'package:flutter_test/flutter_test.dart';
import 'package:nl_client/main.dart';
import 'package:nl_client/src/greeting.dart';

void main() {
  group('greetingFor', () {
    // Each case sits on a boundary hour, where an off-by-one would show up.
    const cases = {
      0: '夜深了，早点休息',
      4: '夜深了，早点休息',
      5: '早上好',
      11: '早上好',
      12: '下午好',
      17: '下午好',
      18: '晚上好',
      22: '晚上好',
      23: '夜深了，早点休息',
    };
    cases.forEach((hour, expected) {
      test('hour $hour greets with "$expected"', () {
        expect(greetingFor(DateTime(2026, 1, 1, hour)), expected);
      });
    });
  });

  testWidgets('home page shows the greeting for the current time', (
    tester,
  ) async {
    await tester.pumpWidget(NlApp(clock: () => DateTime(2026, 1, 1, 9)));
    expect(find.text('早上好'), findsOneWidget);
  });
}
