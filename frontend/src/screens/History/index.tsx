import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { ImageViewer } from '@/components/ImageViewer';
import { DeltaBadge as DeltaBadgeComp } from '@/components/DeltaBadge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getHistoryFeed, confirmTaker, markMistake, getTakerHistory, type EggHistoryEvent, type EggTakerAction } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Info } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const History: React.FC = () => {
  const [events, setEvents] = useState<EggHistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const from = date ? new Date(new Date(date).setHours(0, 0, 0, 0)).toISOString() : undefined;
      const to = date ? new Date(new Date(date).setHours(23, 59, 59, 999)).toISOString() : undefined;
      const data = await getHistoryFeed({ from, to });
      setEvents(data);
    } catch (e: any) {
      setErr(e?.message || 'failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date?.toISOString?.()]);

  const groups = useMemo(() => {
    const map = new Map<number, EggHistoryEvent[]>();
    for (const ev of events) {
      const list = map.get(ev.box_id) || [];
      list.push(ev);
      map.set(ev.box_id, list);
    }
    // keep events per box in chronological desc
    for (const [k, list] of map) {
      list.sort((a, b) => {
        const ta = a.after?.timestamp || a.before?.timestamp || '';
        const tb = b.after?.timestamp || b.before?.timestamp || '';
        return ta < tb ? 1 : ta > tb ? -1 : 0;
      });
      map.set(k, list);
    }
    return Array.from(map.entries())
      .map(([box_id, list]) => ({ box_id, events: list }))
      .sort((a, b) => b.box_id - a.box_id);
  }, [events]);

  if (loading) return <div className="p-4">Carregando histórico...</div>;
  if (err) return <div className="p-4 text-red-600">Erro: {err}</div>;

  return (
    <div className="p-4 space-y-4">
      <FilterBar date={date} setDate={setDate} onRefresh={load} />
      <Accordion type="multiple" className="space-y-3">
        {groups.map((g, index) => (
          <motion.div
            key={g.box_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <AccordionItem value={`box-${g.box_id}`} className="border rounded-md px-2">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <span className="font-medium">Caixa #{g.box_id}</span>
                  <Badge variant="secondary">{g.events.length} eventos</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {g.events.map((ev) => (
                    <EventCard
                      key={ev.event_id}
                      ev={ev}
                      onUpdated={(upd) => setEvents((prev) => prev.map((p) => (p.event_id === upd.event_id ? upd : p)))}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </motion.div>
        ))}
      </Accordion>
      {!groups.length && <div className="text-sm text-muted-foreground">Sem eventos para o filtro selecionado.</div>}
    </div>
  );
};

function FilterBar({
  date,
  setDate,
  onRefresh,
}: {
  date: Date | undefined;
  setDate: (d: Date | undefined) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Calendar mode="single" selected={date} onSelect={setDate} locale={ptBR} className="rounded-md border" />
      <div className="flex flex-col gap-2">
        <div className="text-sm text-muted-foreground">
          {date ? `Filtro: ${format(date, 'dd/MM/yyyy', { locale: ptBR })}` : 'Sem filtro de data'}
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={onRefresh}>
            Atualizar
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setDate(undefined)}>
            Limpar filtro
          </Button>
        </div>
      </div>
    </div>
  );
}

function EventCard({ ev, onUpdated }: { ev: EggHistoryEvent; onUpdated: (e: EggHistoryEvent) => void }) {
  const { user } = useAuth();
  const before = ev.before?.count ?? 0;
  const after = ev.after?.count ?? 0;
  const deltaVal = typeof ev.delta === 'number' ? ev.delta : after - before;
  const when = ev.after?.timestamp || ev.before?.timestamp || '';
  const whenFmt = when ? format(new Date(when), 'dd-MM-yyyy HH:mm') : '';
  const { toast } = useToast();
  const uname = (user?.username || '').trim().toLowerCase();
  const uid = (user?.id || '').toString();
  const taker = (ev.taker_name || '').trim().toLowerCase();
  const verified = (ev.verified_by_user || '').toString().trim().toLowerCase();
  const canMarkMistake = Boolean(
    ev.egg_taker_verified && user?.username && (
      (!!taker && taker === uname) || (!!verified && (verified === uname || ev.verified_by_user === uid))
    )
  );

  async function onConfirm() {
    try {
      // Optimistic update for immediate UI feedback
      const optimistic = {
        ...ev,
        egg_taker_verified: true,
        taker_name: user?.username || ev.taker_name,
        verified_by_user: user?.username || ev.verified_by_user,
        verification_timestamp: new Date().toISOString(),
      } as EggHistoryEvent;
      onUpdated(optimistic);

      const upd = await confirmTaker(ev.event_id);
      onUpdated(upd); // sync with server response
      const successDesc = deltaVal > 0 ? 'Registramos que você botou ovos.' : 'Você foi marcado como quem pegou os ovos.';
      toast({ title: 'Confirmado', description: successDesc });
    } catch (e: any) {
      // Revert optimistic update
      onUpdated(ev);
      toast({ title: 'Falha ao confirmar', description: e?.message || 'Tente novamente', variant: 'destructive' });
    }
  }

  async function onMistake() {
    try {
      const upd = await markMistake(ev.event_id);
      onUpdated(upd);
      toast({ title: 'Marcado como engano', description: 'Sinalizamos este evento como engano.' });
    } catch (e: any) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail;
      let description = e?.message || 'Tente novamente';
      if (status === 403 || detail === 'not_event_taker') {
        description = 'Você não pode desfazer: apenas quem confirmou pode marcar engano.';
      } else if (status === 409 || detail === 'not_verified') {
        description = 'Este evento não está confirmado, não há como marcar engano.';
      } else if (status === 404 || detail === 'event_not_found') {
        description = 'Evento não encontrado. Atualize o histórico e tente novamente.';
      }
      toast({ title: 'Falha ao marcar engano', description, variant: 'destructive' });
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <DeltaBadgeComp before={before} after={after} />
          <Badge variant={ev.egg_taker_verified ? 'default' : 'secondary'}>
            {ev.egg_taker_verified ? 'Confirmado' : 'Aguardando confirmação'}
          </Badge>
        </CardTitle>
        <DetailsDialog ev={ev} />
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-sm font-medium mb-1">Antes ({before})</div>
          {ev.before?.image_url ? (
            <ImageViewer src={ev.before.image_url} alt="Antes" />
          ) : (
            <div className="h-32 bg-muted rounded-md grid place-items-center text-xs">Sem imagem</div>
          )}
        </div>
        <div>
          <div className="text-sm font-medium mb-1">Depois ({after})</div>
          {ev.after?.image_url ? (
            <ImageViewer src={ev.after.image_url} alt="Depois" />
          ) : (
            <div className="h-32 bg-muted rounded-md grid place-items-center text-xs">Sem imagem</div>
          )}
        </div>
        <div className="col-span-2 flex gap-2 items-center">
          {!ev.egg_taker_verified && (
            <Button size="sm" onClick={onConfirm}>
              {deltaVal > 0 ? 'Eu botei 🐔' : 'Eu peguei'}
            </Button>
          )}
          {canMarkMistake && (
            <Button size="sm" variant="destructive" onClick={onMistake}>
              Marquei por engano
            </Button>
          )}
          {ev.egg_taker_verified && (
            <div className="text-xs text-muted-foreground">
              Por: {ev.taker_name || ev.verified_by_user || '—'}
            </div>
          )}
          <div className="ml-auto text-xs text-muted-foreground">{whenFmt}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailsDialog({ ev }: { ev: EggHistoryEvent }) {
  const beforeWhen = ev.before?.timestamp ? format(new Date(ev.before.timestamp), 'dd-MM-yyyy HH:mm') : '—';
  const afterWhen = ev.after?.timestamp ? format(new Date(ev.after.timestamp), 'dd-MM-yyyy HH:mm') : '—';
  const verifyWhen = ev.verification_timestamp ? format(new Date(ev.verification_timestamp), 'dd-MM-yyyy HH:mm') : '—';
  const [open, setOpen] = useState(false);
  const [takerHistory, setTakerHistory] = useState<EggTakerAction[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!open) return;
      setLoading(true);
      setError(null);
      try {
        const data = await getTakerHistory(ev.event_id);
        setTakerHistory(data);
      } catch (e: any) {
        setError(e?.message || 'Falha ao carregar histórico do taker');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, ev.event_id]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Mais info">
          <Info className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Detalhes do evento</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <div>Caixa: #{ev.box_id}</div>
          <div>
            Antes: {ev.before?.count} • {beforeWhen}
          </div>
          <div>
            Depois: {ev.after?.count} • {afterWhen}
          </div>
          <div>Delta: {ev.delta}</div>
          <div>Atraso confirmação: {ev.confirmed_delay_seconds}s</div>
          <div>Taker: {ev.taker_name || '—'}</div>
          <div>Pagador: {ev.box?.payer_name || '—'}</div>
          <div>PIX: {ev.box?.payer_pix || '—'}</div>
          <div>Verificado: {ev.egg_taker_verified ? 'Sim' : 'Não'}</div>
          <div>Confirmado por: {ev.verified_by_user || '—'}</div>
          <div>Quando: {verifyWhen}</div>
          <div>Erro marcado: {ev.mistake_flag ? 'Sim' : 'Não'}</div>
        </div>

        <div className="mt-4">
          <div className="text-sm font-medium mb-2">Histórico do taker</div>
          {loading && <div className="text-xs text-muted-foreground">Carregando…</div>}
          {error && <div className="text-xs text-red-600">{error}</div>}
          {!loading && !error && (
            <div className="space-y-1 text-xs">
              {(takerHistory && takerHistory.length > 0) ? (
                takerHistory.map((h, i) => {
                  const ts = h.timestamp ? format(new Date(h.timestamp), 'dd-MM-yyyy HH:mm') : '—';
                  const label = h.action === 'confirm' ? 'confirmou' : 'marcou engano';
                  return (
                    <div key={`${h.event_id}-${i}`} className="flex items-center gap-2">
                      <span className="text-muted-foreground">{ts}</span>
                      <span>•</span>
                      <span><strong>{h.by}</strong> {label}</span>
                    </div>
                  );
                })
              ) : (
                <div className="text-muted-foreground">Sem histórico.</div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default History;
