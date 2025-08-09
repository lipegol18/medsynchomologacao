import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, type InsertUser } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  acceptConsentMutation: UseMutationResult<{message: string, consentAccepted: Date}, Error, void>;
};

type LoginData = Pick<InsertUser, "username" | "password"> & { remember?: boolean };

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        console.log("🔐 Frontend - Verificando usuário autenticado");
        const res = await fetch("/api/user", { 
          credentials: "include",
          cache: "no-cache" 
        });
        
        console.log("🔐 Frontend - Response status:", res.status);
        
        if (res.status === 401) {
          console.log("🔐 Frontend - Usuário não autenticado (401)");
          return null;
        }
        if (!res.ok) {
          console.error("🔐 Frontend - Erro na resposta:", res.statusText);
          throw new Error("Falha ao obter dados do usuário");
        }
        
        const userData = await res.json();
        console.log("🔐 Frontend - Dados do usuário obtidos:", userData);
        return userData;
      } catch (err) {
        console.error("🔐 Frontend - Erro ao buscar usuário:", err);
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log("🔐 Frontend - Iniciando login para:", credentials.username);
      const result = await apiRequest("/api/login", "POST", credentials);
      console.log("🔐 Frontend - Login response:", result);
      return result;
    },
    onSuccess: async (user: SelectUser) => {
      console.log("🔐 Frontend - Login success, setting user data:", user);
      queryClient.setQueryData(["/api/user"], user);
      
      // Aguardar estabilização da sessão antes de continuar
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Verificar se a sessão realmente foi estabelecida
      try {
        const verifyResponse = await fetch("/api/user", { 
          credentials: "include",
          cache: "no-cache" 
        });
        
        if (verifyResponse.ok) {
          console.log("🔐 Frontend - Sessão verificada com sucesso");
        } else {
          console.warn("🔐 Frontend - Sessão ainda não estabelecida, tentando novamente...");
          // Se a sessão não foi estabelecida, invalidar para tentar novamente
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        }
      } catch (error) {
        console.error("🔐 Frontend - Erro ao verificar sessão:", error);
      }
      
      // Invalidar queries para forçar refresh
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo, ${user.username}!`,
      });
    },
    onError: (error: Error) => {
      console.error("🔐 Frontend - Login error:", error);
      toast({
        title: "Falha no login",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      return await apiRequest("/api/register", "POST", userData);
    },
    onSuccess: (response: any) => {
      // Não defina os dados do usuário no cache, pois ele não está ativo
      // e não deve ser considerado como logado
      toast({
        title: "Registro realizado com sucesso",
        description: response.message || "Sua conta foi criada, mas ainda precisa ser ativada por um administrador para acessar o sistema.",
      });
      
      // Garantir que o usuário não esteja logado após o registro
      queryClient.setQueryData(["/api/user"], null);
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no registro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/logout", "POST");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logout realizado com sucesso",
        description: "Você saiu do sistema.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha ao sair",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const acceptConsentMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/user/accept-consent", "POST");
    },
    onSuccess: (data) => {
      // Atualizar o usuário com a data de consentimento
      if (user) {
        const updatedUser = { ...user, consentAccepted: data.consentAccepted };
        queryClient.setQueryData(["/api/user"], updatedUser);
      }
      toast({
        title: "Termo aceito com sucesso",
        description: "Obrigado por aceitar os termos de uso de dados pessoais.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha ao aceitar termo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        acceptConsentMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}