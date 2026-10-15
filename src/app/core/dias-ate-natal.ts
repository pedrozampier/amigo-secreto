import { differenceInCalendarDays } from 'date-fns';

/**
 * Dias de calendário entre `hoje` e o Natal (25/12) do ano informado — API-02.
 *
 * Usa `differenceInCalendarDays` do date-fns (já na tabela §2 do SDD) em vez de
 * aritmética de milissegundos: a divisão por 86400000 erra em fronteira de horário
 * de verão e quando `hoje` tem componente de hora diferente de meia-noite.
 *
 * Função pura e isolada do HolidayService de propósito: é a única regra de cálculo
 * desta trilha, e D-20 pede spec exatamente aqui — sem TestBed, sem mock de HTTP.
 */
export function diasAteNatal(hoje: Date, ano: number): number {
  const natal = new Date(ano, 11, 25);
  return differenceInCalendarDays(natal, hoje);
}
