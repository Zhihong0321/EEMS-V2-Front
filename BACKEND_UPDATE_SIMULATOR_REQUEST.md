# Backend API Request: Update Simulator Endpoint

## Summary
The frontend now supports editing existing simulators to update plant name, tariff type, and other fields. We need a backend API endpoint to handle simulator updates.

## Required API Endpoint

### **PUT /api/v1/simulators/{id}**

**Method:** `PUT`  
**Path:** `/api/v1/simulators/{id}`  
**Content-Type:** `application/json`

### Request Body Schema
```json
{
  "name": "string (optional)",
  "plant_name": "string (optional)", 
  "tariff_type": "string (optional, enum: 'Medium' | 'Medium ToU' | 'High')",
  "target_kwh": "number (optional)",
  "whatsapp_number": "number (optional, nullable)"
}
```

### Response Schema
```json
{
  "id": "string (UUID)",
  "name": "string",
  "plant_name": "string", 
  "tariff_type": "string",
  "target_kwh": "number",
  "whatsapp_number": "number | null",
  "created_at": "string (ISO 8601)",
  "updated_at": "string (ISO 8601)"
}
```

## Database Schema Updates

### New Fields for `simulators` Table
```sql
ALTER TABLE simulators 
ADD COLUMN plant_name VARCHAR(255),
ADD COLUMN tariff_type VARCHAR(50) CHECK (tariff_type IN ('Medium', 'Medium ToU', 'High'));
```

### Migration Considerations
- Set default values for existing records:
  - `plant_name`: Can be NULL or default to simulator name
  - `tariff_type`: Default to 'Medium'

## Example API Usage

### Request
```bash
PUT /api/v1/simulators/a1e5ba0e-8c8f-48b4-bdbc-7d91a18f631c
Content-Type: application/json

{
  "name": "Factory A - Updated",
  "plant_name": "Main Production Plant",
  "tariff_type": "Medium ToU",
  "target_kwh": 600,
  "whatsapp_number": 60123456789
}
```

### Response
```json
{
  "id": "a1e5ba0e-8c8f-48b4-bdbc-7d91a18f631c",
  "name": "Factory A - Updated",
  "plant_name": "Main Production Plant",
  "tariff_type": "Medium ToU", 
  "target_kwh": 600,
  "whatsapp_number": 60123456789,
  "created_at": "2024-11-04T07:30:00Z",
  "updated_at": "2024-11-04T08:45:00Z"
}
```

## Error Handling

### 404 Not Found
```json
{
  "error": {
    "code": "SIMULATOR_NOT_FOUND",
    "message": "Simulator with ID {id} not found"
  }
}
```

### 400 Bad Request
```json
{
  "error": {
    "code": "VALIDATION_ERROR", 
    "message": "Invalid tariff_type. Must be one of: Medium, Medium ToU, High",
    "details": {
      "field": "tariff_type",
      "value": "InvalidType"
    }
  }
}
```

## Business Logic Requirements

### Validation Rules
1. **name**: Must be non-empty string if provided
2. **plant_name**: Must be non-empty string if provided  
3. **tariff_type**: Must be one of: "Medium", "Medium ToU", "High"
4. **target_kwh**: Must be positive number if provided
5. **whatsapp_number**: Must be valid integer or null

### Update Behavior
- **Partial Updates**: Only update fields that are provided in request body
- **Null Handling**: Allow setting whatsapp_number to null
- **Timestamps**: Update `updated_at` field automatically
- **Validation**: Validate all provided fields before updating

## Frontend Integration

The frontend is already implemented and will:
1. Send PUT requests to update simulators
2. Handle success/error responses appropriately  
3. Update UI immediately on successful update
4. Display proper error messages for validation failures

## Priority: High
This feature is needed for the Maximum Demand calculation functionality, which requires plant_name and tariff_type fields to be configurable.

## Testing Checklist
- [ ] Create new simulator with new fields
- [ ] Update existing simulator (partial update)
- [ ] Update all fields at once
- [ ] Validate enum constraints for tariff_type
- [ ] Handle non-existent simulator ID (404)
- [ ] Validate required field constraints
- [ ] Test null values for optional fields

## Current Error
Frontend is getting "405 Method Not Allowed" when calling:
```
PUT /api/v1/simulators/{id}
```

This indicates the endpoint doesn't exist yet and needs to be implemented.