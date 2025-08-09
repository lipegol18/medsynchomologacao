import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { Layout } from "@/components/layout/layout";
import { useTheme } from "@/components/theme-provider";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className={`flex items-center justify-center min-h-screen ${theme === 'light' ? 'bg-white' : ''}`}>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Envolver o componente com o Layout para garantir o fundo branco em todas as páginas
  return (
    <Route path={path}>
      <Layout includeHeader={true}>
        <Component />
      </Layout>
    </Route>
  );
}