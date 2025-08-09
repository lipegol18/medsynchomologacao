import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { API_ENDPOINTS, ORDER_STATUS } from "@shared/constants";
import { Loader2, Clipboard, FileText, User, Building, ClipboardList } from "lucide-react";
import { formatCPF } from "@/lib/utils";
import { formatDateBR } from "@/lib/utils";
import { getFileUrl } from "@/lib/file-upload";
import { OpmeItem } from "@shared/schema";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";

interface OrderDetailsDialogProps {
  orderId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function OrderDetailsDialog({ orderId, isOpen, onClose }: OrderDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState<string>("geral");
  
  const { data: order, isLoading, error } = useQuery({
    queryKey: [API_ENDPOINTS.MEDICAL_ORDER_BY_ID(orderId)],
    queryFn: async () => {
      const response = await fetch(API_ENDPOINTS.MEDICAL_ORDER_BY_ID(orderId));
      if (!response.ok) {
        throw new Error("Falha ao carregar dados do pedido médico");
      }
      return response.json();
    },
    enabled: isOpen && !!orderId,
  });
  
  // Formatação de status do pedido com cores
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" }> = {
      "em_preenchimento": { label: "Em preenchimento", variant: "outline" },
      "em_avaliacao": { label: "Em avaliação", variant: "secondary" },
      "aceito": { label: "Aceito", variant: "default" },
      "recusado": { label: "Recusado", variant: "destructive" },
    };
    
    const statusInfo = statusMap[status] || { label: status, variant: "outline" };
    
    return (
      <Badge variant={statusInfo.variant}>
        {statusInfo.label}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Pedido Médico</DialogTitle>
          <DialogDescription>
            Informações completas sobre o pedido médico e seus itens.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Carregando informações do pedido...</span>
          </div>
        ) : error ? (
          <div className="py-8 text-center text-destructive">
            <p>Erro ao carregar dados do pedido.</p>
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="mt-4"
            >
              Fechar
            </Button>
          </div>
        ) : order ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium">Pedido #{order.id}</h3>
                <p className="text-sm text-muted-foreground">
                  Criado em {formatDateBR(new Date(order.createdAt))}
                </p>
              </div>
              <div>{getStatusBadge(order.status)}</div>
            </div>
            
            <Tabs defaultValue="geral" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="geral">Geral</TabsTrigger>
                <TabsTrigger value="cirurgia">Dados Cirúrgicos</TabsTrigger>
                <TabsTrigger value="documentos">Documentos</TabsTrigger>
              </TabsList>
              
              <TabsContent value="geral" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Informações Gerais</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium mb-1">Médico</p>
                        <p className="text-sm">Dr. {order.user?.fullName || "Não informado"}</p>
                        {order.user?.crm && (
                          <p className="text-xs text-muted-foreground">CRM: {order.user.crm}</p>
                        )}
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium mb-1">Status</p>
                        <p className="text-sm">{getStatusBadge(order.status)}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium mb-1">Data do pedido</p>
                        <p className="text-sm">{formatDateBR(new Date(order.createdAt))}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {order.clinicalIndication && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Indicação Clínica</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-line">{order.clinicalIndication}</p>
                    </CardContent>
                  </Card>
                )}
                
                {order.additionalNotes && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Observações Adicionais</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-line">{order.additionalNotes}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="paciente" className="space-y-4">
                {order.patient && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center">
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarFallback className="bg-primary text-white">
                            {order.patient.fullName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{order.patient.fullName}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            CPF: {formatCPF(order.patient.cpf)}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium mb-1">Data de Nascimento</p>
                          <p className="text-sm">{formatDateBR(new Date(order.patient.birthDate))}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium mb-1">Gênero</p>
                          <p className="text-sm">{order.patient.gender}</p>
                        </div>
                        
                        {order.patient.email && (
                          <div>
                            <p className="text-sm font-medium mb-1">Email</p>
                            <p className="text-sm">{order.patient.email}</p>
                          </div>
                        )}
                        
                        {order.patient.phone && (
                          <div>
                            <p className="text-sm font-medium mb-1">Telefone</p>
                            <p className="text-sm">{order.patient.phone}</p>
                          </div>
                        )}
                        
                        {order.patient.insurance && (
                          <div>
                            <p className="text-sm font-medium mb-1">Convênio</p>
                            <p className="text-sm">{order.patient.insurance}</p>
                          </div>
                        )}
                        
                        {order.patient.insuranceNumber && (
                          <div>
                            <p className="text-sm font-medium mb-1">Número da Carteirinha</p>
                            <p className="text-sm">{order.patient.insuranceNumber}</p>
                          </div>
                        )}
                        
                        {order.patient.plan && (
                          <div>
                            <p className="text-sm font-medium mb-1">Plano</p>
                            <p className="text-sm">{order.patient.plan}</p>
                          </div>
                        )}
                      </div>
                      
                      {order.patient.notes && (
                        <>
                          <Separator className="my-4" />
                          <div>
                            <p className="text-sm font-medium mb-1">Observações</p>
                            <p className="text-sm whitespace-pre-line">{order.patient.notes}</p>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="cirurgia" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Dados da Cirurgia</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <p className="text-sm font-medium mb-1">Caráter do Procedimento</p>
                          <p className="text-sm">{order.procedureType}</p>
                        </div>
                      </div>
                      
                      {/* Procedimentos secundários */}
                      {order.secondaryProcedures && order.secondaryProcedures.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium mb-2">Procedimentos Secundários</p>
                          <div className="space-y-3">
                            {order.secondaryProcedures.map((item: any, index: number) => (
                              <div key={index} className="border border-border/40 rounded-md p-3 bg-muted/10">
                                <p className="text-sm">
                                  <strong className="text-primary">
                                    {item.code}
                                  </strong>
                                  <span className="ml-2">
                                    {item.name}
                                  </span>
                                  {item.quantity > 1 && (
                                    <Badge variant="outline" className="ml-2">
                                      Qtd: {item.quantity}
                                    </Badge>
                                  )}
                                </p>
                                
                                {(item.porte || item.custoOperacional || item.porteAnestesista || item.numeroAuxiliares) && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {item.custoOperacional && (
                                      <span>Custo Operacional: {item.custoOperacional} | </span>
                                    )}
                                    {item.porte && (
                                      <span>Porte: {item.porte} | </span>
                                    )}
                                    {item.porteAnestesista && (
                                      <span>Porte Anestesista: {item.porteAnestesista} | </span>
                                    )}
                                    {item.numeroAuxiliares && (
                                      <span>Número de Auxiliares: {item.numeroAuxiliares}</span>
                                    )}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Seção de OPME */}
                {order.opmeItemIds && order.opmeItemIds.length > 0 && (
                  <Card className="mt-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Itens OPME</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {order.opmeItemIds.map((itemId: number, index: number) => {
                          // Obter a quantidade correspondente do array de quantidades
                          const quantity = order.opmeItemQuantities && order.opmeItemQuantities[index] 
                            ? order.opmeItemQuantities[index] 
                            : 1;
                          
                          // Obter os detalhes do item OPME
                          const opmeItem = order.opmeItems && order.opmeItems[index];
                          
                          return (
                            <div 
                              key={index} 
                              className="p-3 border border-border rounded-md flex flex-col"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  {opmeItem ? (
                                    <>
                                      <p className="font-medium">
                                        {opmeItem.code} - {opmeItem.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Fabricante: {opmeItem.manufacturer} | Categoria: {opmeItem.category}
                                      </p>
                                    </>
                                  ) : (
                                    <p className="font-medium">Item OPME ID: {itemId}</p>
                                  )}
                                </div>
                                <Badge variant="outline">
                                  Qtd: {quantity}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="documentos" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Documentação</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {order.examImagesUrl && order.examImagesUrl.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-1">Imagens do Exame</p>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {order.examImagesUrl.map((url: string, index: number) => (
                              <div key={index} className="border rounded-md overflow-hidden">
                                <img 
                                  src={getFileUrl(url)} 
                                  alt={`Imagem do exame ${index + 1}`} 
                                  className="max-w-full h-auto max-h-64 object-contain mx-auto" 
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {order.medicalReportUrl && (
                        <div>
                          <p className="text-sm font-medium mb-1">Laudo Médico</p>
                          <div className="flex items-center mt-2">
                            <FileText className="h-5 w-5 mr-2 text-primary" />
                            <a 
                              href={getFileUrl(order.medicalReportUrl)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline"
                            >
                              Visualizar laudo médico
                            </a>
                          </div>
                        </div>
                      )}
                      
                      {/* Removido seção de imagens adicionais - Todas as imagens estão consolidadas em examImagesUrl */}
                      
                      {(!order.examImagesUrl?.length && !order.medicalReportUrl) && (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          Nenhum documento disponível para este pedido.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <p>Nenhum dado disponível para este pedido.</p>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}