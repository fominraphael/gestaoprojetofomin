import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench } from "lucide-react";

export interface RevisaoValidacao {
  dentroCronograma: boolean;
  revisaoNecessaria?: string;
  numeroOS?: string;
  motivoAjuste?: string;
}

interface Props {
  value: RevisaoValidacao;
  onChange: (v: RevisaoValidacao) => void;
}

const REVISOES = [
  "10.000 km",
  "20.000 km",
  "30.000 km",
  "40.000 km",
  "50.000 km",
  "60.000 km",
  "70.000 km",
  "80.000 km",
  "Revisão Combinada",
];

export function ValidacaoRevisao({ value, onChange }: Props) {
  const set = <K extends keyof RevisaoValidacao>(k: K, v: RevisaoValidacao[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wrench className="h-4 w-4 text-slate-600" />
          Validação de Revisão
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="revisao-cronograma"
            checked={value.dentroCronograma}
            onCheckedChange={(c) => set("dentroCronograma", c === true)}
          />
          <Label
            htmlFor="revisao-cronograma"
            className="text-sm font-medium leading-tight cursor-pointer"
          >
            Revisões dentro do cronograma previsto?
          </Label>
        </div>

        {!value.dentroCronograma && (
          <div className="space-y-4 rounded-md border border-amber-200 bg-amber-50/50 p-4">
            <div className="space-y-2">
              <Label>Qual revisão precisa ser feita?</Label>
              <Select
                value={value.revisaoNecessaria ?? ""}
                onValueChange={(v) => set("revisaoNecessaria", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a revisão" />
                </SelectTrigger>
                <SelectContent>
                  {REVISOES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="os-numero">Número da OS que precisa de ajuste</Label>
              <Input
                id="os-numero"
                placeholder="Ex.: 123456"
                value={value.numeroOS ?? ""}
                onChange={(e) => set("numeroOS", e.target.value)}
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="os-motivo">Descrição / Motivo do ajuste da OS</Label>
              <Textarea
                id="os-motivo"
                placeholder="Descreva o motivo do ajuste..."
                value={value.motivoAjuste ?? ""}
                onChange={(e) => set("motivoAjuste", e.target.value)}
                maxLength={1000}
                rows={4}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function useRevisaoValidacao(initial?: Partial<RevisaoValidacao>) {
  return useState<RevisaoValidacao>({
    dentroCronograma: true,
    ...initial,
  });
}
