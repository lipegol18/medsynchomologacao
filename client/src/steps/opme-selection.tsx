import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search,
  Filter,
  PlusCircle,
  MinusCircle,
  PackagePlus
} from "lucide-react";
import { type OpmeItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// Interface local compatível com o procedimento de client/src/pages/create-order.tsx
interface LocalProcedure {
  id: number;
  code: string;
  name: string;
  description: string | null;
  active: boolean | null;
  porte?: string;
  custoOperacional?: string;
  porteAnestesista?: string;
}

interface OpmeSelectionProps {
  selectedItems: { item: OpmeItem; quantity: number }[];
  setSelectedItems: (items: { item: OpmeItem; quantity: number }[]) => void;
  procedure: LocalProcedure | null;
}

export function OpmeSelection({ selectedItems, setSelectedItems, procedure }: OpmeSelectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [recommendedItems, setRecommendedItems] = useState<OpmeItem[]>([]);
  const { toast } = useToast();
  
  const { data: opmeItems, isLoading } = useQuery<OpmeItem[]>({
    queryKey: ["/api/opme-items"],
  });

  useEffect(() => {
    if (opmeItems && procedure) {
      // In a real app, this would be a more sophisticated recommendation algorithm
      // based on the procedure, patient data, and historical data
      // For now, we'll do a simple text matching
      
      const lowerProcedureName = procedure.name.toLowerCase();
      let matched: OpmeItem[] = [];
      
      if (lowerProcedureName.includes("joelho")) {
        matched = opmeItems.filter(item => 
          item.name.toLowerCase().includes("joelho") || 
          item.description?.toLowerCase().includes("joelho")
        );
      } else if (lowerProcedureName.includes("quadril")) {
        matched = opmeItems.filter(item => 
          item.name.toLowerCase().includes("quadril") || 
          item.description?.toLowerCase().includes("quadril")
        );
      } else if (lowerProcedureName.includes("fratura")) {
        matched = opmeItems.filter(item => 
          item.category.toLowerCase().includes("fixação")
        );
      }
      
      // Add a few more items if we don't have enough recommendations
      if (matched.length < 3) {
        const additional = opmeItems
          .filter(item => !matched.includes(item))
          .slice(0, 3 - matched.length);
        
        matched = [...matched, ...additional];
      }
      
      setRecommendedItems(matched);
    }
  }, [opmeItems, procedure]);

  const addItem = useCallback((item: OpmeItem) => {
    // Check if item is already selected
    const existingIndex = selectedItems.findIndex(
      selected => selected.item.id === item.id
    );
    
    if (existingIndex >= 0) {
      // If already selected, increment quantity
      const updatedItems = [...selectedItems];
      updatedItems[existingIndex].quantity += 1;
      setSelectedItems(updatedItems);
    } else {
      // Otherwise, add new item with quantity 1
      setSelectedItems([...selectedItems, { item, quantity: 1 }]);
    }
    
    toast({
      title: "Item adicionado",
      description: `${item.name} foi adicionado à lista de itens.`,
    });
  }, [selectedItems, setSelectedItems, toast]);

  const removeItem = useCallback((itemId: number) => {
    setSelectedItems(selectedItems.filter(selected => selected.item.id !== itemId));
    
    toast({
      title: "Item removido",
      description: "O item foi removido da lista.",
    });
  }, [selectedItems, setSelectedItems, toast]);

  const updateQuantity = useCallback((itemId: number, quantity: number) => {
    const updatedItems = selectedItems.map(selected => 
      selected.item.id === itemId ? { ...selected, quantity } : selected
    );
    
    setSelectedItems(updatedItems);
  }, [selectedItems, setSelectedItems]);

  const filteredItems = opmeItems 
    ? opmeItems.filter(item => 
        !searchTerm || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  return (
    <Card className="bg-card rounded-lg shadow-md p-6 mb-6 border border-border">
      <h3 className="text-lg font-medium text-foreground mb-4">Seleção de OPME</h3>
      
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="search-opme">Pesquisar OPME</Label>
          <div className="flex items-center text-primary text-sm cursor-pointer">
            <Filter className="h-4 w-4 mr-1" />
            Filtros
          </div>
        </div>
        <div className="relative">
          <Search className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground" />
          <Input
            id="search-opme"
            className="w-full pl-10"
            placeholder="Buscar por nome, código ou tipo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="mb-6">
        <h4 className="font-medium text-foreground mb-2">Itens Recomendados</h4>
        
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : recommendedItems.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            {procedure 
              ? "Nenhum item recomendado para este procedimento." 
              : "Selecione um procedimento para ver recomendações."}
          </div>
        ) : (
          recommendedItems.map(item => (
            <div 
              key={item.id}
              className="border border-border rounded-lg p-3 mb-3 hover:border-border hover:bg-muted/30 transition-colors"
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-foreground">{item.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Código: {item.code} | Fabricante: {item.manufacturer}
                  </div>
                </div>
                <div className="flex items-center">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-primary hover:bg-accent/20 rounded"
                    onClick={() => addItem(item)}
                  >
                    <PlusCircle className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
        
        {searchTerm && !isLoading && (
          <div className="mt-4">
            <h4 className="font-medium text-foreground mb-2">Resultados da Busca</h4>
            
            {filteredItems.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                Nenhum item encontrado para "{searchTerm}".
              </div>
            ) : (
              filteredItems.slice(0, 5).map(item => (
                <div 
                  key={item.id}
                  className="border border-border rounded-lg p-3 mb-3 hover:border-border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-foreground">{item.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Código: {item.code} | Fabricante: {item.manufacturer}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-primary hover:bg-accent/20 rounded"
                        onClick={() => addItem(item)}
                      >
                        <PlusCircle className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {filteredItems.length > 5 && (
              <div className="text-center">
                <Button variant="link" className="text-primary">
                  Ver mais {filteredItems.length - 5} resultados
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div>
        <h4 className="font-medium text-foreground mb-2">Itens Selecionados</h4>
        
        {selectedItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <PackagePlus className="h-8 w-8 mx-auto mb-2" />
            Adicione itens à sua lista de OPME
          </div>
        ) : (
          selectedItems.map(({ item, quantity }) => (
            <div 
              key={item.id}
              className="border border-border rounded-lg p-3 mb-3 bg-muted/30"
            >
              <div className="flex justify-between items-center">
                <div className="flex-grow">
                  <div className="font-medium text-foreground">{item.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Código: {item.code} | Fabricante: {item.manufacturer}
                  </div>
                </div>
                <div className="flex-shrink-0 flex items-center">
                  <div className="mr-3">
                    <Label className="text-xs text-muted-foreground block">Quantidade</Label>
                    <Select 
                      value={quantity.toString()} 
                      onValueChange={(val) => updateQuantity(item.id, parseInt(val))}
                    >
                      <SelectTrigger className="border border-border rounded w-16 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map(num => (
                          <SelectItem key={num} value={num.toString()}>
                            {num}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:bg-destructive/20 rounded"
                    onClick={() => removeItem(item.id)}
                  >
                    <MinusCircle className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
