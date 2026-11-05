"use client";

import {
  Dialog as AriaDialog,
  DialogTrigger,
  Heading,
  Modal,
  ModalOverlay,
} from "react-aria-components";

// Dialog (components §4.8): focus moves in, Tab cycles inside, the page behind is inert,
// Escape closes, focus returns to the opener. React Aria Components provides all of that.
export function Dialog({
  title,
  children,
  isOpen,
  onOpenChange,
  isDismissable = true,
}: {
  title: string;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  isDismissable?: boolean;
}) {
  return (
    <ModalOverlay
      className="scrim"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable={isDismissable}
      isKeyboardDismissDisabled={!isDismissable}
    >
      <Modal>
        <AriaDialog className="dialog">
          {({ close }) => (
            <>
              <Heading slot="title">{title}</Heading>
              {typeof children === "function" ? children(close) : children}
            </>
          )}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}

export { DialogTrigger };
