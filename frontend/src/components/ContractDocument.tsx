import type { ReactNode } from "react";
import { formatDateBr } from "@/lib/quote";
import {
  CONTRACTOR,
  GROUP_PLAN,
  centsToWords,
  dayName,
  dayNamePlural,
  formatCents,
  formatLongDate,
  joinList,
  minutesText,
  numberToWords,
  numberToWordsFem,
  periodOf,
  sortedSchedule,
  type ContractData,
} from "@/lib/contract";
import logo from "@/assets/logo.png";

// O contrato em si (texto do modelo da professora). Cada folha A4 é um [data-pdf-page]
// — é isso que lib/contractPdf.ts transforma em PDF.

function Header() {
  return (
    <div className="flex h-16 items-center justify-center bg-neutral-900 print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]">
      <img src={logo} alt="Teacher Késsia Lima" className="h-9 w-auto invert" />
    </div>
  );
}

function Box({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-md border-2 border-neutral-900 px-4 pb-3 pt-1">
      <legend className="px-1 text-sm font-bold">{title}</legend>
      <div className="space-y-0.5 break-words text-[13px] leading-snug">{children}</div>
    </fieldset>
  );
}

function Clause({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 break-inside-avoid">
      <h2 className="text-[15px] font-bold">
        {n}. {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Item({ n, children }: { n: string; children: ReactNode }) {
  return (
    <div className="flex gap-2 text-[13px] leading-relaxed">
      <span className="w-8 shrink-0 font-bold">{n}</span>
      <div className="space-y-2 text-justify">{children}</div>
    </div>
  );
}

export default function ContractDocument({ data }: { data: ContractData }) {
  const schedule = sortedSchedule(data.schedule);
  const perWeek = schedule.length;
  const sameLength = schedule.every((s) => s.hours === schedule[0].hours);
  const perWeekText = `${perWeek} (${numberToWordsFem(perWeek)}) ${perWeek === 1 ? "aula" : "aulas"}`;
  const weekdaysText = joinList(schedule.map((s) => dayName(s.weekday)));
  const lengthText = sameLength
    ? `${minutesText(schedule[0].hours)} cada`
    : joinList(schedule.map((s) => `${minutesText(s.hours)} na ${dayName(s.weekday)}`));
  const monthsText = `${data.months} (${numberToWords(data.months)}) meses`;
  const valueText = `${formatCents(data.installmentCents)} (${centsToWords(data.installmentCents)})`;
  const totalText = `${formatCents(data.totalCents)} (${centsToWords(data.totalCents)})`;
  const installmentsText = `${data.installments} (${numberToWordsFem(data.installments)})`;
  const timesText = joinList(schedule.map((s) => `${dayNamePlural(s.weekday)} às ${s.time}`));
  const periods = joinList([...new Set(schedule.map((s) => periodOf(s.time)))]);
  const upfront = data.paymentMode === "upfront";

  return (
    <div data-contract-root className="mx-auto max-w-[210mm] bg-white shadow-lg print:max-w-none print:shadow-none">
      <style>{`@page { size: A4; margin: 0; } @media print { body { background: white; } }`}</style>

      {/* Página 1: partes e plano */}
      <div data-pdf-page className="break-after-page">
        <div className="h-12 bg-neutral-900 print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]" />
        <div className="space-y-5 px-5 sm:px-[18mm] py-8">
          <div className="flex items-start justify-between gap-4">
            <div className="border-l-4 border-neutral-900 pl-4">
              <h1 className="text-2xl font-bold">CONTRATO</h1>
              <p className="text-xl font-light">Prestação de Serviços</p>
              <p className="text-xl font-light">Ensino de Língua Estrangeira</p>
            </div>
            <img src={logo} alt="Teacher Késsia Lima" className="h-10 w-auto" />
          </div>

          <Box title="Contratante">
            <p className="font-bold">{data.student.fullName}</p>
            {data.student.document && (
              <p>
                <b>RG/CPF:</b> {data.student.document}
              </p>
            )}
            {data.student.address && (
              <p>
                <b>Endereço:</b> {data.student.address}
              </p>
            )}
            {data.student.phone && (
              <p>
                <b>Telefone:</b> {data.student.phone}
              </p>
            )}
            <p>
              <b>E-mail:</b> {data.student.email}
            </p>
          </Box>

          <Box title="Contratado">
            <p>
              <b>Razão Social:</b> {CONTRACTOR.businessName}
            </p>
            <p>
              <b>Responsável:</b> {CONTRACTOR.responsible}
            </p>
            <p>
              <b>CPF/CNPJ:</b> {CONTRACTOR.cnpj}
            </p>
            <p>
              <b>E-mail:</b> {CONTRACTOR.email}
            </p>
            <p>
              <b>Telefone:</b> {CONTRACTOR.phone}
            </p>
          </Box>

          <p className="text-justify text-[13px] leading-relaxed">
            Por este instrumento, as partes têm entre si, justo e contratado o que segue. A CONTRATADA é ajustada, para
            realizar os serviços e produtos a seguir discriminados com seus respectivos valores, a serem pagos à
            contratada, que será regido pelas cláusulas a seguir:
          </p>

          <div className="space-y-4 rounded-md border-2 border-neutral-900 px-5 py-5">
            <h2 className="text-center text-2xl font-extrabold">DO PLANO CONTRATADO</h2>
            <div className="grid gap-x-3 gap-y-2 text-[13px] leading-snug sm:grid-cols-[9.5rem_1fr] sm:gap-y-4">
              <p className="font-bold">Plano Contratado:</p>
              <p className="text-justify">
                {GROUP_PLAN[data.groupType]} com <b>{perWeekText}</b> por semana, {perWeek === 1 ? "sendo ela na" : "sendo elas na"}{" "}
                <b>{weekdaysText}</b>, totalizando <b>{data.totalClasses} aulas</b>, por {lengthText}
                {data.planExtras && <>, adicionando: {data.planExtras}</>}.
              </p>
              <p className="font-bold">Valor do plano:</p>
              {upfront ? (
                <p className="text-justify">
                  Pagamento <b>à vista</b> de <b>{totalText}</b>, no ato da assinatura desse contrato.
                </p>
              ) : (
                <p className="text-justify">
                  <b>{installmentsText}</b> parcelas de <b>{valueText}</b> mensais, que serão pagas todo dia{" "}
                  <b>{data.dueDay},</b> a partir do momento da assinatura desse contrato.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Páginas seguintes: cláusulas */}
      <div data-pdf-page className="break-after-page">
        <Header />
        <div className="space-y-6 px-5 sm:px-[18mm] py-8">
          <Clause n={1} title="Objeto do contrato">
            <Item n="1.1.">
              <p>
                O presente instrumento tem como objeto a prestação dos serviços de ensino do idioma Inglês, com enfoque
                em Inglês para fluência, utilizando o método das cinco linguagens do aprendizado: <b>Speaking</b>,{" "}
                <b>Listening</b>, <b>Reading</b>, <b>Writing</b> e <b>Gramática</b>.
              </p>
              <p>
                O CONTRATANTE reconhece que o sucesso do aprendizado depende não apenas da metodologia da CONTRATADA,
                mas também de sua dedicação e comprometimento com o material e as atividades propostas.
              </p>
            </Item>
          </Clause>

          <Clause n={2} title="Duração do curso">
            <Item n="2.1.">
              <p>
                O curso será composto de <b>{perWeekText} {perWeek === 1 ? "semanal" : "semanais"}</b> com duração de{" "}
                <b>{lengthText}</b> e exercícios extras, para que o aluno faça a parte durante a semana até o encontro de
                sua próxima aula, dessa forma complementando o aprendizado e crescimento pessoal no inglês.
              </p>
            </Item>
            <Item n="2.2.">
              <p>
                O presente contrato terá vigência de <b>{monthsText}</b>, <b>totalizando {data.totalClasses} aulas</b>,
                passando a vigorar a partir da data de sua assinatura, podendo ser prorrogado, a critério do CONTRATANTE.
                O contrato terá{" "}
                <b>
                  início em {formatDateBr(data.startDate)} com término em {formatDateBr(data.endDate)}.
                </b>
              </p>
            </Item>
            <Item n="2.3.">
              <p>
                Após o término de contrato na data estipulada em cláusula acima citada (Cláusula 2.2), esse contrato
                poderá ser prorrogado através de aditivo contratual, previamente concordado entre o(a) CONTRATANTE e a
                CONTRATADA e assinado por ambos, dessa forma mantendo as cláusulas acordadas nesse contrato com ou sem
                alterações.
              </p>
            </Item>
          </Clause>

          <Clause n={3} title="Combinações">
            <Item n="3.1.">
              <p>
                As aulas serão ministradas às <b>{timesText} (horário de Brasília)</b>, de toda semana, pelo tempo
                pré-estipulado nesse contrato, no período da <b>{periods}</b>. Ressalvando-se o caso de feriados
                nacionais, que <b>não</b> haverá aula, nem reposição, pois já estão descontadas do valor das parcelas.
              </p>
            </Item>
          </Clause>
        </div>
      </div>

      <div data-pdf-page className="break-after-page">
        <Header />
        <div className="space-y-6 px-5 sm:px-[18mm] py-8">
          <Clause n={4} title="Cancelamento ou remarcação de aula">
            <Item n="4.1.">
              <p>
                Na ocorrência de <b>cancelamento</b> de aula pelo CONTRATANTE, o CONTRATADO deverá ser notificado com{" "}
                <b>no mínimo 24 (vinte quatro)</b> horas de <b>antecedência</b> e a aula será reagendada conforme for
                acordado entre as partes no momento do aviso prévio de cancelamento. Válido para todos os tipos de
                planos.
              </p>
            </Item>
            <Item n="4.2.">
              <p>
                Aulas canceladas em prazo menor que <b>24 (vinte quatro horas) não serão recuperadas</b>, sendo
                consideradas aulas prestadas. Isto não exime a responsabilidade da (o) CONTRATANTE de informar à
                CONTRATADA sua ausência.
              </p>
            </Item>
          </Clause>

          <Clause n={5} title="Prazo e horários para remarcação de aulas">
            <Item n="5.1.">
              <p>
                Aulas remarcadas com no mínimo <b>24 (vinte quatro)</b> horas de <b>antecedência</b>{" "}
                <b>deverão ser realizadas dentro do prazo de um mês</b> a partir da data de cancelamento, e será
                considerada aula dado caso o <b>CONTRATANTE</b> não realize a reposição dentro do prazo.
              </p>
            </Item>
            <Item n="5.2.">
              <p>
                Estarão <b>disponíveis</b> para reposição apenas os turnos <b>manhã ou tarde, de segunda a sexta,</b> não
                sendo possível realizar reposições no período da noite devido a falta de horários disponíveis.
              </p>
            </Item>
          </Clause>

          <Clause n={6} title="Atraso ou não comparecimento sem aviso prévio">
            <Item n="6.1.">
              <p>
                Caso o <b>CONTRATANTE</b> não notifique o <b>CONTRATADO</b> sua ausência, após <b>15 (quinze)</b> minutos
                de espera na sala do meet, essa aula será considerada dada e sem direito a reposição.
              </p>
            </Item>
          </Clause>

          <Clause n={7} title="Recesso ou período de férias">
            <Item n="7.1.">
              <p>
                O <b>CONTRATADO</b> terá direito a <b>cinco semanas de férias</b>, que poderão ser divididas entre o mês
                de Junho ou Dezembro. O valor das aulas nesse período <b>já estão descontadas do valor das parcelas,</b>{" "}
                assim não gerando reposição.
              </p>
            </Item>
            <Item n="7.2.">
              <p>
                Caso o <b>CONTRATANTE</b> solicite um período de férias <b>com antecedência,</b> um segundo contrato será
                gerado com clausulas e valores atualizados.
              </p>
            </Item>
          </Clause>
        </div>
      </div>

      <div data-pdf-page>
        <Header />
        <div className="space-y-6 px-5 sm:px-[18mm] py-8">
          <Clause n={8} title="Pagamento">
            <Item n="8.1.">
              {upfront ? (
                <p>
                  O pagamento das aulas contratadas será efetuado <b>à vista</b>, no valor de <b>{totalText}</b>, no ato
                  da assinatura do contrato.
                </p>
              ) : (
                <p>
                  O pagamento das aulas contratadas deverá ser efetuado até o dia <b>{data.dueDay}</b> de cada mês, no
                  valor de <b>{valueText}</b>. Ressalva-se apenas o primeiro pagamento, que deverá ser efetuado no ato da
                  assinatura do contrato.
                </p>
              )}
            </Item>
            <Item n="8.2.">
              <p>
                Em caso de <b>inadimplemento</b> por parte do CONTRATANTE quanto ao pagamento do serviço prestado, deverá
                incidir sobre o valor do presente instrumento,{" "}
                <b>multa de 2%, mais juros de 1% ao dia e correção monetária.</b>
              </p>
            </Item>
            <div className="mx-auto w-fit rounded-md border-2 border-neutral-900 px-10 py-3 text-center text-[13px] leading-relaxed">
              <p>Dado bancários:</p>
              {CONTRACTOR.bank.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </Clause>

          <Clause n={9} title="Rescisão de Contrato">
            <Item n="9.1.">
              <p>
                Para a rescisão do presente contrato pelo(a) CONTRATANTE, este deverá notificar (a) CONTRATADA com{" "}
                <b>antecedência mínima de 30 (trinta) dias</b>, devendo assinar uma declaração específica junto à
                CONTRATADA de cancelamento dos serviços prestados. Esse período de <b>aviso de 30 dias é pago</b>, o
                contratante fazendo as aulas ou não. Após o termino do aviso de 30 dias, não restará nenhuma obrigação
                contratual entre as partes.
              </p>
            </Item>
          </Clause>

          <Clause n={10} title="Acordo entre as partes">
            <Item n="10.1.">
              <p>
                As partes abaixo identificadas têm, entre si, justo e acertado o presente Contrato de Prestação de
                Serviços de Ensino de Língua Estrangeira, que será regido pelas condições descritas anteriormente.
              </p>
            </Item>
          </Clause>

          <div className="space-y-8 pt-4 text-center text-xs break-inside-avoid">
            <div>
              <p className="mb-10 font-bold">CONTRATANTE:</p>
              <div className="mx-auto w-3/5 border-t-2 border-neutral-900 pt-1">
                <p>{data.student.fullName}</p>
                {data.student.document && <p className="font-bold">CPF: {data.student.document}</p>}
              </div>
            </div>
            <div>
              <p className="mb-10 font-bold">CONTRATADA:</p>
              <div className="mx-auto w-3/5 border-t-2 border-neutral-900 pt-1">
                <p>{CONTRACTOR.responsible}</p>
                <p className="font-bold">Cnpj: {CONTRACTOR.cnpj}</p>
              </div>
            </div>
            <p className="pt-2">
              {data.signCity}, {formatLongDate(data.signDate)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
