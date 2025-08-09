import { useState } from "react";
import { useNotifications, Notification } from "@/hooks/use-notifications";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  CheckCircle, 
  Info, 
  AlertCircle,
  ChevronLeft
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { Layout } from "@/components/layout/layout";

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const { 
    notifications, 
    isLoading, 
    markAsRead, 
    deleteNotification, 
    markAllAsRead 
  } = useNotifications();

  // Filtrar notificações com base na aba ativa
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return !notification.read;
    return activeTab === notification.type;
  });

  const getTabCount = (tab: string) => {
    if (tab === "all") return notifications.length;
    if (tab === "unread") return notifications.filter(n => !n.read).length;
    return notifications.filter(n => n.type === tab).length;
  };

  const renderNotificationIcon = (notification: Notification) => {
    switch (notification.type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-400" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-400" />;
      default:
        return <Info className="h-5 w-5 text-blue-400" />;
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="mr-2"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Notificações</h1>
        
        <div className="ml-auto">
          <Button 
            variant="outline" 
            size="sm"
            onClick={markAllAsRead}
            disabled={isLoading || notifications.every(n => n.read)}
          >
            Marcar todas como lidas
          </Button>
        </div>
      </div>

      <Card className="bg-card border-blue-800/40">
        <CardHeader>
          <CardTitle>Central de Notificações</CardTitle>
          <CardDescription>
            Gerencie todas as suas notificações do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">
                Todas ({getTabCount("all")})
              </TabsTrigger>
              <TabsTrigger value="unread">
                Não lidas ({getTabCount("unread")})
              </TabsTrigger>
              <TabsTrigger value="info">
                Informações ({getTabCount("info")})
              </TabsTrigger>
              <TabsTrigger value="success">
                Sucessos ({getTabCount("success")})
              </TabsTrigger>
              <TabsTrigger value="warning">
                Avisos ({getTabCount("warning")})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {isLoading ? (
                <div className="flex justify-center my-8">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  Nenhuma notificação encontrada.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredNotifications.map((notification) => (
                    <div key={notification.id} className="relative">
                      <div 
                        className={`p-4 rounded-lg flex items-start gap-3 hover:bg-accent/20 transition-colors ${
                          notification.read ? 'opacity-75' : 'bg-accent/10'
                        }`}
                        onClick={() => {
                          if (!notification.read) {
                            markAsRead(notification.id);
                          }
                          if (notification.link) {
                            window.location.href = notification.link;
                          }
                        }}
                      >
                        <div className="mt-1 flex-shrink-0">
                          {renderNotificationIcon(notification)}
                        </div>
                        <div className="flex-1">
                          <p className={`${notification.read ? 'font-normal' : 'font-medium'}`}>
                            {notification.message}
                          </p>
                          <div className="flex items-center text-xs text-muted-foreground mt-1">
                            <span>
                              {formatDistanceToNow(new Date(notification.createdAt), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </span>
                            {!notification.read && (
                              <span className="ml-2 px-1.5 py-0.5 bg-blue-500/10 text-blue-500 rounded-full text-xs">
                                Nova
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                            >
                              Marcar como lida
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                          >
                            Excluir
                          </Button>
                        </div>
                      </div>
                      <Separator className="my-1" />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>
    </Layout>
  );
}