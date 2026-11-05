// Phosphor icons, light weight (D-057). Icons are decorative unless a name is given by the caller.
import {
  CheckIcon,
  CheckCircleIcon,
  EnvelopeSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  InfoIcon,
  LockIcon,
  ShieldCheckIcon,
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { IconProps } from "@phosphor-icons/react";

const light = (Icon: React.ComponentType<IconProps>) =>
  function GrIcon(props: IconProps) {
    return <Icon weight="light" aria-hidden="true" focusable="false" {...props} />;
  };

export const IconCheck = light(CheckIcon);
export const IconCheckCircle = light(CheckCircleIcon);
export const IconMail = light(EnvelopeSimpleIcon);
export const IconEye = light(EyeIcon);
export const IconEyeSlash = light(EyeSlashIcon);
export const IconInfo = light(InfoIcon);
export const IconLock = light(LockIcon);
export const IconShield = light(ShieldCheckIcon);
export const IconWarning = light(WarningIcon);
export const IconX = light(XIcon);
