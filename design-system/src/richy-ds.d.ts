// Hand-authored type declarations for richy-design-system.
// The source is plain JSX (no TypeScript), so these are written by hand to
// match each component's actual prop usage rather than emitted by a compiler.
// Keep in sync with src/*.jsx when props change.
import * as React from "react";

export interface CardProps {
  /** Swaps the flat white card for the frosted "liquid glass" material. */
  glass?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export function Card(props: CardProps): JSX.Element;

export interface SVGIconProps {
  /** Icon id from the trimmed bank: up, down, box, check, home, food, car, heart, coins. */
  id?: string;
  size?: number;
  color?: string;
}
export function SVGIcon(props: SVGIconProps): JSX.Element;

export interface IconBadgeProps {
  size?: number;
  /** Fill color behind the icon. */
  bg?: string;
  /** Icon id (see SVGIconProps); defaults to "up" when label is "+", else "down". */
  icon?: string;
  label?: string;
}
export function IconBadge(props: IconBadgeProps): JSX.Element;

export interface CatBadgeProps {
  size?: number;
  /** Category color. Solid fill by default. */
  color: string;
  /** Renders a tinted (12%-alpha) background instead of a solid fill. */
  soft?: boolean;
  icon?: string;
}
export function CatBadge(props: CatBadgeProps): JSX.Element;

export interface BigBtnProps {
  label?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  /** Overrides the default accent gradient. */
  color?: string;
}
export function BigBtn(props: BigBtnProps): JSX.Element;

export interface ProgressBarProps {
  value: number;
  /** Defaults to 1. Bar turns red automatically once value exceeds max. */
  max?: number;
  /** Track height in px. Defaults to 4. */
  h?: number;
  color?: string;
}
export function ProgressBar(props: ProgressBarProps): JSX.Element;

export type LiquidButtonVariant = "primary" | "neutral" | "green" | "red" | "gold" | "ghost";
export type LiquidButtonSize = "sm" | "md" | "lg" | "xl" | "icon";

export interface LiquidButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color"> {
  /** Defaults to "neutral" (clear glass). "primary" carries the live theme accent. */
  variant?: LiquidButtonVariant;
  /** The variant hue as a light wash with hue-colored ink, instead of a filled capsule with white ink. */
  soft?: boolean;
  /** Hex to tint with instead of the variant's hue. */
  color?: string;
  /** Label color override. */
  ink?: string;
  /** Forces the dark-side rim/tint mix regardless of the live theme. */
  dark?: boolean;
  /** Defaults to "md" (44px, the HIG minimum target). */
  size?: LiquidButtonSize;
  /** Diameter for size="icon". Defaults to 44. */
  iconSize?: number;
  height?: number;
  fontSize?: number;
  weight?: number;
  /** width: 100% - for a screen-bottom CTA. */
  full?: boolean;
  /** Allows the label to wrap; defaults to the value of `full`. */
  wrap?: boolean;
  flex?: number;
  /** false = no backdrop-filter layer (e.g. a caller that sits over a live canvas). */
  blur?: boolean;
  /** Shows the busy label (or children) with an inline loading indicator and disables the button. */
  busy?: boolean;
  busyLabel?: React.ReactNode;
  onPress?: (e: React.SyntheticEvent) => void;
  children?: React.ReactNode;
}
/**
 * Richy's one glass-button primitive - Card, IconBadge, CatBadge and every
 * filled button in the app render through this. Hold ~340ms and the capsule
 * lifts and follows the finger with a rubber-band stretch; release inside
 * commits, outside cancels. variant "primary" | "neutral" (default) |
 * "green" | "red" | "gold" | "ghost".
 */
export function LiquidButton(props: LiquidButtonProps): JSX.Element;

export interface RichyTokens {
  bg: string; card: string; darkCard2: string;
  ink: string; ink2: string; ink3: string; sep: string; isDark: boolean;
  orange: string; orangeHi: string; orangeDim: string; orangeGlow: string; btn: string;
  green: string; red: string; gold: string;
  sheetGlass: string; glassBorder: string; glassSpec: string;
}
/** Live design tokens for the flagship "Cornflower Ocean" theme. */
export const T: RichyTokens;
/** System font stack. */
export const UI: string;
/** Editorial serif stack (New York on Apple platforms). */
export const DISP: string;
