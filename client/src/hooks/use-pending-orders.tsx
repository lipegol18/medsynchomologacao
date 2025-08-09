import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

export type PendingOrder = {
  id: number;
  patientName: string;
  statusId: number;
  createdAt: string;
  updatedAt: string;
};

export const usePendingOrders = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch orders with status "aguardando_envio" (ID: 8)
  const { 
    data: pendingOrders = [], 
    isLoading,
    error,
    refetch: refetchPendingOrders
  } = useQuery({
    queryKey: ["/api/medical-orders/pending-shipment"],
    queryFn: async () => {
      if (!user) return [];
      try {
        const response = await fetch("/api/medical-orders?statusId=8", {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching pending orders:", error);
        return [];
      }
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Get count of pending orders
  const pendingCount = pendingOrders.length;

  // Toggle panel
  const togglePendingOrders = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closePendingOrders = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    pendingOrders,
    pendingCount,
    isOpen,
    isLoading,
    error,
    togglePendingOrders,
    closePendingOrders,
    refetchPendingOrders,
  };
};