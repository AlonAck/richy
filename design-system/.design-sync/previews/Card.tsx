import { Card } from 'richy-design-system';

export function Flat() {
  return (
    <Card style={{ padding: 20, width: 260 }}>
      <div style={{ fontWeight: 700, fontSize: 15 }}>Groceries</div>
      <div style={{ fontSize: 13, color: '#6B5C4E', marginTop: 4 }}>-₪184.50 · Today</div>
    </Card>
  );
}

export function Glass() {
  return (
    <div style={{ padding: 24, background: 'linear-gradient(160deg,#5C7AE3,#8493E2 50%,#B2BEED)' }}>
      <Card glass style={{ padding: 20, width: 260 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#242C52' }}>This month</div>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: '#242C52' }}>₪12,480</div>
      </Card>
    </div>
  );
}
