"use client";
import { Card, CardTitle } from "@/components/ui/Card";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function ConfusionMatrix({ labels, matrix }: { labels: string[]; matrix: number[][] }) {
  const [hovered, setHovered] = useState<[number, number] | null>(null);
  
  if (!matrix.length) return null;
  
  // Находим максимальное значение для правильного градиента
  const max = Math.max(1, ...matrix.flat());
  
  // Считаем общее количество объектов в матрице
  const totalSamples = matrix.flat().reduce((a, b) => a + b, 0);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Confusion Matrix</CardTitle>
        <span className="text-xs text-slate-500">Всего: {totalSamples}</span>
      </div>
      
      <div className="mt-4 overflow-x-auto scrollbar-thin">
        <div 
          className="inline-grid gap-1" 
          style={{ gridTemplateColumns: `110px repeat(${labels.length}, minmax(46px, 1fr))` }}
        >
          {/* Пустой угол */}
          <div />
          
          {/* Заголовки столбцов (предсказанные) */}
          {labels.map((l) => (
            <div key={l} className="text-[11px] text-slate-500 text-center truncate px-1">
              {l}
            </div>
          ))}

          {/* Строки матрицы (истинные) */}
          {matrix.map((row, i) => (
            <div key={`row-${i}`} className="contents">
              <div className="text-[11px] text-slate-500 flex items-center truncate pr-2">
                {labels[i]}
              </div>
              {row.map((val, j) => {
                const intensity = val / max;
                const isDiag = i === j;
                
                return (
                  <motion.div 
                    key={`${i}-${j}`} 
                    whileHover={{ scale: 1.08 }}
                    onMouseEnter={() => setHovered([i, j])} 
                    onMouseLeave={() => setHovered(null)}
                    className={cn(
                      "aspect-square rounded-lg flex items-center justify-center text-xs font-semibold",
                      isDiag ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
                    )}
                    style={{ 
                      backgroundColor: isDiag
                        ? `rgba(16, 185, 129, ${0.1 + intensity * 0.7})`
                        : val > 0 
                          ? `rgba(244, 63, 94, ${0.08 + intensity * 0.6})` 
                          : "rgba(148, 163, 184, 0.06)" 
                    }}
                  >
                    {val}
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Подпись при наведении */}
      {hovered && (
        <p className="text-xs text-slate-500 mt-3">
          Истинный: <b>{labels[hovered[0]]}</b> → Предсказан: <b>{labels[hovered[1]]}</b> ({(matrix[hovered[0]][hovered[1]] / totalSamples * 100).toFixed(1)}%)
        </p>
      )}
    </Card>
  );
}