import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import CreateOrder from "@/pages/create-order";
import Patients from "@/pages/patients";
import Orders from "@/pages/orders";
import OrderDetails from "@/pages/order-details";
import OpmeCatalog from "@/pages/opme-catalog";
import SurgeryAppointments from "@/pages/surgery-appointments";
import Reports from "@/pages/reports";
import Hospitals from "@/pages/hospitals";
import Users from "@/pages/users";
import Roles from "@/pages/roles";
import Suppliers from "@/pages/suppliers";
import Procedures from "@/pages/procedures";
import InsuranceProviders from "@/pages/insurance-providers";
import Profile from "@/pages/profile";
import AuthPage from "@/pages/auth-page";
import Notifications from "@/pages/notifications";
import ContactPage from "@/pages/contact-page";
import ContactMessages from "@/pages/admin/contact-messages";
import ManufacturerDemo from "@/pages/manufacturer-demo";

import OpmeMaterials from "@/pages/admin/opme-materials";
import CidCodes from "@/pages/admin/cid-codes";
import TestOrderPreview from "@/pages/test-order-preview";

import { useEffect } from "react";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { ThemeProvider } from "@/components/theme-provider";
import { ConsentProvider } from "@/components/consent-provider";
import { useNavigationTracker } from "@/hooks/use-navigation-tracker";

function Router() {
  // Initialize navigation tracking
  useNavigationTracker();
  
  return (
    <Switch>
      <ProtectedRoute path="/" component={Home} />
      <ProtectedRoute path="/create-order" component={CreateOrder} />
      <ProtectedRoute path="/orders/create/:id" component={CreateOrder} />
      <ProtectedRoute path="/orders" component={Orders} />
      <ProtectedRoute path="/order/:id" component={OrderDetails} />
      <ProtectedRoute path="/patients" component={Patients} />
      <ProtectedRoute path="/opme-catalog" component={OpmeCatalog} />
      <ProtectedRoute path="/surgery-appointments" component={SurgeryAppointments} />
      <ProtectedRoute path="/reports" component={Reports} />
      <ProtectedRoute path="/hospitals" component={Hospitals} />
      <ProtectedRoute path="/suppliers" component={Suppliers} />
      <ProtectedRoute path="/procedures" component={Procedures} />
      <ProtectedRoute path="/insurance-providers" component={InsuranceProviders} />
      <ProtectedRoute path="/users" component={Users} />
      <ProtectedRoute path="/roles" component={Roles} />
      <ProtectedRoute path="/profile" component={Profile} />
      <ProtectedRoute path="/notifications" component={Notifications} />
      <ProtectedRoute path="/admin/contact-messages" component={ContactMessages} />

      <ProtectedRoute path="/admin/opme-materials" component={OpmeMaterials} />
      <ProtectedRoute path="/admin/cid-codes" component={CidCodes} />
      <ProtectedRoute path="/test-order-preview" component={TestOrderPreview} />
      <ProtectedRoute path="/manufacturer-demo" component={ManufacturerDemo} />

      <Route path="/auth" component={AuthPage} />
      <Route path="/contact" component={ContactPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    // Set document title
    document.title = "MedSync - Sistema para Ortopedistas";
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="medsync-theme">
        <TooltipProvider>
          <AuthProvider>
            <ConsentProvider>
              <Router />
            </ConsentProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
