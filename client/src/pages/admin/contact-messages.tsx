import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash, Eye, Send, Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  userId?: number;
  responseMessage?: string;
  responseDate?: string;
  respondedById?: number;
}

export default function ContactMessagesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isRespondModalOpen, setIsRespondModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [response, setResponse] = useState("");

  // Obter todas as mensagens
  const { data: messages = [], isLoading, error } = useQuery<ContactMessage[]>({
    queryKey: ["/api/contact"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/contact");
      return await res.json();
    },
  });

  // Mutação para responder uma mensagem
  const respondMutation = useMutation({
    mutationFn: async ({ id, responseMessage }: { id: number; responseMessage: string }) => {
      const res = await apiRequest("POST", `/api/contact/${id}/respond`, { responseMessage });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact"] });
      toast({
        title: t("contact.admin.success.responded"),
        description: t("contact.admin.success.respondedDesc"),
        variant: "default",
      });
      setIsRespondModalOpen(false);
      setResponse("");
    },
    onError: (error) => {
      console.error("Erro ao responder mensagem:", error);
      toast({
        title: t("contact.admin.error.respond"),
        description: t("contact.admin.error.respondDesc"),
        variant: "destructive",
      });
    },
  });

  // Mutação para excluir uma mensagem
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/contact/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact"] });
      toast({
        title: t("contact.admin.success.deleted"),
        description: t("contact.admin.success.deletedDesc"),
        variant: "default",
      });
      setIsDeleteModalOpen(false);
    },
    onError: (error) => {
      console.error("Erro ao excluir mensagem:", error);
      toast({
        title: t("contact.admin.error.delete"),
        description: t("contact.admin.error.deleteDesc"),
        variant: "destructive",
      });
    },
  });

  // Filtra mensagens pendentes
  const pendingMessages = messages.filter((msg) => msg.status === "pending");
  
  // Filtra mensagens respondidas
  const respondedMessages = messages.filter((msg) => msg.status === "responded");

  // Função para abrir o modal de visualização
  const handleViewMessage = (message: ContactMessage) => {
    setSelectedMessage(message);
    setIsViewModalOpen(true);
  };

  // Função para abrir o modal de resposta
  const handleRespondMessage = (message: ContactMessage) => {
    setSelectedMessage(message);
    setResponse(message.responseMessage || "");
    setIsRespondModalOpen(true);
  };

  // Função para abrir o modal de exclusão
  const handleDeleteMessage = (message: ContactMessage) => {
    setSelectedMessage(message);
    setIsDeleteModalOpen(true);
  };

  // Função para responder uma mensagem
  const handleSubmitResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMessage && response.trim()) {
      respondMutation.mutate({ id: selectedMessage.id, responseMessage: response });
    }
  };

  // Função para formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Renderizar status com badge
  const renderStatus = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            <Clock className="w-3 h-3 mr-1" />
            {t("contact.admin.status.pending")}
          </Badge>
        );
      case "responded":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {t("contact.admin.status.responded")}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">
            {status}
          </Badge>
        );
    }
  };

  if (error) {
    return (
      <div className="p-4">
        <AlertCircle className="w-6 h-6 text-red-500 mb-2" />
        <p className="text-red-500">{t("contact.admin.error")}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              {t("contact.admin.title")}
            </CardTitle>
            <CardDescription>
              {t("contact.admin.subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="all">
                  {t("contact.admin.tabs.all")} ({messages.length})
                </TabsTrigger>
                <TabsTrigger value="pending">
                  {t("contact.admin.tabs.pending")} ({pendingMessages.length})
                </TabsTrigger>
                <TabsTrigger value="responded">
                  {t("contact.admin.tabs.responded")} ({respondedMessages.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <MessageTable
                  messages={messages}
                  isLoading={isLoading}
                  onView={handleViewMessage}
                  onRespond={handleRespondMessage}
                  onDelete={handleDeleteMessage}
                  renderStatus={renderStatus}
                  formatDate={formatDate}
                  t={t}
                />
              </TabsContent>

              <TabsContent value="pending">
                <MessageTable
                  messages={pendingMessages}
                  isLoading={isLoading}
                  onView={handleViewMessage}
                  onRespond={handleRespondMessage}
                  onDelete={handleDeleteMessage}
                  renderStatus={renderStatus}
                  formatDate={formatDate}
                  t={t}
                />
              </TabsContent>

              <TabsContent value="responded">
                <MessageTable
                  messages={respondedMessages}
                  isLoading={isLoading}
                  onView={handleViewMessage}
                  onRespond={handleRespondMessage}
                  onDelete={handleDeleteMessage}
                  renderStatus={renderStatus}
                  formatDate={formatDate}
                  t={t}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Modal de visualização */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedMessage?.subject}</DialogTitle>
            <DialogDescription>
              {t("contact.admin.from")}: {selectedMessage?.name} ({selectedMessage?.email})
              {selectedMessage?.phone && ` - ${selectedMessage.phone}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-1">{t("contact.message")}:</h3>
              <div className="p-4 border rounded-md bg-secondary/20">
                <p className="whitespace-pre-wrap">{selectedMessage?.message}</p>
              </div>
            </div>

            {selectedMessage?.responseMessage && (
              <div>
                <h3 className="text-sm font-medium mb-1">{t("contact.admin.yourResponse")}:</h3>
                <div className="p-4 border rounded-md bg-primary/10">
                  <p className="whitespace-pre-wrap">{selectedMessage.responseMessage}</p>
                </div>
                {selectedMessage.responseDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("contact.admin.respondedAt")}: {formatDate(selectedMessage.responseDate)}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                {t("common.close")}
              </Button>
              {selectedMessage?.status === "pending" && (
                <Button onClick={() => {
                  setIsViewModalOpen(false);
                  handleRespondMessage(selectedMessage);
                }}>
                  <Send className="w-4 h-4 mr-2" />
                  {t("contact.admin.actions.respond")}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de resposta */}
      <Dialog open={isRespondModalOpen} onOpenChange={setIsRespondModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("contact.admin.response.title")}</DialogTitle>
            <DialogDescription>
              {t("contact.admin.responseFor")}: {selectedMessage?.name} ({selectedMessage?.email})
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitResponse} className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-1">{t("contact.admin.originalMessage")}:</h3>
              <div className="p-4 border rounded-md bg-secondary/20 max-h-32 overflow-y-auto">
                <p className="whitespace-pre-wrap">{selectedMessage?.message}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-1">{t("contact.admin.yourResponse")}:</h3>
              <Textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder={t("contact.admin.response.placeholder")}
                className="min-h-[150px]"
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRespondModalOpen(false)}
              >
                {t("Cancelar")}
              </Button>
              <Button
                type="submit"
                disabled={respondMutation.isPending || !response.trim()}
              >
                {respondMutation.isPending ? t("Enviando...") : t("Enviar Resposta")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de exclusão */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Excluir Mensagem")}</DialogTitle>
            <DialogDescription>
              {t("Tem certeza que deseja excluir esta mensagem? Esta ação não pode ser desfeita.")}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              {t("Cancelar")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedMessage && deleteMutation.mutate(selectedMessage.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t("Excluindo...") : t("Excluir")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente de tabela de mensagens
function MessageTable({
  messages,
  isLoading,
  onView,
  onRespond,
  onDelete,
  renderStatus,
  formatDate,
  t,
}: {
  messages: ContactMessage[];
  isLoading: boolean;
  onView: (message: ContactMessage) => void;
  onRespond: (message: ContactMessage) => void;
  onDelete: (message: ContactMessage) => void;
  renderStatus: (status: string) => React.ReactNode;
  formatDate: (date: string) => string;
  t: (key: string) => string;
}) {
  if (isLoading) {
    return <div className="py-8 text-center">{t("Carregando mensagens...")}</div>;
  }

  if (messages.length === 0) {
    return <div className="py-8 text-center">{t("Nenhuma mensagem encontrada")}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("Assunto")}</TableHead>
            <TableHead>{t("Nome")}</TableHead>
            <TableHead>{t("E-mail")}</TableHead>
            <TableHead>{t("Data")}</TableHead>
            <TableHead>{t("Status")}</TableHead>
            <TableHead className="text-right">{t("Ações")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {messages.map((message) => (
            <TableRow key={message.id}>
              <TableCell className="font-medium">{message.subject}</TableCell>
              <TableCell>{message.name}</TableCell>
              <TableCell>{message.email}</TableCell>
              <TableCell>{formatDate(message.createdAt)}</TableCell>
              <TableCell>{renderStatus(message.status)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => onView(message)}
                    title={t("Visualizar")}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {message.status === "pending" && (
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => onRespond(message)}
                      title={t("Responder")}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => onDelete(message)}
                    title={t("Excluir")}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}