import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Constantes de mensagens de erro
const ERROR_MESSAGES = {
  NETWORK_ERROR: "Erro de conexão. Verifique sua internet e tente novamente.",
  SERVER_ERROR: "Erro no servidor. Por favor, tente novamente mais tarde.",
  NOT_FOUND: "Recurso não encontrado.",
  INVALID_DATA: "Dados inválidos. Verifique os campos e tente novamente.",
  UNAUTHORIZED: "Não autorizado. Faça login para continuar.",
  CONFLICT: "Conflito. Este registro já existe.",
};

/**
 * Environment detection for platform-specific behavior
 */
export const isReactNative =
  typeof navigator !== "undefined" && navigator.product === "ReactNative";

/**
 * API Base URL - configurável para diferentes ambientes
 */
export const API_BASE_URL = isReactNative
  ? "http://[ENDERECO_DO_SERVIDOR]:5000"
  : "";

/**
 * Função que verifica se a resposta da API é válida
 */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = "";

    try {
      const errorData = await res.json();
      errorMessage = errorData.message || res.statusText;
    } catch (e) {
      errorMessage = (await res.text()) || res.statusText;
    }

    const errorStatus = res.status;

    let userFriendlyMessage;
    switch (errorStatus) {
      case 400:
        // Priorizar mensagem do servidor se disponível, senão usar genérica
        userFriendlyMessage = errorMessage || ERROR_MESSAGES.INVALID_DATA;
        break;
      case 401:
        userFriendlyMessage = ERROR_MESSAGES.UNAUTHORIZED;
        break;
      case 404:
        userFriendlyMessage = ERROR_MESSAGES.NOT_FOUND;
        break;
      case 409:
        userFriendlyMessage = errorMessage || ERROR_MESSAGES.CONFLICT;
        break;
      case 500:
        userFriendlyMessage = ERROR_MESSAGES.SERVER_ERROR;
        break;
      default:
        userFriendlyMessage = `Erro: ${errorMessage}`;
    }

    throw new Error(userFriendlyMessage);
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";

/**
 * Função de query para o React Query
 */
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;

    try {
      const res = await fetch(fullUrl, {
        ...(!isReactNative && { credentials: "include" }),
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);

      if (res.status === 204) {
        return null;
      }

      return await res.json();
    } catch (error) {
      if (
        error instanceof TypeError &&
        error.message.includes("Network request failed")
      ) {
        throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
      }
      throw error;
    }
  };

/**
 * Função para requisições de API (POST, PUT, DELETE, etc.)
 */

export async function apiRequest<T = any>(
  url: string,
  method: string = "POST",
  data?: any,
): Promise<T> {
  const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;

  const requestOptions: RequestInit = {
    method: method.toUpperCase(),
    ...(!isReactNative && { credentials: "include" }),
  };

  // Detectar se é FormData e configurar headers/body adequadamente
  if (data && ["POST", "PUT", "PATCH"].includes(method.toUpperCase())) {
    if (data instanceof FormData) {
      // Para FormData, não definir Content-Type (o browser define automaticamente com boundary)
      requestOptions.body = data;
    } else {
      // Para dados JSON normais
      requestOptions.headers = {
        "Content-Type": "application/json",
      };
      requestOptions.body = JSON.stringify(data);
    }
  } else if (!["POST", "PUT", "PATCH"].includes(method.toUpperCase())) {
    // Para métodos GET, DELETE, etc. que não têm body
    requestOptions.headers = {
      "Content-Type": "application/json",
    };
  }

  try {
    const response = await fetch(fullUrl, requestOptions);
    await throwIfResNotOk(response);

    if (response.status === 204) {
      return null as T;
    }

    return await response.json();
  } catch (error) {
    if (
      error instanceof TypeError &&
      error.message.includes("Network request failed")
    ) {
      throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
    }
    throw error;
  }
}

/**
 * Cliente de query configurado para aplicações web e mobile
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Configuração especial para endpoints de relatórios - sempre buscar dados frescos
export const getReportsQueryConfig = () => ({
  staleTime: 0,
  refetchOnMount: true,
  refetchOnWindowFocus: true,
  refetchInterval: 5000, // Atualizar a cada 5 segundos
});
