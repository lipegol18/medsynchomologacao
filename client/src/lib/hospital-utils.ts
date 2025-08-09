import { useToast } from "@/hooks/use-toast";

// Função para fazer upload de logo de hospital
export async function uploadHospitalLogo(
  hospitalId: number,
  logoFile: File,
  existingLogoUrl?: string | null
): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('logo', logoFile);
    formData.append('hospitalId', hospitalId.toString());
    
    if (existingLogoUrl) {
      formData.append('existingLogoUrl', existingLogoUrl);
    }
    
    const response = await fetch('/api/uploads/hospital-logo', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Error uploading hospital logo:', error);
    return null;
  }
}