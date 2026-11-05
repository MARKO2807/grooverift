// Phosphor icons, light weight (D-057). Icons are decorative unless a name is given by the caller.
// The mapping from the prototype's provisional icons is in docs/design/components.md §7.
import {
  BellIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ChatCenteredTextIcon,
  CheckIcon,
  CheckCircleIcon,
  EnvelopeSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  GearSixIcon,
  HouseIcon,
  InfoIcon,
  LightningIcon,
  LockIcon,
  LockSimpleIcon,
  PaperPlaneRightIcon,
  PauseCircleIcon,
  PulseIcon,
  QuestionIcon,
  ShieldCheckIcon,
  UserIcon,
  UsersThreeIcon,
  WarningIcon,
  WarningCircleIcon,
  WifiSlashIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { IconProps } from "@phosphor-icons/react";

const light = (Icon: React.ComponentType<IconProps>) =>
  function GrIcon(props: IconProps) {
    return <Icon weight="light" aria-hidden="true" focusable="false" {...props} />;
  };

export const IconBell = light(BellIcon);
export const IconBack = light(CaretLeftIcon);
export const IconChevron = light(CaretRightIcon);
export const IconCheck = light(CheckIcon);
export const IconCheckCircle = light(CheckCircleIcon);
export const IconGear = light(GearSixIcon);
export const IconHelp = light(QuestionIcon);
export const IconHome = light(HouseIcon);
export const IconHub = light(ChatCenteredTextIcon);
export const IconLightning = light(LightningIcon);
export const IconMail = light(EnvelopeSimpleIcon);
export const IconEye = light(EyeIcon);
export const IconEyeSlash = light(EyeSlashIcon);
export const IconInfo = light(InfoIcon);
export const IconLock = light(LockIcon);
export const IconLockSimple = light(LockSimpleIcon);
export const IconOffline = light(WifiSlashIcon);
export const IconPause = light(PauseCircleIcon);
export const IconPulse = light(PulseIcon);
export const IconSend = light(PaperPlaneRightIcon);
export const IconShield = light(ShieldCheckIcon);
export const IconUser = light(UserIcon);
export const IconUsers = light(UsersThreeIcon);
export const IconWarning = light(WarningIcon);
export const IconWarningCircle = light(WarningCircleIcon);
export const IconX = light(XIcon);
