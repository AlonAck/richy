import { LiquidButton } from 'richy-design-system';

const bg: React.CSSProperties = {
  padding: 24,
  background: 'linear-gradient(160deg,#5C7AE3,#8493E2 50%,#B2BEED)',
  display: 'flex',
  gap: 14,
  flexWrap: 'wrap',
  alignItems: 'center',
};

export function Variants() {
  return (
    <div style={bg}>
      <LiquidButton variant="primary">Continue</LiquidButton>
      <LiquidButton variant="neutral">Cancel</LiquidButton>
      <LiquidButton variant="green">Confirm</LiquidButton>
      <LiquidButton variant="red">Delete</LiquidButton>
    </div>
  );
}

export function Soft() {
  return (
    <div style={bg}>
      <LiquidButton variant="gold" soft>Pending</LiquidButton>
      <LiquidButton variant="green" soft>Cleared</LiquidButton>
    </div>
  );
}

export function States() {
  return (
    <div style={bg}>
      <LiquidButton variant="primary" busy busyLabel="Saving">Saving</LiquidButton>
      <LiquidButton variant="primary" disabled>Continue</LiquidButton>
    </div>
  );
}

export function IconSize() {
  return (
    <div style={bg}>
      <LiquidButton variant="neutral" size="icon">+</LiquidButton>
    </div>
  );
}
