/**
 * Settings (UI design note, section 5, screen 9). Stage 1 builds the parts
 * the user asked to review: appearance (the built-in themes with a preview
 * of each, light or dark, and a custom theme on top, section 11), the
 * interface language, how long an idle session waits before it archives
 * itself (section 4.11), and the desktop pet's mode and avatar (section 6).
 * The other settings arrive with their stages.
 */

import { useId, useMemo, type ReactNode } from "react";
import { Check, FolderOpen, RotateCcw } from "lucide-react";
import { ToggleGroup } from "radix-ui";
import { localizedText } from "@nl/avatar-skill/format";
import type { Mode } from "@nl/tokens";
import { THEME_NAMES, type Appearance, type ModeChoice } from "../app/appearance";
import type { CustomThemes } from "../app/native";
import { avatarFileUrl, checkAvatar, type AvatarList, type AvatarProblem } from "../avatars/avatars";
import { useI18n } from "../i18n/I18n";
import { LOCALE_NAMES, type Locale } from "../i18n/messages";
import { canShowLive2D, type PetMode, type PetPrefs } from "../pet/look";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import styles from "./SettingsScreen.module.css";

/** The idle times offered before a session archives itself, in minutes. */
export const IDLE_LIMITS = [10, 30, 60, 120] as const;

/** The command that adds the nl-avatar skill (skills/nl-avatar) to an agent such as Claude Code or Codex. */
export const SKILL_COMMAND = "npx skills add NaiLongMeow/NL --skill nl-avatar";

interface Props {
  appearance: Appearance;
  /** The mode in use, which the theme previews show. */
  mode: Mode;
  onAppearance: (appearance: Appearance) => void;
  /** The custom theme files, or null outside the desktop app. */
  custom: CustomThemes | null;
  onReloadCustom: () => void;
  onOpenCustomFolder: () => void;
  idleLimit: number;
  onIdleLimit: (minutes: number) => void;
  pet: PetPrefs;
  onPet: (prefs: PetPrefs) => void;
  /** The installed avatars, or null outside the desktop app. */
  avatars: AvatarList | null;
  onReloadAvatars: () => void;
  onOpenAvatarsFolder: () => void;
}

/** A row of mutually exclusive choices (Radix ToggleGroup: arrow keys move between them). */
function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<readonly [T, string]>;
  onChange: (value: T) => void;
}) {
  return (
    <ToggleGroup.Root
      type="single"
      className={styles.choice}
      aria-label={label}
      value={value}
      onValueChange={(next) => next && onChange(next as T)}
    >
      {options.map(([option, text]) => (
        <ToggleGroup.Item key={option} value={option} className={styles.choiceItem}>
          {text}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section className={styles.section} aria-labelledby={id}>
      <h2 id={id} className={styles.sectionTitle}>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** A miniature window in a theme's colors: the attributes on the card choose the theme for it. */
function ThemePreview() {
  return (
    <span className={styles.preview} aria-hidden>
      <span className={styles.previewSidebar}>
        <i />
        <i />
        <i />
      </span>
      <span className={styles.previewMain}>
        <span className={styles.previewUser} />
        <span className={styles.previewCharacter} />
        <span className={styles.previewButton} />
      </span>
    </span>
  );
}

export function SettingsScreen({
  appearance,
  mode,
  onAppearance,
  custom,
  onReloadCustom,
  onOpenCustomFolder,
  idleLimit,
  onIdleLimit,
  pet,
  onPet,
  avatars,
  onReloadAvatars,
  onOpenAvatarsFolder,
}: Props) {
  const { t, locale, setLocale } = useI18n();
  const themeLabel = useId();
  const customLabel = useId();
  const modeOptions: ReadonlyArray<readonly [ModeChoice, string]> = [
    ["system", t.settings.modes.system],
    ["light", t.settings.modes.light],
    ["dark", t.settings.modes.dark],
  ];
  const localeOptions = (Object.keys(LOCALE_NAMES) as Locale[]).map((option) => [option, LOCALE_NAMES[option]] as const);
  const idleOptions = IDLE_LIMITS.map(
    (minutes) => [String(minutes), minutes < 60 ? t.settings.minutes(minutes) : t.settings.hours(minutes / 60)] as const,
  );

  return (
    <main className={styles.screen} aria-label={t.settings.title}>
      <div className={styles.column}>
        <Section title={t.settings.appearance}>
          <h3 id={themeLabel} className={styles.label}>
            {t.settings.theme}
          </h3>
          <div className={styles.themes} role="radiogroup" aria-labelledby={themeLabel}>
            {THEME_NAMES.map((name) => (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={appearance.theme === name}
                className={styles.theme}
                data-theme={name}
                data-mode={mode}
                onClick={() => onAppearance({ ...appearance, theme: name })}
              >
                <ThemePreview />
                <span className={styles.themeName}>
                  {appearance.theme === name && <Check aria-hidden />}
                  {t.settings.themes[name]}
                </span>
              </button>
            ))}
          </div>

          <h3 className={styles.label}>{t.settings.mode}</h3>
          <Choice
            label={t.settings.mode}
            value={appearance.mode}
            options={modeOptions}
            onChange={(next) => onAppearance({ ...appearance, mode: next })}
          />

          <h3 id={customLabel} className={styles.label}>
            {t.settings.custom}
          </h3>
          <p className={styles.hint}>{t.settings.customHint}</p>
          {custom === null ? (
            <p className={styles.hint}>{t.settings.customDesktopOnly}</p>
          ) : (
            <>
              <div className={styles.customList} role="radiogroup" aria-labelledby={customLabel}>
                {[{ file: null, name: t.settings.customNone, problem: null }, ...custom.themes].map((theme) => (
                  <label key={theme.file ?? ""} className={styles.customItem} data-problem={theme.problem ?? undefined}>
                    <input
                      type="radio"
                      name="custom-theme"
                      checked={appearance.custom === theme.file}
                      disabled={theme.problem !== null}
                      onChange={() => onAppearance({ ...appearance, custom: theme.file })}
                    />
                    <span>{theme.name}</span>
                    {theme.problem && <span className={styles.problem}>{t.settings.customProblem[theme.problem]}</span>}
                  </label>
                ))}
              </div>
              {custom.themes.length === 0 && <p className={styles.hint}>{t.settings.customEmpty}</p>}
              <div className={styles.customActions}>
                <Button size="sm" icon={<FolderOpen />} onClick={onOpenCustomFolder}>
                  {t.settings.customFolder}
                </Button>
                <Button size="sm" variant="ghost" icon={<RotateCcw />} onClick={onReloadCustom}>
                  {t.settings.customReload}
                </Button>
              </div>
              <code className={styles.folder}>{custom.folder}</code>
            </>
          )}
        </Section>

        <Section title={t.settings.language}>
          <Choice label={t.settings.language} value={locale} options={localeOptions} onChange={setLocale} />
        </Section>

        <Section title={t.settings.sessions}>
          <h3 className={styles.label}>{t.settings.idleLimit}</h3>
          <Choice
            label={t.settings.idleLimit}
            value={String(idleLimit)}
            options={idleOptions}
            onChange={(next) => onIdleLimit(Number(next))}
          />
        </Section>

        <PetSection pet={pet} onPet={onPet} avatars={avatars} onReload={onReloadAvatars} onOpenFolder={onOpenAvatarsFolder} />
      </div>
    </main>
  );
}

/**
 * The desktop pet (UI design note, section 6): light or Live2D mode, the
 * avatar for that mode, the avatars folder, and how to have an AI agent
 * import art with the nl-avatar skill.
 */
function PetSection({
  pet,
  onPet,
  avatars,
  onReload,
  onOpenFolder,
}: {
  pet: PetPrefs;
  onPet: (prefs: PetPrefs) => void;
  avatars: AvatarList | null;
  onReload: () => void;
  onOpenFolder: () => void;
}) {
  const { t, locale } = useI18n();
  const texts = t.settings.pet;
  const avatarLabel = useId();
  const checked = useMemo(() => avatars?.avatars.map(checkAvatar) ?? [], [avatars]);
  const mode = pet.mode;
  const chosen = mode === "light" ? pet.light : pet.live2d;
  const choose = (key: string | null) => onPet(mode === "light" ? { ...pet, light: key } : { ...pet, live2d: key });
  // Broken avatars show in both lists, so that the user learns what is wrong with them.
  const listed = checked.filter((avatar) => !avatar.manifest || (mode === "light" ? avatar.manifest.light : avatar.manifest.live2d));
  const modeOptions: ReadonlyArray<readonly [PetMode, string]> = [
    ["light", texts.modes.light],
    ["live2d", texts.modes.live2d],
  ];
  const live2d = avatars?.live2d ?? "no-runtime";
  const problemText = (problem: AvatarProblem) =>
    problem.kind === "pack"
      ? texts.problem[problem.problem]
      : problem.kind === "folder"
        ? texts.folderProblem(problem.id)
        : texts.manifestProblem(problem.issue.at || "avatar.json");

  return (
    <Section title={texts.title}>
      <h3 className={styles.label}>{texts.mode}</h3>
      <Choice label={texts.mode} value={mode} options={modeOptions} onChange={(next) => onPet({ ...pet, mode: next })} />
      <p className={styles.hint}>{mode === "light" ? texts.lightHint : texts.live2dHint}</p>
      {mode === "live2d" && avatars !== null && live2d !== "ready" && (
        <p className={styles.notice} data-tone={canShowLive2D(live2d) ? undefined : "warning"}>
          {texts.live2dStatus[live2d]}
        </p>
      )}

      <h3 id={avatarLabel} className={styles.label}>
        {texts.avatar}
      </h3>
      {avatars === null ? (
        <p className={styles.hint}>{texts.desktopOnly}</p>
      ) : (
        <>
          <div className={styles.avatarList} role="radiogroup" aria-labelledby={avatarLabel}>
            {mode === "light" && (
              <label className={styles.avatarItem}>
                <input type="radio" name="pet-avatar" checked={chosen === null} onChange={() => choose(null)} />
                <span className={styles.avatarIcon} aria-hidden>
                  <Avatar size={28} />
                </span>
                <span className={styles.avatarText}>
                  <span className={styles.avatarName}>{texts.ball}</span>
                  <span className={styles.avatarMeta}>{texts.ballDetail}</span>
                </span>
              </label>
            )}
            {listed.map((avatar) => {
              const manifest = avatar.manifest;
              return (
                <label key={avatar.key} className={styles.avatarItem} data-problem={avatar.problem ? true : undefined}>
                  <input
                    type="radio"
                    name="pet-avatar"
                    checked={chosen === avatar.key && manifest !== null}
                    disabled={manifest === null}
                    onChange={() => choose(avatar.key)}
                  />
                  <span className={styles.avatarIcon} aria-hidden>
                    {manifest?.icon && <img src={avatarFileUrl(avatar.key, manifest.icon)} alt="" />}
                  </span>
                  <span className={styles.avatarText}>
                    <span className={styles.avatarName}>
                      {manifest ? localizedText(manifest.name, locale) : avatar.key}
                      {manifest?.light && <span className={styles.tag}>{texts.renditions.light}</span>}
                      {manifest?.live2d && <span className={styles.tag}>{texts.renditions.live2d}</span>}
                      {avatar.development && <span className={styles.tag}>{texts.development}</span>}
                    </span>
                    {avatar.problem ? (
                      <span className={styles.problem} title={avatar.problem.kind === "manifest" ? avatar.problem.issue.message : undefined}>
                        {problemText(avatar.problem)}
                      </span>
                    ) : (
                      <span className={styles.avatarMeta}>
                        {manifest?.author ? texts.byline(manifest.author, manifest.license ?? "") : texts.noAuthor}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
          {listed.length === 0 && <p className={styles.hint}>{mode === "light" ? texts.empty : texts.emptyLive2D}</p>}
          <div className={styles.customActions}>
            <Button size="sm" icon={<FolderOpen />} onClick={onOpenFolder}>
              {texts.folder}
            </Button>
            <Button size="sm" variant="ghost" icon={<RotateCcw />} onClick={onReload}>
              {texts.reload}
            </Button>
          </div>
          <code className={styles.folder}>{avatars.folder}</code>

          <h3 className={styles.label}>{texts.agent}</h3>
          <p className={styles.hint}>{texts.agentHint}</p>
          <code className={styles.command}>{SKILL_COMMAND}</code>
        </>
      )}
    </Section>
  );
}
