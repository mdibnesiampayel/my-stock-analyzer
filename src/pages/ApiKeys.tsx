import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { BUILTIN_PROVIDERS } from "../lib/aiProviders";
import { useStore } from "../lib/store";
import type { AiKey } from "../types";

export default function ApiKeys() {
  const { aiVault, upsertAiKey, removeAiKey, setActiveAiKey } = useStore();
  const [drafts, setDrafts] = useState<Record<string, { key: string; model: string }>>({});
  const [custom, setCustom] = useState({ label: "", key: "", model: "", baseUrl: "" });
  const [notice, setNotice] = useState<string | null>(null);

  const byId = useMemo(() => new Map(aiVault.keys.map((k) => [k.id, k])), [aiVault.keys]);
  const customKeys = aiVault.keys.filter((k) => k.provider === "custom");
  const savedCount = aiVault.keys.length;

  const saveBuiltin = (id: string) => {
    const def = BUILTIN_PROVIDERS.find((p) => p.id === id);
    if (!def) return;
    const draft = drafts[id] || { key: "", model: "" };
    const existing = byId.get(id);
    const key = draft.key.trim() || existing?.key || "";
    if (!key) {
      setNotice("Paste an API key before saving.");
      return;
    }
    upsertAiKey({
      id,
      provider: id,
      label: def.label,
      key,
      model: (draft.model.trim() || existing?.model || def.defaultModel).trim(),
      baseUrl: def.defaultBaseUrl,
    });
    setDrafts((p) => ({ ...p, [id]: { key: "", model: draft.model } }));
    setNotice(`${def.label} key saved on this device.`);
  };

  const addCustom = () => {
    const label = custom.label.trim();
    const key = custom.key.trim();
    if (!label || !key) {
      setNotice("Custom services need a name and an API key.");
      return;
    }
    const id = `custom-${Date.now().toString(36)}`;
    upsertAiKey({
      id,
      provider: "custom",
      label,
      key,
      model: custom.model.trim() || undefined,
      baseUrl: custom.baseUrl.trim() || undefined,
    });
    setCustom({ label: "", key: "", model: "", baseUrl: "" });
    setNotice(`${label} added. You can keep adding more keys.`);
  };

  return (
    <div className="space-y-5">
      <div>
        <Link to="/settings" className="inline-flex items-center gap-1 text-sm font-semibold">
          <ArrowLeft size={16} /> Settings
        </Link>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight">API keys</h1>
        <p className="max-w-2xl text-sm" style={{ color: "var(--muted)" }}>
          Keys stay on this device and are sent only when you run Analyze This Stock. They are never written to git or
          logged. Analysis still works from public filings if no key is set.
        </p>
        <p className="mt-1 text-[12px]" style={{ color: "var(--muted)" }}>
          {savedCount ? `${savedCount} key${savedCount === 1 ? "" : "s"} saved` : "No keys saved yet"}
          {aiVault.activeId ? " · one is selected for analysis" : ""}
        </p>
      </div>

      {notice && (
        <div className="card px-4 py-3 text-sm">
          {notice}
          <button type="button" className="ml-3 text-[12px] font-semibold" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      )}

      <section className="space-y-2">
        <h2 className="text-[16px] font-semibold">Popular AI services</h2>
        <p className="text-[12px]" style={{ color: "var(--muted)" }}>
          Fill any slot you use. Select one as the analysis provider.
        </p>
        <div className="grid gap-3 lg:grid-cols-2">
          {BUILTIN_PROVIDERS.map((p) => {
            const saved = byId.get(p.id);
            const draft = drafts[p.id] || { key: "", model: saved?.model || "" };
            const active = aiVault.activeId === p.id;
            return (
              <article key={p.id} className="card space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{p.label}</div>
                    <div className="text-[12px]" style={{ color: "var(--muted)" }}>
                      {p.hint}
                      {saved ? ` · saved · …${saved.key.slice(-4)}` : ""}
                    </div>
                  </div>
                  {saved && (
                    <label className="flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold">
                      <input type="radio" name="active-ai" checked={active} onChange={() => setActiveAiKey(p.id)} />
                      Use
                    </label>
                  )}
                </div>
                <input
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={saved ? "Paste a new key to replace" : p.placeholder}
                  value={draft.key}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [p.id]: { ...draft, key: e.target.value } }))}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  style={{ background: "var(--bg-2)", borderColor: "var(--line)", color: "var(--text)" }}
                />
                <input
                  placeholder={`Model (default ${p.defaultModel})`}
                  value={draft.model}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [p.id]: { ...draft, model: e.target.value } }))}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  style={{ background: "var(--bg-2)", borderColor: "var(--line)", color: "var(--text)" }}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveBuiltin(p.id)}
                    className="rounded-xl px-3 py-2 text-sm font-semibold"
                    style={{ background: "var(--ink)", color: "var(--bg)" }}
                  >
                    Save
                  </button>
                  {saved && (
                    <button
                      type="button"
                      onClick={() => {
                        removeAiKey(p.id);
                        setNotice(`${p.label} key removed from this device.`);
                      }}
                      className="rounded-xl px-3 py-2 text-sm font-semibold"
                      style={{ background: "var(--bg-2)", border: "1px solid var(--line)" }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-[16px] font-semibold">Custom / additional</h2>
        <p className="text-[12px]" style={{ color: "var(--muted)" }}>
          For future models or any OpenAI-compatible endpoint. Add as many as you wish.
        </p>
        <div className="space-y-2">
          {customKeys.map((k) => (
            <CustomRow
              key={k.id}
              entry={k}
              active={aiVault.activeId === k.id}
              onUse={() => setActiveAiKey(k.id)}
              onSave={(next) => upsertAiKey(next)}
              onRemove={() => removeAiKey(k.id)}
            />
          ))}
        </div>
        <div className="card space-y-3 p-4">
          <div className="text-sm font-semibold">Add another service</div>
          <input
            placeholder="Name (e.g. Local Llama, Azure OpenAI)"
            value={custom.label}
            onChange={(e) => setCustom((p) => ({ ...p, label: e.target.value }))}
            className="w-full rounded-xl border px-3 py-2 text-sm"
            style={{ background: "var(--bg-2)", borderColor: "var(--line)", color: "var(--text)" }}
          />
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="API key"
            value={custom.key}
            onChange={(e) => setCustom((p) => ({ ...p, key: e.target.value }))}
            className="w-full rounded-xl border px-3 py-2 text-sm"
            style={{ background: "var(--bg-2)", borderColor: "var(--line)", color: "var(--text)" }}
          />
          <input
            placeholder="Model (optional)"
            value={custom.model}
            onChange={(e) => setCustom((p) => ({ ...p, model: e.target.value }))}
            className="w-full rounded-xl border px-3 py-2 text-sm"
            style={{ background: "var(--bg-2)", borderColor: "var(--line)", color: "var(--text)" }}
          />
          <input
            placeholder="Base URL (optional, OpenAI-compatible)"
            value={custom.baseUrl}
            onChange={(e) => setCustom((p) => ({ ...p, baseUrl: e.target.value }))}
            className="w-full rounded-xl border px-3 py-2 text-sm"
            style={{ background: "var(--bg-2)", borderColor: "var(--line)", color: "var(--text)" }}
          />
          <button
            type="button"
            onClick={addCustom}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold"
            style={{ background: "var(--ink)", color: "var(--bg)" }}
          >
            <Plus size={15} />
            Add key
          </button>
        </div>
      </section>
    </div>
  );
}

function CustomRow({
  entry,
  active,
  onUse,
  onSave,
  onRemove,
}: {
  entry: AiKey;
  active: boolean;
  onUse: () => void;
  onSave: (next: AiKey) => void;
  onRemove: () => void;
}) {
  const [model, setModel] = useState(entry.model || "");
  const [baseUrl, setBaseUrl] = useState(entry.baseUrl || "");
  const [key, setKey] = useState("");
  return (
    <article className="card space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{entry.label}</div>
          <div className="text-[12px]" style={{ color: "var(--muted)" }}>
            Custom · saved · …{entry.key.slice(-4)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold">
            <input type="radio" name="active-ai" checked={active} onChange={onUse} />
            Use
          </label>
          <button type="button" onClick={onRemove} className="rounded-lg p-1.5" aria-label="Remove key">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      <input
        type="password"
        autoComplete="off"
        placeholder="Paste a new key to replace"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        className="w-full rounded-xl border px-3 py-2 text-sm"
        style={{ background: "var(--bg-2)", borderColor: "var(--line)", color: "var(--text)" }}
      />
      <input
        placeholder="Model"
        value={model}
        onChange={(e) => setModel(e.target.value)}
        className="w-full rounded-xl border px-3 py-2 text-sm"
        style={{ background: "var(--bg-2)", borderColor: "var(--line)", color: "var(--text)" }}
      />
      <input
        placeholder="Base URL"
        value={baseUrl}
        onChange={(e) => setBaseUrl(e.target.value)}
        className="w-full rounded-xl border px-3 py-2 text-sm"
        style={{ background: "var(--bg-2)", borderColor: "var(--line)", color: "var(--text)" }}
      />
      <button
        type="button"
        onClick={() =>
          onSave({
            ...entry,
            key: key.trim() || entry.key,
            model: model.trim() || undefined,
            baseUrl: baseUrl.trim() || undefined,
          })
        }
        className="rounded-xl px-3 py-2 text-sm font-semibold"
        style={{ background: "var(--bg-2)", border: "1px solid var(--line)" }}
      >
        Update
      </button>
    </article>
  );
}
