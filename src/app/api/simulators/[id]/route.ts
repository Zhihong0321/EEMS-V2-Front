import { NextResponse } from "next/server";

// Dummy function to simulate deleting a simulator
async function deleteSimulator(id: string): Promise<void> {
  // In a real application, you would interact with a database or other service
  // to delete the simulator with the given ID.
  console.log(`Simulator ${id} deleted`);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    await deleteSimulator(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return new NextResponse(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}