import { IconBadge } from 'richy-design-system';

export function Directions() {
  return (
    <div style={{ display: 'flex', gap: 16, padding: 20, alignItems: 'center' }}>
      <IconBadge label="+" bg="#188A4A" />
      <IconBadge label="-" bg="#C73A36" />
      <IconBadge icon="home" bg="#3C4C82" size={48} />
    </div>
  );
}
