/** An on/off switch with its visible label (Radix Switch: keyboard and screen reader support). */

import { useId } from "react";
import { Switch as RadixSwitch } from "radix-ui";
import styles from "./Switch.module.css";

export function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  const id = useId();
  return (
    <span className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <RadixSwitch.Root id={id} className={styles.root} checked={checked} onCheckedChange={onChange}>
        <RadixSwitch.Thumb className={styles.thumb} />
      </RadixSwitch.Root>
    </span>
  );
}
