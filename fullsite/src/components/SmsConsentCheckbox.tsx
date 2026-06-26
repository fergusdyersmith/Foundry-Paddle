import { Link } from "react-router-dom";

type Props = {
  id: string;
  checked: boolean;
  onChange: (value: boolean) => void;
};

/**
 * Standalone SMS opt-in consent checkbox for 10DLC compliance. Unchecked by
 * default; the wording is the carrier-reviewed language. Shown wherever we
 * collect a mobile number.
 */
const SmsConsentCheckbox = ({ id, checked, onChange }: Props) => (
  <label htmlFor={id} className="flex items-start gap-3 cursor-pointer">
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
    />
    <span className="font-body text-xs leading-relaxed text-muted-foreground">
      I agree to receive recurring automated text messages from Foundry Padel about my account
      and activity (booking confirmations, class and clinic reminders, match and open-spot
      notifications, schedule changes, and replies to my questions). Consent is not a condition of
      any purchase. Msg &amp; data rates may apply. Msg frequency varies. Reply STOP to opt out,
      HELP for help. See our{" "}
      <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link> and{" "}
      <Link to="/sms-terms" className="text-primary hover:underline">SMS Terms</Link>.
    </span>
  </label>
);

export default SmsConsentCheckbox;
