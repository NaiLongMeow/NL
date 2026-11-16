// NL client: the mobile app and the desktop main app share this code base.
//
// On desktop it is one of three processes (next to the nl-node daemon and the
// desktop pet); on mobile it is an intermittently online light node. See
// docs/architecture.md. For now it only shows the companion's home screen.

import 'package:material_ui/material_ui.dart';

import 'src/greeting.dart';

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
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFFF5A623)),
      ),
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
