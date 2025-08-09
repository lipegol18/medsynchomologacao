import { type Supplier } from "@shared/schema";

/**
 * Cache para armazenar fornecedores já carregados
 */
const supplierCache = new Map<number, Supplier>();

/**
 * Busca um fornecedor por ID
 * @param id - ID do fornecedor
 * @returns Promise com os dados do fornecedor ou null se não encontrado
 */
export async function getSupplierById(id: number): Promise<Supplier | null> {
  // Verificar cache primeiro
  if (supplierCache.has(id)) {
    return supplierCache.get(id)!;
  }

  try {
    const response = await fetch(`/api/suppliers/search?id=${id}`);
    if (!response.ok) {
      console.error(`Erro ao buscar fornecedor ${id}:`, response.status);
      return null;
    }

    const suppliersData = await response.json();
    const supplier = suppliersData.find((s: Supplier) => s.id === id);
    
    if (supplier) {
      // Armazenar no cache
      supplierCache.set(id, supplier);
      return supplier;
    }
    
    return null;
  } catch (error) {
    console.error(`Erro ao buscar fornecedor ${id}:`, error);
    return null;
  }
}

/**
 * Busca múltiplos fornecedores por IDs
 * @param ids - Array de IDs dos fornecedores
 * @returns Promise com array de fornecedores encontrados
 */
export async function getSuppliersByIds(ids: number[]): Promise<Supplier[]> {
  const suppliers: Supplier[] = [];
  
  for (const id of ids) {
    const supplier = await getSupplierById(id);
    if (supplier) {
      suppliers.push(supplier);
    }
  }
  
  return suppliers;
}

/**
 * Obtém o nome do fornecedor (trade name ou company name) por ID
 * @param id - ID do fornecedor
 * @returns Promise com o nome do fornecedor ou string padrão se não encontrado
 */
export async function getSupplierNameById(id: number): Promise<string> {
  const supplier = await getSupplierById(id);
  
  if (!supplier) {
    return `Fornecedor ID ${id}`;
  }
  
  // Priorizar tradeName, depois companyName
  return supplier.tradeName || supplier.companyName || `Fornecedor ID ${id}`;
}

/**
 * Obtém os nomes de múltiplos fornecedores por IDs
 * @param ids - Array de IDs dos fornecedores
 * @returns Promise com array de nomes dos fornecedores
 */
export async function getSupplierNamesByIds(ids: number[]): Promise<string[]> {
  const names: string[] = [];
  
  for (const id of ids) {
    const name = await getSupplierNameById(id);
    names.push(name);
  }
  
  return names;
}

/**
 * Limpa o cache de fornecedores
 */
export function clearSupplierCache(): void {
  supplierCache.clear();
}

/**
 * Verifica se um fornecedor está no cache
 * @param id - ID do fornecedor
 * @returns true se o fornecedor está no cache
 */
export function isSupplierCached(id: number): boolean {
  return supplierCache.has(id);
}