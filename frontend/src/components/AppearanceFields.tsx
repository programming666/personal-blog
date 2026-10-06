import { useId } from 'react';
import type { Localized } from '../utils/presentation';

export function AppearanceText({ label, value, onChange, maxLength, multiline = false, error, hint }: {
  label: string; value: string; onChange: (value: string) => void; maxLength: number; multiline?: boolean; error?: string; hint?: string;
}) {
  const id = useId();
  const common = { id, value, maxLength, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value), className: 'input-field', 'aria-invalid': Boolean(error), 'aria-describedby': error || hint ? `${id}-help` : undefined };
  return <div className="appearance-field"><label htmlFor={id}>{label}<span aria-hidden="true">{value.length}/{maxLength}</span></label>
    {multiline ? <textarea {...common} rows={3} /> : <input {...common} />}
    {(error || hint) && <p id={`${id}-help`} className={error ? 'appearance-error' : 'appearance-hint'}>{error || hint}</p>}
  </div>;
}

export function LocalizedFields({ label, path, value, maxLength, multiline, update, errors }: {
  label: string; path: string; value: Localized; maxLength: number; multiline?: boolean;
  update: (path: string, value: unknown) => void; errors: Record<string, string>;
}) {
  return <fieldset className="appearance-localized"><legend>{label}</legend><div className="appearance-field-pair">
    <AppearanceText label="中文" value={value.zh} onChange={(next) => update(`${path}.zh`, next)} maxLength={maxLength} multiline={multiline} error={errors[`${path}.zh`]} />
    <AppearanceText label="English" value={value.en} onChange={(next) => update(`${path}.en`, next)} maxLength={maxLength} multiline={multiline} error={errors[`${path}.en`]} hint="留空时使用中文内容" />
  </div></fieldset>;
}

export function AppearanceSelect({ label, value, choices, onChange }: {
  label: string; value: string; choices: [string, string][]; onChange: (value: string) => void;
}) {
  const id = useId();
  return <div className="appearance-field"><label htmlFor={id}>{label}</label><select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="input-field">
    {choices.map(([key, title]) => <option key={key} value={key}>{title}</option>)}
  </select></div>;
}

export function AppearanceToggle({ label, checked, onChange, disabled = false }: { label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return <label className="appearance-toggle"><span>{label}</span><input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} /></label>;
}
