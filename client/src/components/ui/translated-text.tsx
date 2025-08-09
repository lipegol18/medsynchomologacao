import { useTranslation } from "react-i18next";

export interface TranslatedTextProps {
  id: string;
  values?: Record<string, string | number>;
  children?: React.ReactNode;
}

export function TranslatedText({ id, values, children }: TranslatedTextProps) {
  const { t } = useTranslation();
  
  // Se houver conteúdo em children, usamos como fallback
  const content = t(id, { ...values, defaultValue: typeof children === 'string' ? children : undefined });
  
  return <>{content}</>;
}