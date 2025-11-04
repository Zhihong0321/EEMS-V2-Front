"use client";

import { useToast } from "@/components/ui/toast-provider";
import { Fragment, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { Dialog, Transition } from "@headlessui/react";
import { useSimulators } from "@/lib/hooks";
import type { Simulator, ApiErrorPayload } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, InputWrapper } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DocumentTextIcon } from "@heroicons/react/24/outline";

const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE_LABEL ?? "Asia/Kuala_Lumpur";

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIMEZONE
});

type SimulatorsPageProps = {
  initialSimulators: Simulator[];
};

type FormState = {
  name: string;
  target: number;
  whatsapp: string;
};

export function SimulatorsPage({ initialSimulators }: SimulatorsPageProps) {
  const { push } = useToast();
  const { simulators, loading, refresh, create, delete: deleteSimulator } = useSimulators(initialSimulators);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ name: "", target: 500, whatsapp: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const hasSimulators = simulators.length > 0;

  const lastUpdatedLabel = useMemo(() => {
    if (!hasSimulators) return "—";
    const latest = simulators
      .map((sim) => sim.latest_block?.block_start_local ?? sim.updated_at ?? sim.created_at)
      .filter(Boolean)
      .sort()
      .pop();
    return latest ? timeFormatter.format(new Date(latest)) : "—";
  }, [hasSimulators, simulators]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setFormError("Name is required");
      return;
    }
    if (form.target <= 0) {
      setFormError("Target kWh must be greater than zero");
      return;
    }
    const trimmedWhatsApp = form.whatsapp.trim();
    const whatsappNumber =
      trimmedWhatsApp.length > 0 ? Number.parseInt(trimmedWhatsApp, 10) : undefined;

    if (trimmedWhatsApp.length > 0 && Number.isNaN(whatsappNumber)) {
      setFormError("WhatsApp number must contain digits only");
      return;
    }

    setFormError(null);
    setSubmitting(true);
    try {
      await create({
        name: form.name.trim(),
        target_kwh: form.target,
        ...(whatsappNumber !== undefined ? { whatsapp_number: whatsappNumber } : {})
      });
      setForm({ name: "", target: 500, whatsapp: "" });
      setIsDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create simulator";
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      // Use the hook's delete function which handles errors and toasts
      await deleteSimulator(id);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <section className="space-y-10 animate-fadeIn">
        <header className="space-y-3">
        <h1>Simulators</h1>
        <p className="max-w-2xl text-sm sm:text-base text-slate-400">
          Connect to an existing simulator profile or create a new one. Each profile produces live readings feeding the EMS dashboard.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsDialogOpen(true)}
          >
            New simulator
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => void refresh()}
            isLoading={loading}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh list"}
          </Button>
          <span className="text-xs text-slate-500">Last activity snapshot: {lastUpdatedLabel}</span>
        </div>
      </header>

      {hasSimulators ? (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 animate-slideUp">
          {simulators.map((sim) => {
            const latestBlock = sim.latest_block;
            const lastWindow = latestBlock?.block_start_local ?? sim.updated_at ?? sim.created_at;
            const lastActivity = lastWindow ? timeFormatter.format(new Date(lastWindow)) : "—";
            const percent = latestBlock?.percent_of_target;
            const percentLabel = percent != null ? `${percent.toFixed(1)}%` : "—";
            const badgeVariant = percent != null 
              ? (percent > 100 ? "danger" : percent >= 80 ? "warning" : "success") 
              : "neutral";
            return (
              <Card key={sim.id} variant="default">
                <CardContent className="flex flex-col justify-between min-h-[200px]">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="text-lg sm:text-xl font-semibold text-white">{sim.name}</h2>
                      <Badge variant={badgeVariant}>{percentLabel}</Badge>
                    </div>
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1">
                        <dt className="text-xs uppercase tracking-widest text-slate-500">Target kWh</dt>
                        <dd className="text-base font-medium text-slate-100">{sim.target_kwh.toFixed(1)}</dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="text-xs uppercase tracking-widest text-slate-500">Last activity</dt>
                        <dd className="text-base font-medium text-slate-100">{lastActivity}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="mt-6 flex flex-col sm:flex-row gap-2">
                    <Link href={`/${sim.id}`} className="flex-1">
                      <Button variant="primary" size="md" className="w-full">
                        Open Dashboard
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="md"
                      onClick={() => {
                        setDeletingId(sim.id);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="text-danger hover:text-danger hover:bg-danger/10"
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<DocumentTextIcon className="h-12 w-12" />}
          title="No simulators yet"
          description="Create your first simulator to start sending readings to the EMS backend."
          action={
            <Button variant="primary" size="md" onClick={() => setIsDialogOpen(true)}>
              Create simulator
            </Button>
          }
        />
      )}

      <CreateSimulatorDialog
        open={isDialogOpen}
        onClose={() => {
          if (!submitting) {
            setIsDialogOpen(false);
            setFormError(null);
          }
        }}
        form={form}
        onFormChange={setForm}
        onSubmit={handleSubmit}
        submitting={submitting}
        error={formError}
      />
      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteDialogOpen(false);
          }
        }}
        onConfirm={() => deletingId && handleDelete(deletingId)}
        deleting={isDeleting}
      />
      </section>
  );
}

type CreateSimulatorDialogProps = {
  open: boolean;
  onClose: () => void;
  form: FormState;
  onFormChange: (state: FormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
  error: string | null;
};

function CreateSimulatorDialog({ open, onClose, form, onFormChange, onSubmit, submitting, error }: CreateSimulatorDialogProps) {
  const updateField = (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => {
    if (field === "target") {
      onFormChange({ ...form, target: Number(event.target.value) });
      return;
    }
    if (field === "whatsapp") {
      const digitsOnly = event.target.value.replace(/[^0-9]/g, "");
      onFormChange({ ...form, whatsapp: digitsOnly });
      return;
    }
    onFormChange({ ...form, name: event.target.value });
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/95 backdrop-blur-xl p-6 text-left align-middle shadow-2xl ring-1 ring-white/5 transition-all">
                <Dialog.Title className="text-xl font-semibold text-white tracking-tight">Create simulator</Dialog.Title>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Provide a friendly name, target kWh, and optional WhatsApp number for alerting. Enter digits only (no plus sign).
                </p>
                <form className="mt-6 space-y-4" onSubmit={onSubmit}>
                  <InputWrapper label="Name" required error={error && form.name.trim() === '' ? 'Name is required' : undefined}>
                    <Input
                      type="text"
                      required
                      value={form.name}
                      onChange={updateField("name")}
                      placeholder="Enter simulator name"
                      error={!!error && form.name.trim() === ''}
                    />
                  </InputWrapper>
                  
                  <InputWrapper label="Target kWh" required>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={form.target}
                      onChange={updateField("target")}
                      placeholder="e.g. 500"
                    />
                  </InputWrapper>
                  
                  <InputWrapper 
                    label="WhatsApp number" 
                    helperText="Digits only (no plus sign). Optional for alerts."
                  >
                    <Input
                      type="tel"
                      inputMode="numeric"
                      pattern="\d*"
                      value={form.whatsapp}
                      onChange={updateField("whatsapp")}
                      placeholder="e.g. 60123456789"
                    />
                  </InputWrapper>
                  
                  {error && !form.name.trim() === false && <p className="text-xs text-danger">{error}</p>}
                  
                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      onClick={onClose}
                      disabled={submitting}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      isLoading={submitting}
                      disabled={submitting}
                      className="w-full sm:w-auto"
                    >
                      {submitting ? "Creating…" : "Create"}
                    </Button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

type DeleteConfirmationDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
};

function DeleteConfirmationDialog({ open, onClose, onConfirm, deleting }: DeleteConfirmationDialogProps) {
  return (
    <Transition as={Fragment} show={open}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl border border-danger/20 bg-slate-900/95 backdrop-blur-xl p-6 text-left align-middle shadow-2xl ring-1 ring-danger/10 transition-all">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0 rounded-full bg-danger/10 p-3">
                    <svg className="h-6 w-6 text-danger" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <Dialog.Title className="text-xl font-semibold text-white tracking-tight">Confirm Deletion</Dialog.Title>
                    <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                      Are you sure you want to delete this simulator? This action cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={onClose}
                    disabled={deleting}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="md"
                    onClick={onConfirm}
                    isLoading={deleting}
                    disabled={deleting}
                    className="w-full sm:w-auto"
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
