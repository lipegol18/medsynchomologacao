import { useState, useEffect } from "react";
import { getSupplierNamesByIds } from "@/lib/supplier-utils";

interface SupplierDisplayProps {
  supplierIds?: number[];
  orderId?: number;
  className?: string;
}

interface SupplierWithManufacturer {
  supplierId: number;
  supplierName: string;
  manufacturerId: number | null;
  manufacturerName: string | null;
}

export function SupplierDisplay({ supplierIds, orderId, className = "" }: SupplierDisplayProps) {
  const [supplierNames, setSupplierNames] = useState<string[]>([]);
  const [suppliersWithManufacturers, setSuppliersWithManufacturers] = useState<SupplierWithManufacturer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSupplierData = async () => {
      // Se temos orderId, buscar fornecedores com fabricantes
      if (orderId) {
        try {
          setLoading(true);
          const response = await fetch(`/api/medical-orders/${orderId}/suppliers-with-manufacturers`, {
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log("🏭 SupplierDisplay - Dados dos fornecedores com fabricantes:", data);
            setSuppliersWithManufacturers(data);
          } else {
            console.error("🏭 SupplierDisplay - Erro ao carregar fornecedores com fabricantes:", response.status);
            setSuppliersWithManufacturers([]);
          }
        } catch (error) {
          console.error("🏭 SupplierDisplay - Erro ao buscar fornecedores com fabricantes:", error);
          setSuppliersWithManufacturers([]);
        } finally {
          setLoading(false);
        }
        return;
      }

      // Fallback: usar sistema antigo com supplierIds
      if (supplierIds && supplierIds.length > 0) {
        try {
          setLoading(true);
          const names = await getSupplierNamesByIds(supplierIds);
          setSupplierNames(names);
        } catch (error) {
          console.error("Erro ao carregar nomes dos fornecedores:", error);
          // Fallback para IDs se não conseguir carregar nomes
          setSupplierNames(supplierIds.map(id => `Fornecedor ID ${id}`));
        } finally {
          setLoading(false);
        }
        return;
      }

      // Nenhum dado fornecido
      setLoading(false);
    };

    loadSupplierData();
  }, [supplierIds, orderId]);

  // Se não temos nem supplierIds nem orderId, não exibir nada
  if ((!supplierIds || supplierIds.length === 0) && !orderId) {
    return null;
  }

  // Se temos fornecedores com fabricantes (novo sistema)
  if (orderId && suppliersWithManufacturers.length > 0) {
    return (
      <div className={className}>
        <p className="font-bold text-xs text-gray-700">Fornecedores Indicados:</p>
        <div className="text-xs text-gray-900 pl-4">
          <p>
            {loading ? (
              "Carregando fornecedores..."
            ) : (
              suppliersWithManufacturers.map((supplier, index) => (
                <span key={supplier.supplierId}>
                  {supplier.supplierName}
                  {supplier.manufacturerName && ` (${supplier.manufacturerName})`}
                  {index < suppliersWithManufacturers.length - 1 && ' \u00A0\u00A0•\u00A0\u00A0 '}
                </span>
              ))
            )}
          </p>
        </div>
      </div>
    );
  }

  // Sistema antigo com supplierIds
  if (supplierIds && supplierIds.length > 0) {
    return (
      <div className={className}>
        <p className="font-bold text-xs text-gray-700">Fornecedores Indicados:</p>
        <div className="text-xs text-gray-900 pl-4">
          <p>
            {loading ? (
              "Carregando fornecedores..."
            ) : (
              supplierNames.map((name, index) => (
                <span key={index}>
                  {name}
                  {index < supplierNames.length - 1 && ' \u00A0\u00A0•\u00A0\u00A0 '}
                </span>
              ))
            )}
          </p>
        </div>
      </div>
    );
  }

  return null;
}