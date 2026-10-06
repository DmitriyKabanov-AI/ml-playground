import { Card } from '../../components/ui/Card'
import { Empty } from '../../components/ui/Empty'
import { ConfusionMatrix } from '../../components/charts/ConfusionMatrix'
import { RocChart } from '../../components/charts/RocChart'
import { ImportanceBar } from '../../components/charts/ImportanceBar'
import { CvBar } from '../../components/charts/CvBar'
import { MetricBar } from '../../components/charts/MetricBar'
import type { ClassificationReport, TaskMetrics } from '../../types'

interface ClassificationViewProps {
  data: TaskMetrics
}

export default function ClassificationView({ data }: ClassificationViewProps) {
  const report = data.report as ClassificationReport | undefined
  if (!report) return <Empty />

  const accData = report.models.map((m) => ({ name: m.name, value: m.acc }))
  const f1Data = report.models.map((m) => ({ name: m.name, value: m.f1 }))

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card title="Матрица ошибок" subtitle="Confusion matrix (активная модель)">
        {report.confusion?.length ? <ConfusionMatrix classes={report.classes} matrix={report.confusion} /> : <Empty />}
      </Card>

      <Card title="ROC-кривые" subtitle="По классам, one-vs-rest">
        {report.roc?.length ? <RocChart curves={report.roc} /> : <Empty />}
      </Card>

      <Card title="Важность признаков">{report.importance?.length ? <ImportanceBar data={report.importance} /> : <Empty />}</Card>

      <Card title="Кросс-валидация" subtitle={`${report.cv?.length ?? 0}-fold accuracy`}>
        {report.cv?.length ? <CvBar values={report.cv} /> : <Empty />}
      </Card>

      <Card title="Accuracy по моделям">{accData.length ? <MetricBar data={accData} direction="up" valueLabel="accuracy" /> : <Empty />}</Card>

      <Card title="F1 (macro) по моделям">{f1Data.length ? <MetricBar data={f1Data} direction="up" valueLabel="f1" /> : <Empty />}</Card>
    </div>
  )
}