"use client";

import { useMemo } from "react";
import type { HistoryBlock, TariffType } from "@/lib/types";
import { calculateMaximumDemand, formatCurrency, formatPower } from "@/lib/maximum-demand";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BoltIcon } from "@heroicons/react/24/outline";

type MaximumDemandPanelProps = {
  historyBlocks: HistoryBlock[];
  tariffType: TariffType;
  plantName: string;
};

export function MaximumDemandPanel({ historyBlocks, tariffType, plantName }: MaximumDemandPanelProps) {
  const demandData = useMemo(() => 
    calculateMaximumDemand(historyBlocks, tariffType), 
    [historyBlocks, tariffType]
  );

  const { monthlyHighestKw, tariffRate, totalDemandCharge, peakHourBlocks } = demandData;

  return (
    <Card variant="default" className="border-primary/20">
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 rounded-lg bg-primary/10 p-2">
            <BoltIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Maximum Demand Charge</h3>
            <p className="text-sm text-slate-400">{plantName} • {tariffType}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <dt className="text-xs uppercase tracking-widest text-slate-500">Peak Demand</dt>
            <dd className="text-xl font-bold text-primary">{formatPower(monthlyHighestKw)}</dd>
            <p className="text-xs text-slate-400">Highest 30-min block (2pm-10pm)</p>
          </div>
          
          <div className="space-y-1">
            <dt className="text-xs uppercase tracking-widest text-slate-500">Tariff Rate</dt>
            <dd className="text-xl font-bold text-slate-100">{formatCurrency(tariffRate)}/kW</dd>
            <p className="text-xs text-slate-400">{tariffType} voltage</p>
          </div>
          
          <div className="space-y-1">
            <dt className="text-xs uppercase tracking-widest text-slate-500">Total Charge</dt>
            <dd className="text-xl font-bold text-warning">{formatCurrency(totalDemandCharge)}</dd>
            <p className="text-xs text-slate-400">Monthly demand charge</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-700">
          <div className="flex items-center gap-2">
            <Badge variant="neutral" className="text-xs">
              {peakHourBlocks.length} peak hour blocks
            </Badge>
            <span className="text-xs text-slate-500">
              Based on last {historyBlocks.length} blocks
            </span>
          </div>
          {monthlyHighestKw > 0 && (
            <p className="text-xs text-slate-400">
              Calculation: {formatPower(monthlyHighestKw)} × {formatCurrency(tariffRate)}/kW
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}