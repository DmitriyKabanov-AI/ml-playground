import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CloudSun, Flower2, Lightbulb, ShoppingCart, TrendingUp } from 'lucide-react';
import { Card, DataTable, ErrorState, KpiCard, PageHeader, PageLoader } from '@/components/ui';
import { useIris, useRegressionData, useWalmart, useWeather } from '@/data/hooks';
import { analyzeClassification } from '@/ml/classification';
import { analyzeRegression } from '@/ml/regression';
import { seasonality, walmartLeaderboard } from '@/ml/forecasting';
import { analyzeWeather, skillByHorizon, weatherLeaderboard } from '@/ml/forecasting';
import { fmtMoney, fmtPct } from '@/lib/format';
import { mean } from '@/lib/stats';
import { useChartTheme } from '@/components/charts/theme';

export default function OverviewPage() {
  const qs = [useIris(), useRegressionData(), useWalmart(), useWeather()] as const;
  const err = qs.find((q) => q.isError);
  if (err) return <ErrorState error={err.error} />;
  if (qs.some((q) => q.isPending)) return <PageLoader />;
  return <View iris={qs[0].data!} reg={qs[1].data!} wal={qs[2].data!} wea={qs[3].data!} />;
}

type Props = {
  iris: NonNullable<ReturnType<typeof useIris>['data']>;
  reg: NonNullable<ReturnType<typeof useRegressionData>['data']>;
  wal: NonNullable<ReturnType<typeof useWalmart>['data']>;
  wea: NonNullable<ReturnType<typeof useWeather>['data']>;
};

function View({ iris, reg, wal, wea }: Props) {
  const t = useChartTheme();
  const cls = useMemo(() => analyzeClassification(iris), [iris]);
  const rg = useMemo(() => analyzeRegression(reg), [reg]);
  const board = useMemo(() => walmartLeaderboard(wal.stores, 13), [wal]);
  const wan = useMemo(() => analyzeWeather(wea), [wea]);
  const wboard = useMemo(() => weatherLeaderboard(wan), [wan]);

  const bestCls = [...cls.results].sort((a, b) => b.accuracy - a.accuracy)[0];
  const bestReg = [...rg.results].sort((a, b) => b.r2 - a.r2)[0];
  const bestWal = board[0];
  const bestWea = wboard[0];
  const bestWeaSkill = skillByHorizon(wan, bestWea.id);

  const insights = useMemo(() => {
    const out: string[] = [];
    // классификация: самая частая путаница
    let worst = { i: 0, j: 0, v: 0 };
    bestCls.cm.forEach((row, i) => row.forEach((v, j) => { if (i !== j && v > worst.v) worst = { i, j, v }; }));
    out.push(
      worst.v
        ? `Классификация: ${bestCls.name} даёт ${fmtPct(bestCls.accuracy)} accuracy. Чаще всего путаются «${iris.classNames[worst.i]}» и «${iris.classNames[worst.j]}» (${worst.v} ош.), а setosa отделяется практически идеально.`
        : `Классификация: ${bestCls.name} без единой ошибки на тесте (${fmtPct(bestCls.accuracy)}). Проверьте CV: ${fmtPct(bestCls.cvMean)}.`,
    );
    // регрессия
    const lin = rg.results.find((r) => r.id === 'linear')!;
    const top = [...bestReg.importance].sort((a, b) => b.value - a.value)[0];
    out.push(`Регрессия: ${bestReg.name} объясняет ${fmtPct(bestReg.r2)} дисперсии (R²=${bestReg.r2.toFixed(3)}), что на ${(bestReg.r2 - lin.r2).toFixed(3)} выше линейной модели. Главный признак — ${top.feature}.`);
    // walmart
    const th = mean(wal.stores.map((s) => seasonality(s).holidays.find((h) => h.name === 'Thanksgiving')!.uplift));
    out.push(`Walmart: лучшая модель — ${bestWal.name} (WMAE ${fmtMoney(bestWal.wmae)}, MAPE ${bestWal.mape.toFixed(1)}%). День благодарения поднимает недельные продажи в среднем на ${th.toFixed(0)}%, поэтому праздничные недели важно взвешивать в метрике.`);
    // погода
    const tempSkill7 = mean(Object.values(wan).map((c) => c.temp?.models.find((m) => m.id === 'ridge')?.skill[6] ?? 0));
    out.push(`Погода: ${bestWea.name} в среднем на ${(bestWea.skill * 100).toFixed(0)}% точнее persistence; по температуре на горизонте +7 дней выигрыш ≈ ${(tempSkill7 * 100).toFixed(0)}%. Осадки остаются самой трудной переменной.`);
    return out;
  }, [bestCls, bestReg, bestWal, bestWea, rg, iris, wal, wan]);

  const rows = [
    { task: 'Классификация (Iris)', model: bestCls.name, metric: 'Accuracy', value: fmtPct(bestCls.accuracy), n: cls.results.length },
    { task: 'Регрессия', model: bestReg.name, metric: 'R²', value: bestReg.r2.toFixed(3), n: rg.results.length },
    { task: 'Walmart (13 нед.)', model: bestWal.name, metric: 'WMAE', value: fmtMoney(bestWal.wmae), n: board.length },
    { task: 'Погода (7 дней)', model: bestWea.name, metric: 'Skill vs persistence', value: `${(bestWea.skill * 100).toFixed(0)}%`, n: wboard.length },
  ];

  return (
    <>
      <PageHeader title="Обзор" subtitle="Сводка по четырём ML-задачам: все числа вычислены из текущих данных." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/classification"><KpiCard label="Классификация · accuracy" value={fmtPct(bestCls.accuracy)} hint={bestCls.name} icon={Flower2} spark={cls.results.map((r) => r.accuracy)} color={t.series[0]} /></Link>
        <Link to="/regression"><KpiCard label="Регрессия · R²" value={bestReg.r2.toFixed(3)} hint={bestReg.name} icon={TrendingUp} spark={rg.results.map((r) => r.r2)} color={t.series[1]} /></Link>
        <Link to="/walmart"><KpiCard label="Walmart · WMAE" value={fmtMoney(bestWal.wmae)} hint={bestWal.name} icon={ShoppingCart} spark={[...board].reverse().map((b) => b.wmae)} color={t.series[2]} /></Link>
        <Link to="/weather"><KpiCard label="Погода · skill" value={`${(bestWea.skill * 100).toFixed(0)}%`} hint={bestWea.name} icon={CloudSun} spark={bestWeaSkill} color={t.series[3]} /></Link>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Лучшие модели">
          <DataTable
            rows={rows}
            rowKey={(r) => r.task}
            columns={[
              { key: 't', header: 'Задача', render: (r) => <span className="font-medium">{r.task}</span> },
              { key: 'm', header: 'Лучшая модель', render: (r) => r.model },
              { key: 'k', header: 'Метрика', render: (r) => <span className="text-muted">{r.metric}</span> },
              { key: 'v', header: 'Значение', align: 'right', render: (r) => <b>{r.value}</b> },
              { key: 'n', header: 'Моделей', align: 'right', render: (r) => r.n },
            ]}
          />
        </Card>

        <Card title="Автоматические выводы" actions={<Lightbulb size={16} className="text-amber-400" />}>
          <ul className="space-y-3 text-sm leading-relaxed">
            {insights.map((s, i) => (
              <li key={i} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{s}</li>
            ))}
          </ul>
        </Card>

        <Card className="xl:col-span-3" title="Подключение своих данных" subtitle="Без URL работают демо-данные. Укажите VITE_API_URL — дашборд сам запросит четыре эндпоинта.">
          <div className="grid gap-4 lg:grid-cols-2">
            <pre className="overflow-x-auto rounded-xl bg-surface p-4 text-xs leading-relaxed"><code>{`# .env
VITE_API_URL=https://api.example.com/ml

GET /iris        -> { featureNames, classNames, X: number[][], y: number[] }
GET /regression  -> { featureNames, target, X: number[][], y: number[] }
GET /walmart     -> { stores: [{ id, name, rows: [{ date, sales, holiday }] }] }
GET /weather     -> { variables: [{ key, label, unit, decimals }],
                      cities: [{ name, startDate, series: { temp: [...], ... } }] }`}</code></pre>
            <ul className="space-y-2 text-sm text-muted">
              <li>• Типы контрактов — в <code className="text-fg">src/types.ts</code>, загрузчики — в <code className="text-fg">src/data/source.ts</code>.</li>
              <li>• Walmart: еженедельные данные, минимум 130 недель (для сезонности 52 недели и горизонта до 26).</li>
              <li>• Погода: ежедневные ряды, минимум 2 года; ключи переменных свободные.</li>
              <li>• Для CSV достаточно заменить функцию в <code className="text-fg">source.ts</code> на парсер и вернуть тот же тип.</li>
              <li>• Бэкенд должен отдавать CORS-заголовки для домена дашборда.</li>
            </ul>
          </div>
        </Card>
      </div>
    </>
  );
}