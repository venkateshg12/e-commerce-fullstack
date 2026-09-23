import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// A ceiling on the dropdown regardless of stock — nobody picks 40 from a list.
const MAX_QUANTITY = 10;

type QuantitySelectProps = {
  quantity: number;
  onChange: (nextQuantity: number) => void;
  disabled: boolean;
  // What is left of THIS line's colour and size. The list stops there, so an over-stock pick is
  // not offered in the first place instead of being rejected by the server afterwards.
  availableStock: number;
};

const QuantitySelect = ({ quantity, onChange, disabled, availableStock }: QuantitySelectProps) => {
  /*
    The line's current quantity stays in the list even when stock has since dropped below it —
    otherwise the Select would show a value it doesn't contain, and the shopper couldn't see what
    they have. Lowering it is still possible; raising it past what's left is not.
   */
  const options = Math.max(Math.min(availableStock, MAX_QUANTITY), quantity, 1);

  return (
    <Select
      value={String(quantity)}
      disabled={disabled}
      onValueChange={(value) => onChange(Number(value))}
    >
      <SelectTrigger className="cart-qty-trigger" aria-label="Quantity">
        <SelectValue>Qty: {quantity}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Array.from({ length: options }, (_, index) => index + 1).map((value) => (
          <SelectItem key={value} value={String(value)}>
            {value}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default QuantitySelect;
