import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Car, Save } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

const formSchema = z.object({
  placa: z.string().min(1, "Placa é obrigatória"),
  modelo: z.string().min(1, "Modelo é obrigatório"),
  chassi: z.string().min(1, "Chassi é obrigatório"),
  km_atual: z.string().min(1, "KM atual é obrigatório"),
  consultor_seminovos: z.string().min(1, "Consultor é obrigatório"),
  revisao: z.boolean().default(false),
  certificacao: z.boolean().default(false),
  prioridade: z.string().default("NORMAL"),
  observacao_seminovos: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export const Route = createFileRoute('/_authenticated/_toyota/toyota/revisoes/nova' as any)({
  component: NovaRevisaoPage,
});

function NovaRevisaoPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      placa: "",
      modelo: "",
      chassi: "",
      km_atual: "",
      consultor_seminovos: user?.username || "",
      revisao: false,
      certificacao: false,
      prioridade: "NORMAL",
      observacao_seminovos: "",
    },
  });

  async function onSubmit(values: FormValues) {
    if (!values.revisao && !values.certificacao) {
      toast.error("Selecione pelo menos um serviço (Revisão ou Certificação)");
      return;
    }

    try {
      const { error } = await supabase.from('toyota_revisoes').insert({
        placa: values.placa.toUpperCase(),
        modelo: values.modelo.toUpperCase(),
        chassi: values.chassi.toUpperCase(),
        km_atual: parseFloat(values.km_atual),
        consultor_seminovos: values.consultor_seminovos,
        revisao: values.revisao,
        certificacao: values.certificacao,
        prioridade: values.prioridade,
        observacao_seminovos: values.observacao_seminovos,
        solicitante_id: user?.id,
        status: 'aguardando_aprovacao',
      });

      if (error) throw error;

      toast.success("Solicitação criada com sucesso!");
      navigate({ to: "/toyota/revisoes" });
    } catch (error: any) {
      toast.error("Erro ao criar solicitação: " + error.message);
    }
  }

  return (
    <div className="container p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/toyota/revisoes" })}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Nova Solicitação de Revisão</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" /> Dados do Veículo
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="placa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Placa</FormLabel>
                    <FormControl>
                      <Input placeholder="ABC1234" {...field} className="uppercase" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="chassi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chassi</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o chassi" {...field} className="uppercase" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="modelo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: COROLLA XEI" {...field} className="uppercase" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="km_atual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>KM Atual</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Serviços e Prioridade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-6 p-4 bg-muted/30 rounded-lg">
                <FormField
                  control={form.control}
                  name="revisao"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-bold cursor-pointer">Solicitar Revisão</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="certificacao"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-bold cursor-pointer">Solicitar Certificação</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="consultor_seminovos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consultor de Seminovos</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="prioridade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioridade</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a prioridade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NORMAL">Normal</SelectItem>
                          <SelectItem value="ALTA">Alta</SelectItem>
                          <SelectItem value="URGENTE">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="observacao_seminovos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações Adicionais</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Detalhes importantes para a revisão..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate({ to: "/toyota/revisoes" })}>
              Cancelar
            </Button>
            <Button type="submit" className="gap-2">
              <Save className="h-4 w-4" /> Criar Solicitação
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
