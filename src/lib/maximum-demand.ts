import type { HistoryBlock, MaximumDemandData, TariffType } from "./types";
import { TARIFF_RATES } from "./types";

/**
 * Calculate Maximum Demand Charge based on monthly highest 30-min block during peak hours (2pm-10pm)
 */
export function calculateMaximumDemand(
  historyBlocks: HistoryBlock[],
  tariffType: TariffType
): MaximumDemandData {
  console.log('🔍 MD Calculation Debug:', {
    totalBlocks: historyBlocks.length,
    blocks: historyBlocks.map(b => ({
      time: b.block_start_local,
      kwh: b.accumulated_kwh,
      parsed: new Date(b.block_start_local),
      hour: new Date(b.block_start_local).getHours()
    }))
  });

  // Filter blocks that fall within peak hours (2pm-10pm)
  const peakHourBlocks = historyBlocks.filter(block => {
    const blockTime = new Date(block.block_start_local);
    const hour = blockTime.getHours();
    const isPeakHour = hour >= 14 && hour < 22; // 2pm (14:00) to 10pm (22:00)
    
    console.log('⏰ Block time check:', {
      time: block.block_start_local,
      parsed: blockTime,
      hour,
      isPeakHour,
      kwh: block.accumulated_kwh
    });
    
    return isPeakHour;
  });

  console.log('🎯 Peak hour blocks found:', peakHourBlocks.length);

  // Find the highest accumulated_kwh during peak hours
  // Convert kWh to kW (30-min block, so multiply by 2 to get hourly rate)
  const monthlyHighestKw = peakHourBlocks.length > 0 
    ? Math.max(...peakHourBlocks.map(block => {
        const kw = block.accumulated_kwh * 2;
        console.log('⚡ kWh to kW conversion:', { kwh: block.accumulated_kwh, kw });
        return kw;
      }))
    : 0;

  const tariffRate = TARIFF_RATES[tariffType];
  const totalDemandCharge = monthlyHighestKw * tariffRate;

  console.log('💰 Final calculation:', {
    monthlyHighestKw,
    tariffRate,
    totalDemandCharge,
    peakBlockCount: peakHourBlocks.length
  });

  return {
    monthlyHighestKw,
    tariffRate,
    totalDemandCharge,
    peakHourBlocks
  };
}

/**
 * Format currency in Malaysian Ringgit
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Format power in kW with appropriate precision
 */
export function formatPower(kw: number): string {
  return `${kw.toFixed(2)} kW`;
}