import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, isValid, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { SelectSingleEventHandler } from 'react-day-picker';

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  disabled?: boolean;
  disabledDates?: (date: Date) => boolean;
  placeholder?: string;
  className?: string;
  'data-testid'?: string;
}

export function DatePicker({
  value,
  onChange,
  disabled,
  disabledDates,
  placeholder = 'DD/MM/AAAA',
  className,
  'data-testid': testId,
}: DatePickerProps) {
  const [inputValue, setInputValue] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Sync internal input state with external value
  useEffect(() => {
    if (value && isValid(value)) {
      setInputValue(format(value, 'dd/MM/yyyy'));
    } else {
      setInputValue('');
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;

    // Simple mask logic for dd/mm/yyyy
    // Remove non-digits
    const v = newValue.replace(/\D/g, '');

    if (v.length > 8) return; // Max length reached

    // Add slashes
    if (v.length > 4) {
      newValue = `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
    } else if (v.length > 2) {
      newValue = `${v.slice(0, 2)}/${v.slice(2)}`;
    } else {
      newValue = v;
    }

    setInputValue(newValue);

    // Try to parse date
    if (newValue.length === 10) {
      const parsedDate = parse(newValue, 'dd/MM/yyyy', new Date());
      if (isValid(parsedDate)) {
        if (disabledDates && disabledDates(parsedDate)) {
          // Invalid because it's disabled logic
          onChange?.(undefined);
        } else {
          onChange?.(parsedDate);
        }
      } else {
        onChange?.(undefined);
      }
    } else {
      // While typing, checking validity might be too aggressive if we clear it?
      // Better to only clear if completely empty?
      if (newValue === '') {
        onChange?.(undefined);
      }
    }
  };

  const handleBlur = () => {
    if (inputValue.length === 10) {
      const parsedDate = parse(inputValue, 'dd/MM/yyyy', new Date());
      if (!isValid(parsedDate)) {
        setInputValue(''); // Clear invalid dates on blur
        onChange?.(undefined);
      }
    } else if (inputValue !== '') {
      // Incomplete date
      setInputValue('');
      onChange?.(undefined);
    }
  };

  const handleCalendarSelect: SelectSingleEventHandler = (date) => {
    onChange?.(date);
    setIsCalendarOpen(false);
  };

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Input
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          disabled={disabled}
          className="pr-10"
          data-testid={testId}
        />
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              disabled={disabled}
            >
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={value}
              onSelect={handleCalendarSelect}
              disabled={disabledDates}
              initialFocus
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
