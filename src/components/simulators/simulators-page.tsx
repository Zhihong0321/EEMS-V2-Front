"use client";

import { useToast } from "@/components/ui/toast-provider";
import { Fragment, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { Dialog, Transition } from "@headlessui/react";
import { useSimulators } from "@/lib/hooks";
import type { Simulator, ApiErrorPayload } from "@/lib/types";
import clsx from "clsx";

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
    <section className="space-y-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-white">Simulators</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Connect to an existing simulator profile or create a new one. Each profile produces live readings feeding the EMS dashboard.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsDialogOpen(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-cyan-600"
          >
            New simulator
          </button>
          <button
            type="button"
            onClick={() => {
              void refresh();
            }}
            className="rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:text-white"
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh list"}
          </button>
          <span className="text-xs text-slate-500">Last activity snapshot: {lastUpdatedLabel}</span>
        </div>
      </header>

      {hasSimulators ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {simulators.map((sim) => {
            const latestBlock = sim.latest_block;
            const lastWindow = latestBlock?.block_start_local ?? sim.updated_at ?? sim.created_at;
            const lastActivity = lastWindow ? timeFormatter.format(new Date(lastWindow)) : "—";
            const percent = latestBlock?.percent_of_target;
            const percentLabel = percent != null ? `${percent.toFixed(1)}%` : "—";
            const percentVariant = percent != null ? (percent > 100 ? "text-danger" : percent >= 80 ? "text-warning" : "text-success") : "text-slate-400";
            return (
              <article key={sim.id} className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-6">
                <div className="space-y-3">
                  <h2 className="text-xl font-semibold text-white">{sim.name}</h2>
                  <dl className="grid grid-cols-2 gap-2 text-sm text-slate-400">
                    <div>
                      <dt className="text-xs uppercase tracking-widest text-slate-500">Target kWh</dt>
                      <dd className="text-base text-slate-100">{sim.target_kwh.toFixed(1)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-widest text-slate-500">Last activity</dt>
                      <dd className="text-base text-slate-100">{lastActivity}</dd>
                    </div>
                  </dl>
                  <p className="text-xs text-slate-500">
                    Latest block progress: <span className={percentVariant}>{percentLabel}</span>
                  </p>
                </div>
                <div className="mt-6 flex gap-3">
                  <Link
                    href={`/${sim.id}`}
                    className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-primary hover:text-white"
                  >
                    Open dashboard
                  </Link>
                  <Link
                    href={`/${sim.id}/run`}
                    className="inline-flex flex-1 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-cyan-600"
                  >
                    Run simulator
                  </Link>
                  {/* Delete button hidden: Backend DELETE endpoint not implemented yet */}
                  {/* TODO: Uncomment when backend adds DELETE /api/v1/simulators/{id} */}
                  {/* <button
                    type="button"
                    onClick={() => {
                      setDeletingId(sim.id);
                      setIsDeleteDialogOpen(true);
                    }}
                    className="inline-flex items-center justify-center rounded-md border border-transparent px-4 py-2 text-sm font-semibold text-danger transition hover:bg-danger/10"
                  >
                    Delete
                  </button> */}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center">
          <p className="text-lg font-semibold text-white">No simulators yet</p>
          <p className="text-sm text-slate-400">Create your first simulator to start sending readings to the EMS backend.</p>
          <button
            type="button"
            onClick={() => setIsDialogOpen(true)}
            className="rounded-md bg-primary px-4 py_2 text-sm font-semibold text-primary-foreground transition hover:bg-cyan-600"
          >
            Create simulator
          </button>
        </div>
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title className="text-lg font-semibold text-white">Create simulator</Dialog.Title>
                <p className="mt-1 text-sm text-slate-400">
                  Provide a friendly name, target kWh, and optional WhatsApp number for alerting. Enter digits only (no plus sign).
                </p>
                <form className="mt-6 space-y-4" onSubmit={onSubmit}>
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Name</span>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={updateField("name")}
                      className="w-full rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Target kWh</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={form.target}
                      onChange={updateField("target")}
                      className="w-full rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-500">WhatsApp number (digits only, optional)</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="\d*"
                      value={form.whatsapp}
                      onChange={updateField("whatsapp")}
                      className="w-full rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </label>
                  {error ? <p className="text-xs text-danger">{error}</p> : null}
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className={clsx(
                        "rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition",
                        submitting ? "opacity-60" : "hover:bg-cyan-600"
                      )}
                    >
                      {submitting ? "Creating…" : "Create"}
                    </button>
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title className="text-lg font-semibold text-white">Confirm Deletion</Dialog.Title>
                <p className="mt-2 text-sm text-slate-400">
                  Are you sure you want to delete this simulator? This action cannot be undone.
                </p>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onConfirm}
                    disabled={deleting}
                    className={clsx(
                      "rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white transition",
                      deleting ? "opacity-60" : "hover:bg-danger/80"
                    )}
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
