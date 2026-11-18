/// NL's look for the Flutter app, built from the design tokens.
///
/// The values come from design/tokens.json through tokens.g.dart, which the
/// build generates (web/tokens; run `pnpm tokens` at the repository root
/// before working on the app) and which is never committed. Material's
/// widgets read the [ColorScheme] and [TextTheme] made here; NL's own widgets
/// read every semantic token through [NlTheme.of], because only some of the
/// tokens have a Material role.
library;

import 'package:material_ui/material_ui.dart';

import 'tokens.g.dart';

/// The app's theme for [brightness].
ThemeData nlTheme(Brightness brightness) {
  final tokens = switch (brightness) {
    Brightness.light => NlTokens.light,
    Brightness.dark => NlTokens.dark,
  };
  return ThemeData(
    brightness: brightness,
    colorScheme: _colorScheme(brightness, tokens),
    scaffoldBackgroundColor: tokens.colorSurfaceApp,
    textTheme: _textTheme(tokens),
    // A calm interface (UI design note, section 3): pressed and hovered
    // elements take the state overlays of the tokens instead of Material's
    // ink ripples.
    splashFactory: NoSplash.splashFactory,
    highlightColor: tokens.colorStatePressed,
    hoverColor: tokens.colorStateHover,
    focusColor: tokens.colorStateSelected,
    dividerColor: tokens.colorLineSubtle,
    extensions: [NlTheme(tokens)],
  );
}

ColorScheme _colorScheme(Brightness brightness, NlThemeTokens tokens) {
  return ColorScheme(
    brightness: brightness,
    // Primary actions are neutral on purpose: color belongs to the
    // character and its messages, not to the interface.
    primary: tokens.colorActionFill,
    onPrimary: tokens.colorActionOnFill,
    secondary: tokens.colorAccentFill,
    onSecondary: tokens.colorAccentOnFill,
    secondaryContainer: tokens.colorAccentSoft,
    onSecondaryContainer: tokens.colorInkPrimary,
    inversePrimary: tokens.colorAccentText,
    error: tokens.colorDangerFill,
    onError: tokens.colorDangerOnFill,
    errorContainer: tokens.colorDangerSoft,
    onErrorContainer: tokens.colorDangerText,
    surface: tokens.colorSurfaceApp,
    onSurface: tokens.colorInkPrimary,
    onSurfaceVariant: tokens.colorInkSecondary,
    surfaceDim: tokens.colorSurfaceSidebar,
    surfaceBright: tokens.colorSurfaceRaised,
    surfaceContainerLowest: tokens.colorSurfaceRaised,
    surfaceContainerLow: tokens.colorSurfaceRaised,
    surfaceContainer: tokens.colorSurfaceSidebar,
    surfaceContainerHigh: tokens.colorSurfaceOverlay,
    surfaceContainerHighest: tokens.colorSurfaceSunken,
    inverseSurface: tokens.colorSurfaceInverse,
    onInverseSurface: tokens.colorInkInverse,
    outline: tokens.colorLineStrong,
    outlineVariant: tokens.colorLineSubtle,
    scrim: tokens.colorScrim,
    shadow: const Color(0xFF000000),
    // Surfaces stay flat: no tint of the primary color on raised layers.
    surfaceTint: const Color(0x00000000),
  );
}

/// Every Material text role mapped to one of the token text styles, so that
/// no widget falls back to Material's own sizes.
TextTheme _textTheme(NlThemeTokens tokens) {
  return const TextTheme(
    displayLarge: NlTokens.typeDisplay,
    displayMedium: NlTokens.typeDisplay,
    displaySmall: NlTokens.typeDisplay,
    headlineLarge: NlTokens.typeHeadline,
    headlineMedium: NlTokens.typeHeadline,
    headlineSmall: NlTokens.typeHeadline,
    titleLarge: NlTokens.typeTitle,
    titleMedium: NlTokens.typeUiStrong,
    titleSmall: NlTokens.typeUiStrong,
    bodyLarge: NlTokens.typeBody,
    bodyMedium: NlTokens.typeUi,
    bodySmall: NlTokens.typeCaption,
    labelLarge: NlTokens.typeUiStrong,
    labelMedium: NlTokens.typeCaption,
    labelSmall: NlTokens.typeCaption,
  ).apply(
    bodyColor: tokens.colorInkPrimary,
    displayColor: tokens.colorInkPrimary,
  );
}

/// The current theme's design tokens, for NL's own widgets.
///
/// ```dart
/// final tokens = NlTheme.of(context);
/// DecoratedBox(decoration: BoxDecoration(color: tokens.colorBubbleUser));
/// ```
final class NlTheme extends ThemeExtension<NlTheme> {
  const NlTheme(this.tokens);

  final NlThemeTokens tokens;

  /// The tokens of the theme around [context]. Every [ThemeData] made by
  /// [nlTheme] carries them.
  static NlThemeTokens of(BuildContext context) {
    final theme = Theme.of(context).extension<NlTheme>();
    assert(theme != null, 'NlTheme.of needs a ThemeData made by nlTheme');
    return theme!.tokens;
  }

  @override
  NlTheme copyWith({NlThemeTokens? tokens}) => NlTheme(tokens ?? this.tokens);

  @override
  NlTheme lerp(NlTheme? other, double t) {
    if (other == null) return this;
    return NlTheme(NlThemeTokens.lerp(tokens, other.tokens, t));
  }
}
