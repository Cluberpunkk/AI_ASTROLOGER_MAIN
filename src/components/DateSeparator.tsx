import { isToday, isYesterday, format } from 'date-fns';

interface DateSeparatorProps {
  date: Date;
}

export const DateSeparator = ({ date }: DateSeparatorProps) => {
  const getDateLabel = (date: Date): string => {
    if (isToday(date)) {
      return 'Today';
    }
    if (isYesterday(date)) {
      return 'Yesterday';
    }
    return format(date, 'EEEE, MMMM d');
  };

  return (
    <div className="flex items-center justify-center my-4">
      <div className="flex-1 h-px bg-border/40" />
      <span className="px-3 text-xs text-muted-foreground font-medium">
        {getDateLabel(date)}
      </span>
      <div className="flex-1 h-px bg-border/40" />
    </div>
  );
};
