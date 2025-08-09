import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Procedure } from "@shared/schema";
import { Clipboard, Search, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ProcedureSelectionProps {
  selectedProcedureId: number | null;
  setSelectedProcedureId: (id: number | null) => void;
}

export function ProcedureSelection({ 
  selectedProcedureId, 
  setSelectedProcedureId 
}: ProcedureSelectionProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const searchTimeoutRef = useRef<number | null>(null);

  // Carregar todos os procedimentos inicialmente (limitado a 30)
  const { data: allProcedures = [], isLoading: isLoadingAll } = useQuery<Procedure[]>({
    queryKey: ['/api/procedures'],
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Função para buscar procedimentos
  useEffect(() => {
    const fetchProcedures = async () => {
      // Se o termo de busca for muito curto, não faz busca
      if (searchTerm.length < 2) {
        setProcedures(allProcedures);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`/api/procedures/search?q=${encodeURIComponent(searchTerm)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Erro ao buscar procedimentos: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Encontrados ${data.length} procedimentos para a consulta "${searchTerm}"`);
        setProcedures(data);
      } catch (error) {
        console.error("Erro ao buscar procedimentos:", error);
        toast({
          title: "Erro na busca",
          description: "Não foi possível buscar procedimentos",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    // Debounce para evitar muitas requisições
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = window.setTimeout(() => {
      fetchProcedures();
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, allProcedures, toast]);

  // Inicializar procedimentos com todos os procedimentos quando carregados
  useEffect(() => {
    if (allProcedures.length > 0 && procedures.length === 0) {
      setProcedures(allProcedures);
    }
  }, [allProcedures, procedures.length]);

  // Encontrar o procedimento selecionado
  const selectedProcedure = procedures.find(p => p.id === selectedProcedureId) || 
                           allProcedures.find(p => p.id === selectedProcedureId);

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl flex items-center">
          <Clipboard className="mr-2 h-5 w-5 text-primary" />
          Procedimento Cirúrgico
        </CardTitle>
        <CardDescription>
          Selecione o procedimento cirúrgico a ser realizado
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="procedureSelect">Procedimento</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between mt-1"
                  disabled={isLoadingAll}
                >
                  {selectedProcedure ? selectedProcedure.name : "Selecione um procedimento"}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput 
                    placeholder="Buscar procedimento por nome, código ou descrição..." 
                    className="h-9"
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {isLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <p className="py-6 text-center text-sm">
                          Nenhum procedimento encontrado
                        </p>
                      )}
                    </CommandEmpty>
                    <CommandGroup>
                      {procedures.map((procedure) => (
                        <CommandItem
                          key={procedure.id}
                          value={procedure.id.toString()}
                          onSelect={() => {
                            setSelectedProcedureId(procedure.id);
                            setOpen(false);
                          }}
                        >
                          <div className="flex flex-col">
                            <span>
                              {procedure.name}
                              {procedure.id === selectedProcedureId && (
                                <Check className="ml-2 h-4 w-4 inline" />
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {procedure.code}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {selectedProcedure && (
            <div className="border rounded-md p-3 bg-muted/30">
              <p className="text-sm font-medium">Detalhes do Procedimento:</p>
              <p className="text-sm mt-1">{selectedProcedure.description}</p>
            </div>
          )}

          {isLoadingAll && <p className="text-center py-2 text-sm">Carregando procedimentos...</p>}
          
          <p className="text-xs text-muted-foreground mt-2">
            Busque procedimentos por código, nome ou descrição (fonte: tabela procedures do banco de dados)
          </p>
          {searchTerm && searchTerm.length >= 2 && procedures.length === 0 && !isLoading ? (
            <p className="text-xs text-orange-300 mt-1">
              Nenhum procedimento encontrado para "{searchTerm}". Tente outros termos como "artroscopia", "joelho", etc.
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}