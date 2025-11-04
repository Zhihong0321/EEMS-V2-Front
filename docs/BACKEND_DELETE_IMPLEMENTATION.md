# Backend DELETE Endpoint Implementation Guide

## Problem
The frontend cannot delete simulators because the backend API does not have a DELETE endpoint.

## Current Status
- ❌ `DELETE /api/v1/simulators/{id}` returns **404 Not Found**
- ✅ `GET /api/v1/simulators` works (read)
- ✅ `POST /api/v1/simulators` works (create)

## What Needs to Be Added to Backend

### FastAPI Example (Python)
```python
@app.delete("/api/v1/simulators/{simulator_id}", status_code=204)
async def delete_simulator(simulator_id: str, db: Session = Depends(get_db)):
    """
    Delete a simulator and all associated data.
    """
    # Find simulator
    simulator = db.query(Simulator).filter(Simulator.id == simulator_id).first()
    
    if not simulator:
        raise HTTPException(status_code=404, detail="Simulator not found")
    
    # Delete associated readings (cascade)
    db.query(Reading).filter(Reading.simulator_id == simulator_id).delete()
    
    # Delete associated blocks (cascade)
    db.query(Block).filter(Block.simulator_id == simulator_id).delete()
    
    # Delete simulator
    db.delete(simulator)
    db.commit()
    
    return Response(status_code=204)
```

### Express.js Example (Node.js)
```javascript
app.delete('/api/v1/simulators/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Delete associated readings
    await db.readings.deleteMany({ simulator_id: id });
    
    // Delete associated blocks
    await db.blocks.deleteMany({ simulator_id: id });
    
    // Delete simulator
    const result = await db.simulators.deleteOne({ _id: id });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Simulator not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Delete simulator error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Django Example (Python)
```python
@api_view(['DELETE'])
def delete_simulator(request, simulator_id):
    """Delete a simulator and all associated data."""
    try:
        simulator = Simulator.objects.get(id=simulator_id)
        
        # Django cascade will handle related deletions if configured
        # Otherwise manually delete:
        Reading.objects.filter(simulator_id=simulator_id).delete()
        Block.objects.filter(simulator_id=simulator_id).delete()
        
        simulator.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except Simulator.DoesNotExist:
        return Response(
            {'error': 'Simulator not found'},
            status=status.HTTP_404_NOT_FOUND
        )
```

## Testing the Implementation

### Using PowerShell
```powershell
# Test DELETE endpoint
$headers = @{ "x-api-key" = "01121000099" }
$simId = "YOUR_SIMULATOR_ID"

# Should return 204 No Content on success
Invoke-WebRequest -Uri "https://eems-v2-backend-production.up.railway.app/api/v1/simulators/$simId" `
  -Headers $headers `
  -Method DELETE `
  -UseBasicParsing

# Verify deletion - should return 404 or empty list
Invoke-RestMethod -Uri "https://eems-v2-backend-production.up.railway.app/api/v1/simulators/$simId" `
  -Headers $headers `
  -Method GET
```

### Using curl
```bash
# Test DELETE endpoint
curl -X DELETE \
  "https://eems-v2-backend-production.up.railway.app/api/v1/simulators/YOUR_SIMULATOR_ID" \
  -H "x-api-key: 01121000099" \
  -v

# Should return: HTTP 204 No Content
```

## Important Considerations

### 1. Cascade Deletion
Ensure related data is deleted:
- **Readings** associated with the simulator
- **Blocks** associated with the simulator
- Any **SSE connections** for that simulator

### 2. Response Codes
- **204 No Content**: Successful deletion (no response body)
- **404 Not Found**: Simulator doesn't exist
- **401 Unauthorized**: Invalid or missing API key
- **500 Internal Server Error**: Database or server error

### 3. Database Constraints
If using SQL with foreign keys, ensure:
- `ON DELETE CASCADE` is set for readings and blocks
- OR manually delete related records first

### 4. Authorization
Consider adding ownership checks:
```python
# Only allow deletion if user owns the simulator
if simulator.user_id != current_user.id:
    raise HTTPException(status_code=403, detail="Forbidden")
```

## After Implementation

Once the backend DELETE endpoint is working:

1. **Uncomment the delete button** in `src/components/simulators/simulators-page.tsx`:
   ```typescript
   // Remove the comment markers from lines 169-180
   ```

2. **Test the full flow**:
   - Create a test simulator
   - Delete it from the UI
   - Refresh the page
   - Verify it's gone

3. **Update API documentation** in `docs/API.md`:
   ```markdown
   ### DELETE /api/v1/simulators/{id}
   - Description: Delete a simulator and all associated data
   - Headers: `x-api-key` required
   - Response: 204 No Content on success
   - PowerShell example...
   ```

## Questions?
Contact the backend team or check the backend repository for implementation details.



