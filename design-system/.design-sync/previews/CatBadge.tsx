import { CatBadge } from 'richy-design-system';

export function Solid() {
  return (
    <div style={{ display: 'flex', gap: 14, padding: 20 }}>
      <CatBadge color="#3C4C82" icon="home" />
      <CatBadge color="#C8983A" icon="car" />
      <CatBadge color="#188A4A" icon="food" />
    </div>
  );
}

export function Soft() {
  return (
    <div style={{ display: 'flex', gap: 14, padding: 20 }}>
      <CatBadge color="#3C4C82" icon="home" soft />
      <CatBadge color="#C8983A" icon="car" soft />
      <CatBadge color="#188A4A" icon="food" soft />
    </div>
  );
}
