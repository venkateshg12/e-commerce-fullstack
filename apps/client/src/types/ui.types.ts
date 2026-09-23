import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export type AlertType = "success" | "error" | "info" | "warning";

export interface AlertPopupProps {
  isOpen: boolean;
  type: AlertType;
  title: string;
  description: string;
  onClose: () => void;
  actionLabel?: string;
  onAction?: () => void;
  autoCloseDuration?: number;
  // Shows bouncing dots in the action button and disables it while the action is in flight.
  isActionPending?: boolean;
}

export interface NavItem  {
  label: string;
  href: string;
  icon: LucideIcon;
}

