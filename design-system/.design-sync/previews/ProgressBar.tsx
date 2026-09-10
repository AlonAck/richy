import { ProgressBar } from 'richy-design-system';

export function OnTrack() {
  return (
    <div style={{ width: 260, padding: 20 }}>
      <ProgressBar value={62} max={100} />
    </div>
  );
}

export function OverBudget() {
  return (
    <div style={{ width: 260, padding: 20 }}>
      <ProgressBar value={128} max={100} />
    </div>
  );
}
