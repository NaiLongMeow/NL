// NL mobile app (Android and iOS). The desktop app is a separate Tauri app
// in apps/desktop; the two share the design tokens, not code.
//
// For now it only shows the companion's home screen.

import 'package:material_ui/material_ui.dart';

import 'src/greeting.dart';
import 'src/theme/nl_theme.dart';

void main() {
  runApp(const NlApp());
}

/// Root widget of the NL client.
class NlApp extends StatelessWidget {
  const NlApp({super.key, this.clock = DateTime.now});

  /// Source of the current time, injectable so tests are deterministic.
  final DateTime Function() clock;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'NL',
      // Light and dark follow the system setting.
      theme: nlTheme(Brightness.light),
      darkTheme: nlTheme(Brightness.dark),
      home: HomePage(clock: clock),
    );
  }
}

/// The companion's home screen: greets the user according to the time of day.
class HomePage extends StatelessWidget {
  const HomePage({super.key, required this.clock});

  final DateTime Function() clock;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Text(
          greetingFor(clock()),
          style: Theme.of(context).textTheme.headlineMedium,
        ),
      ),
    );
  }
}
