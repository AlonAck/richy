import { BigBtn } from 'richy-design-system';

export function Default() {
  return (
    <div style={{ width: 280, padding: 20 }}>
      <BigBtn label="Save budget" onPress={() => {}} />
    </div>
  );
}

export function Disabled() {
  return (
    <div style={{ width: 280, padding: 20 }}>
      <BigBtn label="Save budget" disabled />
    </div>
  );
}
