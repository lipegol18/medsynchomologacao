import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// Estilos para o PDF com suporte a múltiplas páginas
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    paddingTop: 80, // Espaço para cabeçalho fixo
    paddingBottom: 60, // Espaço para rodapé fixo
    paddingHorizontal: 20,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  // Cabeçalho fixo em todas as páginas
  fixedHeader: {
    position: 'absolute',
    top: 15,
    left: 20,
    right: 20,
    height: 80,
    backgroundColor: '#ffffff',
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
  },
  headerLogoLeft: {
    width: 80,
    height: 60,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  headerLogoRight: {
    width: 160,
    height: 120,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  hospitalLogo: {
    width: 80,
    height: 60,
    objectFit: 'contain',
  },
  doctorLogo: {
    width: 160,
    height: 120,
    objectFit: 'contain',
  },
  logoPlaceholder: {
    width: 80,
    height: 60,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  logoPlaceholderText: {
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'center',
  },
  // Rodapé fixo em todas as páginas
  fixedFooter: {
    position: 'absolute',
    bottom: 15,
    left: 20,
    right: 20,
    height: 40,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    width: 100,
    height: 50,
    marginRight: 15,
  },
  logo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  hospitalInfo: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 3,
    color: '#2563eb',
    textAlign: 'center',
  },
  hospitalDetails: {
    fontSize: 8,
    color: '#666666',
    lineHeight: 1.2,
    textAlign: 'center',
  },
  // Seção do paciente com título interno
  patientSection: {
    backgroundColor: '#f8fafc',
    padding: 12,
    marginBottom: 15,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  // Título da seção de dados do paciente (dentro da caixa)
  patientTitleSection: {
    marginBottom: 10,
  },
  patientTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  patientTitleLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    marginBottom: 10,
  },
  patientHeader: {
    marginBottom: 8,
  },
  patientName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },

  patientDetails: {
    flexDirection: 'row',
    gap: 20,
  },
  patientColumn: {
    flex: 1,
  },
  patientInfoText: {
    fontSize: 9,
    color: '#334155',
    marginBottom: 2,
    lineHeight: 1.3,
  },
  bold: {
    fontWeight: 'bold',
  },
  // Título do documento (igual à prévia)
  documentTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1e3a8a',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  // Caixa de justificativa (igual à prévia)
  justificationBox: {
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 3,
    marginBottom: 15,
    minHeight: 60,
    borderWidth: 0.5,
    borderColor: '#d1d5db',
  },
  justificationText: {
    fontSize: 9,
    color: '#000000',
    textAlign: 'justify',
    lineHeight: 1.4,
  },
  // Seções clínicas (igual à prévia)
  clinicalSection: {
    marginBottom: 12,
    paddingLeft: 8, // Mesma indentação da justificativa
  },
  sectionHeader: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  clinicalContent: {
    paddingLeft: 15,
    gap: 2,
  },
  clinicalText: {
    fontSize: 9,
    color: '#1f2937',
    marginBottom: 2,
    lineHeight: 1.3,
  },
  autoAddedText: {
    fontSize: 8,
    color: '#059669',
    fontWeight: 'bold',
  },
  primaryText: {
    fontSize: 8,
    color: '#2563eb',
    fontWeight: 'bold',
  },
  // Informações do procedimento (igual à prévia)
  procedureInfoRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 20,
    paddingLeft: 8, // Mesma indentação da justificativa
  },
  procedureInfoColumn: {
    flex: 1,
  },
  procedureInfoText: {
    fontSize: 9,
    color: '#1f2937',
    paddingLeft: 15,
    lineHeight: 1.3,
  },
  // Seção de assinatura (igual à prévia)
  signatureSection: {
    marginTop: 30,
    marginBottom: 15,
  },
  dateSection: {
    alignItems: 'flex-end',
    marginBottom: 25,
  },
  dateText: {
    fontSize: 9,
    color: '#1f2937',
  },
  signatureSpace: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: -15,
    zIndex: 2,
  },
  signaturePlaceholder: {
    fontSize: 9,
    color: '#6b7280',
  },
  signatureImage: {
    width: 240,
    height: 120,
    objectFit: 'contain',
    marginBottom: -20,
  },
  doctorInfo: {
    alignItems: 'center',
    marginBottom: 25,
    marginTop: 0,
    zIndex: 1,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#6b7280',
    width: 150,
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  doctorSpecialty: {
    fontSize: 9,
    color: '#1f2937',
    marginBottom: 2,
  },
  doctorCrm: {
    fontSize: 9,
    color: '#1f2937',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
    paddingTop: 4,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 9,
    color: '#6b7280',
  },
  // Seções que quebram automaticamente
  section: {
    marginBottom: 15,
    break: false, // Evita quebra desnecessária dentro da seção
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1f2937',
    textTransform: 'uppercase',
    backgroundColor: '#f3f4f6',
    padding: 6,
    borderRadius: 3,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  column: {
    flex: 1,
    paddingRight: 10,
  },
  label: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#6b7280',
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    color: '#000000',
    lineHeight: 1.3,
  },
  // Justificativa com quebra automática
  justification: {
    fontSize: 10,
    lineHeight: 1.4,
    textAlign: 'justify',
    color: '#000000',
    orphans: 3, // Mínimo de linhas no final da página
    widows: 3,  // Mínimo de linhas no início da página
  },
  // Tabelas com quebra automática
  table: {
    marginVertical: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 4,
    paddingHorizontal: 8,
    break: false, // Evita quebra no meio da linha
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
    paddingRight: 5,
  },
  tableCellHeader: {
    flex: 1,
    fontSize: 9,
    fontWeight: 'bold',
    paddingRight: 5,
    color: '#374151',
  },
  pageNumber: {
    fontSize: 8,
    color: '#6b7280',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginVertical: 10,
  },
  // Força quebra de página quando necessário
  pageBreak: {
    break: true,
  },
});

interface OrderPDFDocumentProps {
  orderData: any;
  patientData: any;
  hospitalData: any;
  procedureData: any;
  cidData: any;
  secondaryProcedures?: any[];
  opmeItems?: any[];
  suppliers?: any[];
  attachments?: any[];
}

export const OrderPDFDocument: React.FC<OrderPDFDocumentProps> = ({
  orderData,
  patientData,
  hospitalData,
  procedureData,
  cidData,
  secondaryProcedures = [],
  opmeItems = [],
  suppliers = [],
  attachments = [],
}) => {
  // Formatar data
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // Formatar CPF
  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Componente de cabeçalho reutilizável
  const PageHeader = () => (
    <View style={styles.fixedHeader} fixed>
      <View style={styles.headerRow}>
        {/* Logo do Hospital - Canto superior esquerdo */}
        <View style={styles.headerLogoLeft}>
          {hospitalData?.logoUrl ? (
            <Image style={styles.hospitalLogo} src={hospitalData.logoUrl} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoPlaceholderText}>Logo Hospital</Text>
            </View>
          )}
        </View>

        {/* Espaço central vazio */}
        <View style={styles.headerCenter}>
          {/* Espaço vazio no centro */}
        </View>

        {/* Logo do Médico - Canto superior direito */}
        <View style={styles.headerLogoRight}>
          {orderData?.doctorLogoUrl ? (
            <Image style={styles.doctorLogo} src={orderData.doctorLogoUrl} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoPlaceholderText}>Logo Médico</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  // Componente de rodapé reutilizável
  const PageFooter = () => (
    <View style={styles.fixedFooter} fixed>
      <Text style={styles.footerText}>
        Pedido #{orderData?.id} - Gerado em {new Date().toLocaleDateString('pt-BR')}
      </Text>
      <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => 
        `Página ${pageNumber} de ${totalPages}`
      } />
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <PageHeader />
        <PageFooter />

        {/* Seção de Dados do Paciente */}
        {patientData && (
          <View style={styles.patientSection}>
            {/* Título "Dados do Paciente" com linha separatória dentro da caixa */}
            <View style={styles.patientTitleSection}>
              <Text style={styles.patientTitle}>Dados do Paciente</Text>
              <View style={styles.patientTitleLine} />
            </View>
            
            {/* Nome do paciente com fonte menor */}
            <View style={styles.patientHeader}>
              <Text style={styles.patientName}>{patientData.fullName}</Text>
            </View>
            
            {/* Informações organizadas em duas colunas */}
            <View style={styles.patientDetails}>
              <View style={styles.patientColumn}>
                <Text style={styles.patientInfoText}>
                  <Text style={styles.bold}>CPF:</Text> {patientData.cpf ? formatCPF(patientData.cpf) : 'Não informado'}
                </Text>
                <Text style={styles.patientInfoText}>
                  <Text style={styles.bold}>Data de Nascimento:</Text> {patientData.birthDate ? formatDate(patientData.birthDate) : 'Não informado'}
                </Text>
                <Text style={styles.patientInfoText}>
                  <Text style={styles.bold}>Idade:</Text> {patientData.birthDate ? new Date().getFullYear() - new Date(patientData.birthDate).getFullYear() : 'N/A'} anos
                </Text>
              </View>
              <View style={styles.patientColumn}>
                <Text style={styles.patientInfoText}>
                  <Text style={styles.bold}>Plano de Saúde:</Text> {patientData.insurance || 'Não informado'}
                </Text>
                <Text style={styles.patientInfoText}>
                  <Text style={styles.bold}>Número da Carteirinha:</Text> {patientData.insuranceNumber || 'Não informado'}
                </Text>
                <Text style={styles.patientInfoText}>
                  <Text style={styles.bold}>Tipo do Plano:</Text> {patientData.plan || 'Não informado'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Título do documento */}
        <Text style={styles.documentTitle}>
          SOLICITAÇÃO DE PROCEDIMENTO CIRÚRGICO
        </Text>

        {/* Justificativa clínica */}
        <View style={styles.justificationBox}>
          <Text style={styles.justificationText}>
            {orderData?.clinicalJustification || 'Justificativa clínica será exibida aqui'}
          </Text>
        </View>

        {/* Códigos CID-10 */}
        <View style={styles.clinicalSection}>
          <Text style={styles.sectionHeader}>Códigos CID-10:</Text>
          <View style={styles.clinicalContent}>
            {cidData && Array.isArray(cidData) && cidData.length > 0 ? (
              cidData.map((cidItem, index) => {
                const code = cidItem.cid?.code || cidItem.code;
                const description = cidItem.cid?.description || cidItem.description;
                return (
                  <Text key={index} style={styles.clinicalText}>
                    {code} - {description}
                    {(cidItem.isAutoAdded || cidItem.cid?.isAutoAdded) && (
                      <Text style={styles.autoAddedText}> (Automático)</Text>
                    )}
                  </Text>
                );
              })
            ) : (
              <Text style={styles.clinicalText}>Nenhum código CID selecionado</Text>
            )}
          </View>
        </View>

        {/* Condutas Cirúrgicas */}
        {cidData && Array.isArray(cidData) && cidData.some(cidItem => cidItem.surgicalApproach) && (
          <View style={styles.clinicalSection}>
            <Text style={styles.sectionHeader}>Condutas Cirúrgicas:</Text>
            <View style={styles.clinicalContent}>
              {(() => {
                // Extrair condutas únicas para evitar repetição
                const uniqueApproaches = new Map();
                cidData.forEach(cidItem => {
                  if (cidItem.surgicalApproach) {
                    const approachId = cidItem.surgicalApproach.id;
                    if (!uniqueApproaches.has(approachId)) {
                      uniqueApproaches.set(approachId, cidItem.surgicalApproach);
                    }
                  }
                });
                
                return Array.from(uniqueApproaches.values()).map((approach, index) => (
                  <Text key={index} style={styles.clinicalText}>
                    {approach.name}
                  </Text>
                ));
              })()}
            </View>
          </View>
        )}

        {/* Procedimentos Cirúrgicos Necessários (igual à prévia) */}
        {secondaryProcedures?.length > 0 && (
          <View style={styles.clinicalSection}>
            <Text style={styles.sectionHeader}>Procedimentos Cirúrgicos Necessários:</Text>
            <View style={styles.clinicalContent}>
              {(() => {
                const parsePorteValue = (porte) => {
                  if (!porte || typeof porte !== 'string') return 0;
                  const match = porte.match(/^(\d+)([A-Za-z]?)$/);
                  if (!match) return 0;
                  const numero = parseInt(match[1], 10);
                  const letra = match[2]?.toUpperCase() || 'A';
                  const valorLetra = letra.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
                  return (numero * 100) + valorLetra;
                };

                const sortedProcedures = [...secondaryProcedures].sort(
                  (a, b) => parsePorteValue(b.procedure?.porte) - parsePorteValue(a.procedure?.porte)
                );

                if (sortedProcedures.length === 1) {
                  const mainProc = sortedProcedures[0];
                  return (
                    <Text style={styles.clinicalText}>
                      {mainProc.quantity} x {mainProc.procedure?.code} - {mainProc.procedure?.name} (Procedimento Principal)
                    </Text>
                  );
                } else if (sortedProcedures.length > 1) {
                  const mainProc = sortedProcedures[0];
                  const secondaryProcs = sortedProcedures.slice(1);
                  return (
                    <>
                      <Text style={styles.clinicalText}>
                        {mainProc.quantity} x {mainProc.procedure?.code} - {mainProc.procedure?.name} (Procedimento Principal)
                      </Text>
                      {secondaryProcs.map((proc, index) => (
                        <Text key={index} style={styles.clinicalText}>
                          {proc.quantity} x {proc.procedure?.code} - {proc.procedure?.name}
                        </Text>
                      ))}
                    </>
                  );
                }
                return null;
              })()}
            </View>
          </View>
        )}

        {/* Informações do procedimento (igual à prévia) */}
        <View style={styles.procedureInfoRow}>
          <View style={styles.procedureInfoColumn}>
            <Text style={styles.sectionHeader}>Caráter do Procedimento:</Text>
            <Text style={styles.procedureInfoText}>
              {orderData?.procedureType === 'eletiva' ? 'Eletivo' : 
               orderData?.procedureType === 'urgencia' ? 'Urgência' : 
               orderData?.procedureType === 'emergencia' ? 'Emergência' : 'Não especificado'}
            </Text>
          </View>
          <View style={styles.procedureInfoColumn}>
            <Text style={styles.sectionHeader}>Lateralidade do Procedimento:</Text>
            <Text style={styles.procedureInfoText}>
              {orderData?.procedureLaterality === 'direito' ? 'Direito' :
               orderData?.procedureLaterality === 'esquerdo' ? 'Esquerdo' :
               orderData?.procedureLaterality === 'bilateral' ? 'Bilateral' : 'Não especificado'}
            </Text>
          </View>
        </View>

        {/* Materiais OPME */}
        {opmeItems?.length > 0 && (
          <View style={styles.clinicalSection}>
            <Text style={styles.sectionHeader}>Lista de Materiais Necessários:</Text>
            <View style={styles.clinicalContent}>
              {opmeItems.map((opmeItem, index) => {
                // Detectar se o item tem estrutura {item: any, quantity: number} ou é direto
                const item = opmeItem.item || opmeItem;
                const quantity = opmeItem.quantity || orderData?.opmeItemQuantities?.[index] || 1;
                
                return (
                  <Text key={index} style={styles.clinicalText}>
                    {quantity} x {item.technicalName || item.commercialName || item.name || 'Material não especificado'}
                    {item.anvisaRegistrationNumber && ` (ANVISA: ${item.anvisaRegistrationNumber})`}
                    {item.manufacturerName && ` - Fabricante: ${item.manufacturerName}`}
                  </Text>
                );
              })}
            </View>
          </View>
        )}

        {/* Fornecedores */}
        {suppliers?.length > 0 && (
          <View style={styles.clinicalSection}>
            <Text style={styles.sectionHeader}>Fornecedores Indicados:</Text>
            <View style={styles.clinicalContent}>
              <Text style={styles.clinicalText}>
                {suppliers
                  .map(supplier => {
                    // Novo formato com fabricantes: "Trade Name (Manufacturer Name)"
                    if (supplier.supplierName && supplier.manufacturerName) {
                      return `${supplier.supplierName} (${supplier.manufacturerName})`;
                    }
                    // Fallback para sistema antigo
                    return supplier.tradeName || supplier.companyName || supplier.name || supplier.supplierName || 'Fornecedor não especificado';
                  })
                  .join('   •   ')
                }
              </Text>
            </View>
          </View>
        )}

        {/* Seção de assinatura (igual à prévia) */}
        <View style={styles.signatureSection}>
          {/* Data */}
          <View style={styles.dateSection}>
            <Text style={styles.dateText}>
              {hospitalData?.name?.includes('Niterói') ? 'Niterói' : 'Rio de Janeiro'}, {formatDate(new Date())}
            </Text>
          </View>

          {/* Espaço para assinatura */}
          <View style={styles.signatureSpace}>
            {orderData?.doctorSignature ? (
              <Image 
                style={styles.signatureImage} 
                src={orderData.doctorSignature} 
              />
            ) : (
              <Text style={styles.signaturePlaceholder}>
                Assinatura não cadastrada
              </Text>
            )}
          </View>

          {/* Dados do médico */}
          <View style={styles.doctorInfo}>
            <View style={styles.signatureLine} />
            <Text style={styles.doctorName}>{orderData?.doctorName?.toUpperCase() || 'NOME DO MÉDICO'}</Text>
            <Text style={styles.doctorSpecialty}>ORTOPEDIA E TRAUMATOLOGIA</Text>
            <Text style={styles.doctorCrm}>CRM {orderData?.doctorCRM || 'XXXX'}</Text>
          </View>

          {/* Rodapé */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Documento gerado por MedSync v2.5.3</Text>
          </View>
        </View>
      </Page>

      {/* Páginas dos anexos de imagem - diretamente após o conteúdo principal */}
      {attachments?.length > 0 && 
        attachments
          .filter((attachment: any) => 
            attachment.type === 'image' || 
            (attachment.type && ['jpeg', 'jpg', 'png', 'gif', 'webp'].includes(attachment.type.toLowerCase())) ||
            (attachment.filename && /\.(jpeg|jpg|png|gif|webp)$/i.test(attachment.filename))
          )
          .map((attachment: any, index: number) => {
            const totalAttachments = attachments.filter((att: any) => 
              att.type === 'image' || 
              (att.type && ['jpeg', 'jpg', 'png', 'gif', 'webp'].includes(att.type.toLowerCase())) ||
              (att.filename && /\.(jpeg|jpg|png|gif|webp)$/i.test(att.filename))
            ).length;
            
            return (
              <Page size="A4" style={styles.page} key={`attachment-${index}`}>
                <PageHeader />
                
                {/* Imagem do anexo */}
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 20, marginBottom: 20 }}>
                  <Image 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '100%',
                      objectFit: 'contain' // Manter proporção da imagem
                    }} 
                    src={attachment.url} 
                  />
                </View>
                
                {/* Legenda na parte inferior */}
                <View style={{ 
                  marginTop: 10, 
                  marginBottom: 20,
                  paddingTop: 10, 
                  borderTopWidth: 1, 
                  borderTopColor: '#e5e7eb',
                  alignItems: 'center'
                }}>
                  <Text style={{ 
                    fontSize: 10, 
                    color: '#6b7280', 
                    textAlign: 'center' 
                  }}>
                    Pedido nº {orderData?.id} - Paciente: {patientData?.fullName} - Anexo {index + 1} / {totalAttachments}
                  </Text>
                </View>
                
                <PageFooter />
              </Page>
            );
          })
      }
    </Document>
  );
};