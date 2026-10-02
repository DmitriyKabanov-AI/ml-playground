import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CloudSun, Flower2, ShoppingCart, TrendingUp } from 'lucide-react';
import { Card, DataTable, ErrorState, KpiCard, PageHeader, PageLoader } from '@/components/ui';
import { useIris, useRegressionData, useWalmart, useWeather } from '@/data/hooks';
import { analyzeClassification } from '@/ml/classification';
import { analyzeRegression } from '@/ml/regression';
import { walmartLeaderboard } from '@/ml/forecasting';
import { analyzeWeather, skillByHorizon, weatherLeaderboard } from '@/ml/forecasting';
import { fmtMoney, fmtPct } from '@/lib/format';
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

      <div className="mt-4 grid gap-4">
        <Card title="Лучшие модели">
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
      </div>
    </>
  );
}