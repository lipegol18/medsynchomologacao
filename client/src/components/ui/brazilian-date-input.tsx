import { forwardRef, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';

interface BrazilianDateInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
}

// Função para converter data ISO (yyyy-mm-dd) para formato brasileiro (dd/mm/yyyy)
function isoToBrazilian(isoDate: string): string {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

// Função para converter formato brasileiro (dd/mm/yyyy) para ISO (yyyy-mm-dd)
function brazilianToIso(brazilianDate: string): string {
  if (!brazilianDate) return '';
  const cleanDate = brazilianDate.replace(/\D/g, '');
  if (cleanDate.length !== 8) return '';
  
  const day = cleanDate.substring(0, 2);
  const month = cleanDate.substring(2, 4);
  const year = cleanDate.substring(4, 8);
  
  // Validar se a data é válida
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  if (date.getFullYear() != parseInt(year) || 
      date.getMonth() != parseInt(month) - 1 || 
      date.getDate() != parseInt(day)) {
    return '';
  }
  
  return `${year}-${month}-${day}`;
}

// Função para obter o máximo de dias de um mês
function getMaxDaysInMonth(month: number, year?: number): number {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
  if (month === 2 && year) {
    // Verificar ano bissexto
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    return isLeapYear ? 29 : 28;
  }
  
  return daysInMonth[month - 1] || 31;
}

// Função para formatar entrada durante a digitação com validação
function formatBrazilianInput(value: string): string {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length === 0) return '';
  
  // Validar dia (1-31)
  if (numbers.length <= 2) {
    const day = parseInt(numbers);
    if (day > 31) return numbers.substring(0, 1); // Limitar a 31
    return numbers;
  }
  
  // Validar mês (1-12) e ajustar dia se necessário
  if (numbers.length <= 4) {
    const dayStr = numbers.substring(0, 2);
    const monthStr = numbers.substring(2);
    const dayNum = parseInt(dayStr);
    const monthNum = parseInt(monthStr);
    
    if (monthNum > 12) return `${dayStr}/1`; // Limitar a 12
    
    // Ajustar dia se exceder o máximo do mês
    const maxDays = getMaxDaysInMonth(monthNum);
    if (dayNum > maxDays) {
      return `${maxDays.toString().padStart(2, '0')}/${monthStr}`;
    }
    
    return `${dayStr}/${monthStr}`;
  }
  
  // Data completa com validação avançada
  const dayStr = numbers.substring(0, 2);
  const monthStr = numbers.substring(2, 4);
  const yearStr = numbers.substring(4, 8);
  
  let dayNum = parseInt(dayStr);
  let monthNum = parseInt(monthStr);
  const yearNum = parseInt(yearStr);
  
  // Corrigir mês se inválido
  if (monthNum > 12) monthNum = 12;
  
  // Corrigir dia se inválido para o mês/ano específico
  const maxDays = getMaxDaysInMonth(monthNum, yearNum);
  if (dayNum > maxDays) dayNum = maxDays;
  
  const correctedDay = dayNum.toString().padStart(2, '0');
  const correctedMonth = monthNum.toString().padStart(2, '0');
  
  return `${correctedDay}/${correctedMonth}/${yearStr}`;
}

export const BrazilianDateInput = forwardRef<HTMLInputElement, BrazilianDateInputProps>(
  ({ value = '', onChange, placeholder = 'dd/mm/aaaa', className, disabled, required, name, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState('');
    const [showCalendar, setShowCalendar] = useState(false);

    // Sincronizar com o valor externo (formato ISO)
    useEffect(() => {
      setDisplayValue(isoToBrazilian(value));
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const formattedValue = formatBrazilianInput(inputValue);
      
      setDisplayValue(formattedValue);
      
      // Se a data está completa (10 caracteres: dd/mm/yyyy), converter para ISO
      if (formattedValue.length === 10) {
        const isoValue = brazilianToIso(formattedValue);
        if (isoValue && onChange) {
          onChange(isoValue);
        }
      } else if (formattedValue.length === 0 && onChange) {
        onChange('');
      }
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const isoDate = e.target.value;
      if (onChange) {
        onChange(isoDate);
      }
      setShowCalendar(false);
    };

    const handleCalendarClick = () => {
      setShowCalendar(true);
    };

    return (
      <div className="relative">
        <Input
          ref={ref}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={cn("pr-10", className)}
          disabled={disabled}
          required={required}
          name={name}
          maxLength={10}
          {...props}
        />
        
        {/* Input oculto para seletor de data nativo - apenas no ícone */}
        <input
          type="date"
          value={value}
          onChange={handleDateChange}
          className="absolute right-0 top-0 w-10 h-full opacity-0 cursor-pointer"
          disabled={disabled}
          tabIndex={-1}
        />
        
        {/* Ícone do calendário */}
        <Calendar 
          className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" 
        />
      </div>
    );
  }
);

BrazilianDateInput.displayName = 'BrazilianDateInput';