import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { languages, setLanguage, SupportedLanguage, getCurrentLanguage } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { GlobeIcon } from 'lucide-react';

/**
 * Componente para trocar o idioma da aplicação
 * @returns JSX.Element
 */
export function LanguageSwitcher() {
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(getCurrentLanguage().code);
  
  // Atualizar o estado quando o idioma mudar
  useEffect(() => {
    // Evento customizado para detectar mudanças de idioma
    const handleLanguageChange = () => {
      setCurrentLang(getCurrentLanguage().code);
    };
    
    window.addEventListener('languageChange', handleLanguageChange);
    return () => {
      window.removeEventListener('languageChange', handleLanguageChange);
    };
  }, []);
  
  // Função para mudar o idioma
  const handleLanguageChange = (value: string) => {
    const lang = value as SupportedLanguage;
    setLanguage(lang);
    setCurrentLang(lang);
    
    // Definir o idioma no documento HTML para referência global
    document.documentElement.lang = lang;
    
    // Disparar evento para atualizar outros componentes
    window.dispatchEvent(new Event('languageChange'));
    
    // Atualizar o título da página conforme o idioma
    if (lang === 'pt-BR') {
      document.title = "MedSync - Sistema para Ortopedistas";
    } else if (lang === 'en-US') {
      document.title = "MedSync - System for Orthopedists";
    } else if (lang === 'es-ES') {
      document.title = "MedSync - Sistema para Ortopedistas";
    }
    
    // Forçar uma atualização da interface
    setTimeout(() => {
      window.dispatchEvent(new Event('languageChange'));
    }, 100);
  };
  
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-white flex items-center">
        <GlobeIcon size={14} className="mr-1" />
        {currentLang === 'pt-BR' ? 'Idioma' : currentLang === 'en-US' ? 'Language' : 'Idioma'}
      </span>
      <Select value={currentLang} onValueChange={handleLanguageChange}>
        <SelectTrigger className="w-[100px] h-8 bg-blue-900 text-white border-blue-700 hover:bg-blue-700 transition-colors">
          <SelectValue placeholder="Idioma" />
        </SelectTrigger>
        <SelectContent>
          {Object.values(languages).map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}