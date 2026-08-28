import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { BUILTIN_PROVIDERS } from "../lib/aiProviders";
import { useStore } from "../lib/store";
import type { AiKey } from "../types";

const EMPTY = {
  provider: "",
  label: "",
  key: "",
  model: "",
  baseUrl: "",
};

export default function ApiKeys() {
  const { aiVault, upsertAiKey, removeAiKey, setActiveAiKey } = useStore();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const isCustom = form.provider === "custom" || form.provider === "additional";
  const selected = BUILTIN_PROVIDERS.find((p) => p.id === form.provider);
  const editing = Boolean(editingId);

  const reset = () => {
    setOpen(false);
    setEditingId(null);
    setForm(EMPTY);
    setError(null);
  };

  const onPick = (provider: string) => {
    const def = BUILTIN_PROVIDERS.find((p) => p.id === provider);
    setForm({
      provider,
      label: def?.label || (provider === "additional" ? "Additional" : provider === "custom" ? "Custom" : ""),
      key: "",
      model: def?.defaultModel || "",
      baseUrl: def?.defaultBaseUrl || "",
    });
    setError(null);
  };

  const startAdd = () => {
    setOpen(true);
    setEditingId(null);
    setForm(EMPTY);
    setError(null);
  };

  const startEdit = (entry: AiKey) => {
    setOpen(true);
    setEditingId(entry.id);
    setForm({
      provider: entry.provider,
      label: entry.label,
      key: "",
      model: entry.model || "",
      baseUrl: entry.baseUrl || "",
    });
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = () => {
    if (!form.provider) {
      setError("Select an AI model first.");
      return;
    }
    const existing = editingId ? aiVault.keys.find((k) => k.id === editingId) : null;
    const key = form.key.trim() || existing?.key || "";
    if (!key) {
      setError("Paste an API key before saving.");
      return;
    }
    if (isCustom && !form.label.trim()) {
      setError("Give this custom service a name.");
      return;
    }
    const def = BUILTIN_PROVIDERS.find((p) => p.id === form.provider);
    upsertAiKey({
      id: editingId || `key-${Date.now().toString(36)}`,
      provider: isCustom ? "custom" : form.provider,
      label: (isCustom ? form.label.trim() : def?.label || form.label).trim(),
      key,
      model: form.model.trim() || def?.defaultModel,
      baseUrl: form.baseUrl.trim() || def?.defaultBaseUrl,
    });
    reset();
  };

  const rows = useMemo(() => aiVault.keys, [aiVault.keys]);

  return (
    <div className="space-y-5">
      <div>
        <Link to="/settings" className="inline-flex items-center gap-1 text-sm font-semibold">
          <ArrowLeft size={16} /> Settings
        </Link>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight">API keys</h1>
        <p className="max-w-2xl text-sm" style={{ color: "var(--muted)" }}>
          Keys stay on this device and are sent only when you run Analyze This Stock. Analysis still works from public
          filings if no key is set.
        </p>
      </div>

      <button
        type="button"
        onClick={startAdd}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold sm:w-auto"
        style={{ background: "var(--ink)", color: "var(--bg)" }}
      >
        <Plus size={16} />
        Add
      </button>

      {open && (
        <section className="card space-y-3 p-4">
          <div className="text-sm font-semibold">{editing ? "Edit API key" : "Add API key"}</div>
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium" style={{ color: "var(--muted)" }}>
              AI model
            </span>
            <select
              value={form.provider}
              onChange={(e) => onPick(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5 text-sm"
              style={{ background: "var(--bg-2)", borderColor: "var(--line)", color: "var(--text)" }}
            >
              <option value="">Select an AI model</option>
              {BUILTIN_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
              <option value="custom">Custom</option>
              <option value="additional">Additional</option>
            </select>
          </label>

          {form.provider && (
            <>
              {isCustom && (
                <>
                  <Field
                    label="Service name"
                    value={form.label}
                    onChange={(v) => setForm((p) => ({ ...p, label: v }))}
                    placeholder="e.g. Local Llama, Azure OpenAI"
                  />
                  <Field
                    label="Model (optional)"
                    value={form.model}
                    onChange={(v) => setForm((p) => ({ ...p, model: v }))}
                    placeholder="Model id"
                  />
                  <Field
                    label="Base URL (optional)"
                    value={form.baseUrl}
                    onChange={(v) => setForm((p) => ({ ...p, baseUrl: v }))}
                    placeholder="OpenAI-compatible endpoint"
                  />
                </>
              )}
              {!isCustom && selected && (
                <Field
                  label="Model (optional)"
                  value={form.model}
                  onChange={(v) => setForm((p) => ({ ...p, model: v }))}
                  placeholder={selected.defaultModel}
                />
              )}
              <label className="block">
                <span className="mb-1 block text-[12px] font-medium" style={{ color: "var(--muted)" }}>
                  API key
                </span>
                <input
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={editing ? "Leave blank to keep the saved key" : selected?.placeholder || "API key"}
                  value={form.key}
                  onChange={(e) => setForm((p) => ({ ...p, key: e.target.value }))}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm"
                  style={{ background: "var(--bg-2)", borderColor: "var(--line)", color: "var(--text)" }}
                />
              </label>
              {error && (
                <p className="text-[12px]" style={{ color: "#dd7a2b" }}>
                  {error}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={save}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold"
                  style={{ background: "var(--ink)", color: "var(--bg)" }}
                >
                  {editing ? "Save Changes" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold"
                  style={{ background: "var(--bg-2)", border: "1px solid var(--line)" }}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </section>
      )}

      <section className="space-y-2">
        {rows.length === 0 && !open && (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            No keys yet. Tap Add, choose a model, then save.
          </p>
        )}
        {rows.map((entry, i) => {
          const active = aiVault.activeId === entry.id;
          return (
            <article key={entry.id} className="card flex items-center gap-3 px-3 py-3">
              <div
                className="w-7 shrink-0 text-center text-sm font-bold"
                style={{ color: "var(--muted)" }}
              >
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{entry.label}</div>
                <div className="truncate text-[12px]" style={{ color: "var(--muted)" }}>
                  {entry.model || "Default model"}
                  {entry.key ? ` · …${entry.key.slice(-4)}` : ""}
                </div>
              </div>
              <label className="shrink-0 text-[11px] font-semibold">
                <input
                  type="radio"
                  name="active-ai"
                  className="mr-1 align-middle"
                  checked={active}
                  onChange={() => setActiveAiKey(entry.id)}
                />
                Use
              </label>
              <button type="button" className="shrink-0 rounded-lg p-1.5" aria-label="Edit" onClick={() => startEdit(entry)}>
                <Pencil size={15} />
              </button>
              <button
                type="button"
                className="shrink-0 rounded-lg p-1.5"
                aria-label="Remove"
                onClick={() => removeAiKey(entry.id)}
              >
                <Trash2 size={15} />
              </button>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border px-3 py-2.5 text-sm"
        style={{ background: "var(--bg-2)", borderColor: "var(--line)", color: "var(--text)" }}
      />
    </label>
  );
}
