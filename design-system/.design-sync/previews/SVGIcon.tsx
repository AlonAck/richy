import { SVGIcon } from 'richy-design-system';

const IDS = ['up', 'down', 'box', 'check', 'home', 'food', 'car', 'heart', 'coins'];

export function IconBank() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, padding: 20 }}>
      {IDS.map((id) => (
        <div key={id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <SVGIcon id={id} size={28} color="#3C4C82" />
          <span style={{ fontSize: 10, color: '#7A6B5C' }}>{id}</span>
        </div>
      ))}
    </div>
  );
}
