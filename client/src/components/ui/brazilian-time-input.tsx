import { forwardRef, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';

interface BrazilianTimeInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
}

// Função para formatar entrada de tempo durante a digitação com validação
function formatBrazilianTimeInput(value: string): string {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length === 0) return '';
  
  // Validar hora (00-23)
  if (numbers.length <= 2) {
    const hour = parseInt(numbers);
    if (hour > 23) return numbers.substring(0, 1); // Limitar a 23
    return numbers;
  }
  
  // Validar minuto (00-59)
  if (numbers.length <= 4) {
    const hourStr = numbers.substring(0, 2);
    const minuteStr = numbers.substring(2);
    const hourNum = parseInt(hourStr);
    const minuteNum = parseInt(minuteStr);
    
    // Corrigir hora se inválida
    if (hourNum > 23) return `23:${minuteStr}`;
    
    // Corrigir minuto se inválido
    if (minuteNum > 59) return `${hourStr}:59`;
    
    return `${hourStr}:${minuteStr}`;
  }
  
  // Tempo completo com validação
  const hourStr = numbers.substring(0, 2);
  const minuteStr = numbers.substring(2, 4);
  
  let hourNum = parseInt(hourStr);
  let minuteNum = parseInt(minuteStr);
  
  // Corrigir hora se inválida
  if (hourNum > 23) hourNum = 23;
  
  // Corrigir minuto se inválido
  if (minuteNum > 59) minuteNum = 59;
  
  const correctedHour = hourNum.toString().padStart(2, '0');
  const correctedMinute = minuteNum.toString().padStart(2, '0');
  
  return `${correctedHour}:${correctedMinute}`;
}

// Função para validar se o horário está no formato correto
function isValidTime(timeString: string): boolean {
  if (!timeString) return false;
  
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(timeString)) return false;
  
  const [hour, minute] = timeString.split(':').map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export const BrazilianTimeInput = forwardRef<HTMLInputElement, BrazilianTimeInputProps>(
  ({ value = '', onChange, placeholder = 'HH:MM', className, disabled, required, name, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState('');

    // Sincronizar com o valor externo
    useEffect(() => {
      setDisplayValue(value);
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const formattedValue = formatBrazilianTimeInput(inputValue);
      
      setDisplayValue(formattedValue);
      
      // Se o horário está completo (5 caracteres: HH:MM), validar e enviar
      if (formattedValue.length === 5) {
        if (isValidTime(formattedValue) && onChange) {
          onChange(formattedValue);
        }
      } else if (formattedValue.length === 0 && onChange) {
        onChange('');
      }
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const timeValue = e.target.value;
      if (onChange) {
        onChange(timeValue);
      }
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
          maxLength={5}
          {...props}
        />
        
        {/* Input oculto para seletor de horário nativo - apenas no ícone */}
        <input
          type="time"
          value={value}
          onChange={handleTimeChange}
          className="absolute right-0 top-0 w-10 h-full opacity-0 cursor-pointer"
          disabled={disabled}
          tabIndex={-1}
        />
        
        {/* Ícone do relógio */}
        <Clock 
          className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" 
        />
      </div>
    );
  }
);

BrazilianTimeInput.displayName = 'BrazilianTimeInput';