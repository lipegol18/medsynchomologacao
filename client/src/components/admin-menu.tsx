import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, ChevronDown, ScanLine, Hospital, Building, UserCog, Shield, MessageSquare, Heart, Link2, Package, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { t } from "@/lib/i18n";

export function AdminMenu() {
  const { user } = useAuth();
  const [location] = useLocation();
  
  // Verificar se o usuário é administrador
  const isAdmin = user?.roleId === 1;
  
  // Menu de administração só aparece para administradores
  if (!isAdmin) return null;
  
  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <span className={`py-1 px-3 inline-block whitespace-nowrap cursor-pointer text-primary-foreground border-b-2 text-sm flex items-center header-text ${
            location.startsWith('/admin') || location.startsWith('/users') || location.startsWith('/roles') || location.startsWith('/hospitals') || location.startsWith('/suppliers') || location.startsWith('/procedures') || location.startsWith('/insurance-providers')
              ? "border-primary-foreground"
              : "border-transparent hover:border-primary-foreground/60"
          }`}>
            <Settings className="mr-1 h-3 w-3" />
            <span>Administração</span>
            <ChevronDown className="ml-1 h-3 w-3" />
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="header-text">Ferramentas Administrativas</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem asChild>
            <Link href="/users">
              <div className="flex items-center w-full">
                <UserCog className="mr-2 h-4 w-4" />
                <span className="header-text">{t('nav.users')}</span>
              </div>
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <Link href="/roles">
              <div className="flex items-center w-full">
                <Shield className="mr-2 h-4 w-4" />
                <span className="header-text">{t('nav.roles')}</span>
              </div>
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <Link href="/admin/contact-messages">
              <div className="flex items-center w-full">
                <MessageSquare className="mr-2 h-4 w-4" />
                <span className="header-text">{t('nav.contact_messages')}</span>
              </div>
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <Link href="/insurance-providers">
              <div className="flex items-center w-full">
                <Heart className="mr-2 h-4 w-4" />
                <span className="header-text">{t('nav.insurance_providers')}</span>
              </div>
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <Link href="/hospitals">
              <div className="flex items-center w-full">
                <Hospital className="mr-2 h-4 w-4" />
                <span className="header-text">{t('nav.hospitals')}</span>
              </div>
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <Link href="/suppliers">
              <div className="flex items-center w-full">
                <Building className="mr-2 h-4 w-4" />
                <span className="header-text">{t('nav.suppliers')}</span>
              </div>
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <Link href="/procedures">
              <div className="flex items-center w-full">
                <FileText className="mr-2 h-4 w-4" />
                <span className="header-text">Procedimentos CBHPM</span>
              </div>
            </Link>
          </DropdownMenuItem>
          

          
          <DropdownMenuItem asChild>
            <Link href="/admin/opme-materials">
              <div className="flex items-center w-full">
                <Package className="mr-2 h-4 w-4" />
                <span className="header-text">Materiais OPME</span>
              </div>
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <Link href="/admin/cid-codes">
              <div className="flex items-center w-full">
                <FileText className="mr-2 h-4 w-4" />
                <span className="header-text">Cadastro CID-10</span>
              </div>
            </Link>
          </DropdownMenuItem>

        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}