import { IconCheck } from "@/components/ui/icons";
import { FieldError } from "@/components/ui/field";

/**
 * The centred radio-card step (ONB-01 18+ and the interface language, D-060): a real form posting to a server
 * action, nothing pre-selected unless `initial` says so, an inline error tied to the group when Continue was
 * pressed without a choice (the button is never disabled).
 */
export function ChoiceForm({
  action,
  name,
  legend,
  options,
  initial,
  error,
  submit,
  children,
}: {
  action: (form: FormData) => Promise<void>;
  name: string;
  legend: string;
  options: { value: string; label: string; lang?: string }[];
  initial?: string | null;
  error?: string | null;
  submit: string;
  children?: React.ReactNode;
}) {
  const errId = `${name}-err`;
  return (
    <form action={action} className="form-stack" noValidate>
      <fieldset
        className="choices choices-center"
        aria-describedby={error ? errId : undefined}
        aria-invalid={error ? true : undefined}
      >
        <legend className="choices-legend">{legend}</legend>
        {options.map((o) => (
          <label key={o.value} className="choice">
            <input type="radio" name={name} value={o.value} defaultChecked={initial === o.value} />
            <span className="choice-mark" aria-hidden="true">
              <IconCheck />
            </span>
            <span className="choice-body">
              <span className="choice-title" lang={o.lang}>
                {o.label}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      {error ? <FieldError id={errId} text={error} /> : null}
      {children}
      <button type="submit" className="btn btn-primary btn-block">
        {submit}
      </button>
    </form>
  );
}
