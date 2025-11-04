# TNB Bill Database Integration

## Overview

The app now includes integration with the TNB (Tenaga Nasional Berhad) bill database API, allowing users to search for electricity tariff data based on monthly bill amounts.

## Features

### TNB Bill Search
- **Location**: Test Features page (`/test-features`)
- **Functionality**: Search TNB tariff data by monthly bill amount (RM)
- **Search Logic**: Finds closest match where `bill_total_normal ≤ input amount`
- **Demo Mode**: Fallback to sample data when live API is unavailable

### API Integration

#### Live API
- **Base URL**: `https://eternalgy-erp-retry3-production.up.railway.app`
- **Endpoint**: `/api/calculate-bill?amount={amount}`
- **Method**: GET
- **Response**: Tariff record with usage, EEI, network costs, and capacity data

#### Demo Mode
- **Purpose**: Provides sample data when live API is unavailable
- **Data**: Mock tariff records for amounts: 50, 100, 150, 200, 300 RM
- **Behavior**: Same search logic as live API but with predefined data

## Implementation Details

### Files Modified
- `src/lib/api.ts` - Added TNB API functions
- `src/lib/types.ts` - Added TNB-related TypeScript types
- `src/lib/hooks.ts` - Added `useTnbBillSearch` hook
- `src/app/test-features/page.tsx` - Added TNB search UI
- `src/app/layout.tsx` - Updated deployment validator

### Key Functions
- `calculateTnbBill(amount)` - Live API call
- `calculateTnbBillMock(amount)` - Demo data generator
- `useTnbBillSearch()` - React hook for search functionality

### Error Handling
- Graceful fallback when API endpoints are unavailable (404 errors)
- User-friendly error messages suggesting demo mode
- Input validation for bill amounts

## Usage

1. Navigate to `/test-features`
2. Scroll to "TNB Bill Database Search" section
3. Enter a monthly bill amount in RM
4. Toggle "Demo Mode" if live API is unavailable
5. Click "Search TNB Bill Data" to find matching tariff

## Data Structure

### TNB Tariff Record
```typescript
{
  id: number;
  bubble_id: string;
  usage_kwh: number;        // Monthly usage in kWh
  eei: number;              // Energy Efficiency Index
  network: number;          // Network charges (RM)
  bill_total_normal: number; // Total bill amount (RM)
  capacity: number;         // Capacity in kW
  // ... other fields
}
```

### Search Result
```typescript
{
  tariff: TnbTariffRecord;
  inputAmount: number;
  message: string;
}
```

## Future Enhancements

1. **Integration with Simulator**: Use TNB data to set realistic targets
2. **Bill Analysis**: Compare simulator usage with TNB tariff brackets
3. **Cost Calculations**: Estimate monthly costs based on usage patterns
4. **Historical Comparison**: Track savings vs TNB rates

## Testing

- **Live API**: Test with real TNB database (when available)
- **Demo Mode**: Always available for testing UI and functionality
- **Error Scenarios**: Handles network failures and API unavailability
- **Input Validation**: Prevents invalid amounts and provides feedback

The integration provides a foundation for more advanced energy cost analysis and helps users understand their electricity consumption in the context of TNB's tariff structure.