import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:nl_client/main.dart';
import 'package:nl_client/src/theme/nl_theme.dart';
import 'package:nl_client/src/theme/tokens.g.dart';

void main() {
  group('nlTheme', () {
    for (final (brightness, tokens) in [
      (Brightness.light, NlTokens.light),
      (Brightness.dark, NlTokens.dark),
    ]) {
      test('${brightness.name} takes its colors from the tokens', () {
        final theme = nlTheme(brightness);
        expect(theme.brightness, brightness);
        expect(theme.scaffoldBackgroundColor, tokens.colorSurfaceApp);
        expect(theme.colorScheme.surface, tokens.colorSurfaceApp);
        expect(theme.colorScheme.onSurface, tokens.colorInkPrimary);
        // Primary actions are neutral; the accent is the character's.
        expect(theme.colorScheme.primary, tokens.colorActionFill);
        expect(theme.colorScheme.secondary, tokens.colorAccentFill);
        expect(theme.colorScheme.error, tokens.colorDangerFill);
        expect(theme.extension<NlTheme>()?.tokens, same(tokens));
      });

      test('${brightness.name} maps every text role to a token style', () {
        final text = nlTheme(brightness).textTheme;
        final styles = [
          text.displayLarge,
          text.displayMedium,
          text.displaySmall,
          text.headlineLarge,
          text.headlineMedium,
          text.headlineSmall,
          text.titleLarge,
          text.titleMedium,
          text.titleSmall,
          text.bodyLarge,
          text.bodyMedium,
          text.bodySmall,
          text.labelLarge,
          text.labelMedium,
          text.labelSmall,
        ];
        final tokenSizes = {
          NlTokens.typeDisplay.fontSize,
          NlTokens.typeHeadline.fontSize,
          NlTokens.typeTitle.fontSize,
          NlTokens.typeBody.fontSize,
          NlTokens.typeUi.fontSize,
          NlTokens.typeUiStrong.fontSize,
          NlTokens.typeCaption.fontSize,
        };
        for (final style in styles) {
          expect(tokenSizes, contains(style?.fontSize));
          expect(style?.color, tokens.colorInkPrimary);
        }
        expect(text.bodyLarge?.fontSize, NlTokens.typeBody.fontSize);
        expect(text.bodyLarge?.height, NlTokens.typeBody.height);
      });
    }
  });

  group('NlTheme', () {
    const light = NlTheme(NlTokens.light);
    const dark = NlTheme(NlTokens.dark);

    test('interpolates between themes', () {
      expect(
        light.lerp(dark, 0).tokens.colorSurfaceApp,
        NlTokens.light.colorSurfaceApp,
      );
      expect(
        light.lerp(dark, 1).tokens.colorSurfaceApp,
        NlTokens.dark.colorSurfaceApp,
      );
      final halfway = light.lerp(dark, 0.5).tokens.colorSurfaceApp;
      expect(halfway, isNot(NlTokens.light.colorSurfaceApp));
      expect(halfway, isNot(NlTokens.dark.colorSurfaceApp));
      expect(light.lerp(null, 0.5), same(light));
    });

    test('copyWith replaces the tokens', () {
      expect(light.copyWith(tokens: NlTokens.dark).tokens, same(NlTokens.dark));
      expect(light.copyWith().tokens, same(NlTokens.light));
    });
  });

  testWidgets('the app follows the system theme', (tester) async {
    addTearDown(tester.platformDispatcher.clearPlatformBrightnessTestValue);
    for (final (brightness, tokens) in [
      (Brightness.light, NlTokens.light),
      (Brightness.dark, NlTokens.dark),
    ]) {
      tester.platformDispatcher.platformBrightnessTestValue = brightness;
      await tester.pumpWidget(NlApp(clock: () => DateTime(2026, 1, 1, 9)));
      await tester.pumpAndSettle();
      final context = tester.element(find.byType(HomePage));
      expect(NlTheme.of(context), same(tokens));
      expect(Theme.of(context).scaffoldBackgroundColor, tokens.colorSurfaceApp);
    }
  });
}
