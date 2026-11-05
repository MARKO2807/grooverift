// Phosphor icons, light weight (D-057). Icons are decorative unless a name is given by the caller.
// The mapping from the prototype's provisional icons is in docs/design/components.md §7.
import {
  BellIcon,
  CalendarDotsIcon,
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CaretUpIcon,
  ChartBarHorizontalIcon,
  ChatCenteredTextIcon,
  ChatTextIcon,
  CheckIcon,
  CheckCircleIcon,
  ClockIcon,
  DeviceMobileIcon,
  DotsThreeIcon,
  EnvelopeSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  GearSixIcon,
  GlobeHemisphereEastIcon,
  HandshakeIcon,
  HouseIcon,
  InfoIcon,
  LightbulbFilamentIcon,
  LightningIcon,
  LockIcon,
  LockSimpleIcon,
  MagnifyingGlassIcon,
  PaperPlaneRightIcon,
  PauseCircleIcon,
  PencilSimpleIcon,
  PlusIcon,
  PlusSquareIcon,
  ProhibitIcon,
  PulseIcon,
  QuestionIcon,
  ShareNetworkIcon,
  ShieldCheckIcon,
  UserIcon,
  UserMinusIcon,
  UserPlusIcon,
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
export const IconChat = light(ChatTextIcon);
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
export const IconCaretUp = light(CaretUpIcon);
export const IconCaretDown = light(CaretDownIcon);
export const IconPlus = light(PlusIcon);
export const IconSearch = light(MagnifyingGlassIcon);
export const IconPencil = light(PencilSimpleIcon);
export const IconGlobe = light(GlobeHemisphereEastIcon);
export const IconClock = light(ClockIcon);
export const IconCalendar = light(CalendarDotsIcon);
export const IconChart = light(ChartBarHorizontalIcon);
export const IconBulb = light(LightbulbFilamentIcon);
export const IconPlusSquare = light(PlusSquareIcon);
export const IconDevice = light(DeviceMobileIcon);
// Step 5.5: profiles, lists and requests.
export const IconMore = light(DotsThreeIcon);
export const IconUserPlus = light(UserPlusIcon);
export const IconUserMinus = light(UserMinusIcon);
export const IconMutual = light(HandshakeIcon);
export const IconShare = light(ShareNetworkIcon);
export const IconBlock = light(ProhibitIcon);
