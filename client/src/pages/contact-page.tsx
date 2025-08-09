import React from "react";
import { ContactForm } from "@/components/contact/contact-form";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useLocation } from "wouter";

export default function ContactPage() {
  const { t } = useTranslation();
  const [_, navigate] = useLocation();

  const handleGoBack = () => {
    // Wouter não suporta navigate(-1), então usamos window.history
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback para página inicial se não houver histórico
      navigate("/");
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-6xl mx-auto">
        {/* Botão Voltar */}
        <Button 
          onClick={handleGoBack}
          variant="outline" 
          className="mb-6 flex items-center gap-2 text-blue-500 border-blue-300 hover:bg-blue-50 hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("common.back", "Voltar")}
        </Button>

        <div className="flex flex-col lg:flex-row gap-8 items-center">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-4">{t("contact.title")}</h1>
            <p className="text-lg mb-6">
              {t("contact.subtitle")}
            </p>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold">{t("contact.whatsapp")}</h3>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white border-green-700"
                  onClick={() => window.open("https://wa.me/5521997364870", "_blank")}
                >
                  <FaWhatsapp className="h-5 w-5" />
                  {t("contact.whatsapp.description")}
                  <ExternalLink className="h-4 w-4 ml-auto" />
                </Button>
              </div>
              <div>
                <h3 className="text-xl font-semibold">{t("contact.email")}</h3>
                <p>medsync.suporte@gmail.com</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold">{t("common.businessHours")}</h3>
                <p>{t("common.weekdayHours")}</p>
              </div>
            </div>
          </div>
          <div className="flex-1">
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}