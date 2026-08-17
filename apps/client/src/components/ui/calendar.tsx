import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = {
  selected?: Date;
  onSelect?: (date: Date) => void;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
};

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function Calendar({
  selected,
  onSelect,
  className,
  minDate,
  maxDate,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState<Date>(
    () => selected || new Date()
  );

  React.useEffect(() => {
    if (selected && !isNaN(selected.getTime())) {
      setCurrentMonth(selected);
    }
  }, [selected]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const isSameDay = (d1?: Date, d2?: Date) => {
    if (!d1 || !d2) return false;
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const isToday = (date: Date) => {
    return isSameDay(date, new Date());
  };

  const isSelected = (date: Date) => {
    return isSameDay(date, selected);
  };

  const isDisabled = (date: Date) => {
    if (
      minDate &&
      date <
        new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
    ) {
      return true;
    }
    if (
      maxDate &&
      date >
        new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())
    ) {
      return true;
    }
    return false;
  };

  const days: { date: Date; isCurrentMonth: boolean }[] = [];

  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, daysInPrevMonth - i),
      isCurrentMonth: false,
    });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
    });
  }

  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
    });
  }

  return (
    <div
      className={cn(
        "p-3 w-fit bg-popover rounded-xl select-none font-poppins",
        className
      )}
    >
      <div className="flex items-center justify-between pt-1 pb-3 px-1">
        <span className="text-sm font-semibold text-foreground">
          {MONTHS[month]} {year}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className={cn(
              buttonVariants({ variant: "outline", size: "icon-xs" }),
              "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 cursor-pointer"
            )}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className={cn(
              buttonVariants({ variant: "outline", size: "icon-xs" }),
              "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 cursor-pointer"
            )}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {DAYS_OF_WEEK.map((day) => (
          <span
            key={day}
            className="text-[0.75rem] font-medium text-muted-foreground w-8 h-8 flex items-center justify-center"
          >
            {day}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map(({ date, isCurrentMonth }, idx) => {
          const selectedDay = isSelected(date);
          const today = isToday(date);
          const disabled = isDisabled(date);

          return (
            <button
              key={idx}
              type="button"
              disabled={disabled}
              onClick={() => onSelect?.(date)}
              className={cn(
                "h-8 w-8 text-xs p-0 rounded-lg flex items-center justify-center font-medium transition-colors cursor-pointer",
                !isCurrentMonth && "text-muted-foreground/30",
                isCurrentMonth && !selectedDay && "text-foreground hover:bg-muted",
                today &&
                  !selectedDay &&
                  "border border-primary text-primary font-bold",
                selectedDay &&
                  "bg-primary text-primary-foreground hover:bg-primary font-bold shadow-xs",
                disabled && "opacity-25 cursor-not-allowed hover:bg-transparent"
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { Calendar };
