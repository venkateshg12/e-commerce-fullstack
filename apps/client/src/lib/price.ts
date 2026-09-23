/**
 * Products store a discount percentage against their original price, and the admin sets that
 * indirectly by entering the original and selling prices — so the stored percentage is usually
 * fractional (799 → 719 is 10.0125%). Displaying it raw would print "10.0125% OFF", so every
 * badge rounds it to a whole number here. The money itself is never rounded this way; it is
 * computed from the stored percentage.
 */
export const formatDiscount = (percent: number) => Math.round(Number(percent) || 0);
