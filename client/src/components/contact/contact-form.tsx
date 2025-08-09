import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

// Schema de validação do formulário de contato
const contactFormSchema = z.object({
  name: z.string().min(3, {
    message: "Nome deve ter pelo menos 3 caracteres",
  }),
  email: z.string().email({
    message: "E-mail inválido",
  }),
  phone: z.string().optional(),
  subject: z.string().min(3, {
    message: "Assunto deve ter pelo menos 3 caracteres",
  }),
  message: z.string().min(10, {
    message: "Mensagem deve ter pelo menos 10 caracteres",
  }),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export function ContactForm() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(data: ContactFormValues) {
    try {
      await apiRequest("/api/contact", "POST", data);

      // Envia os dados também para o webhook do n8n
      await fetch("https://lipegol18.app.n8n.cloud/webhook/Fale conosco", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      toast({
        title: t("contact.success"),
        description: "",
        variant: "default",
      });
      form.reset();
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast({
        title: t("contact.error"),
        description: "",
        variant: "destructive",
      });
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">
          {t("contact.title")}
        </CardTitle>
        <CardDescription>{t("contact.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contact.name")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("contact.name")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contact.email")}</FormLabel>
                  <FormControl>
                    <Input placeholder="email@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contact.subject")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("contact.subject")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contact.message")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("contact.message")}
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t("common.sending") : t("contact.send")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
