import { AlertPopup } from "@/components/ui/alert-popup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

type NamedItem = {
    _id: string;
    name: string;
};

type NameListEditorProps = {
    items: NamedItem[];
    // Singular label used in placeholders and messages, e.g. "brand", "type".
    noun: string;
    icon: LucideIcon;
    emptyLabel: string;
    onCreate: (name: string) => Promise<unknown>;
    onRename: (id: string, name: string) => Promise<unknown>;
    onDelete: (id: string) => Promise<unknown>;
    // When given, rows are selectable (the category pane drives the types pane).
    selectedId?: string | null;
    onSelect?: (id: string) => void;
    disabled?: boolean;
};

type PopupState =
    | { kind: "confirm"; item: NamedItem }
    | { kind: "error"; title: string; description: string };

// Five rows fill the list box exactly, so the pane is the same height on every page and whether
// or not it has anything in it — nothing below it shifts as items come and go.
const PAGE_SIZE = 5;

const getErrorMessage = (error: unknown) =>
    (error as { message?: string } | null)?.message || "Something went wrong. Please try again.";

const NameListEditor = ({
    items,
    noun,
    icon: Icon,
    emptyLabel,
    onCreate,
    onRename,
    onDelete,
    selectedId,
    onSelect,
    disabled = false,
}: NameListEditorProps) => {
    const [name, setName] = useState("");
    const [editing, setEditing] = useState<NamedItem | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [popup, setPopup] = useState<PopupState | null>(null);
    const [page, setPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    // Clamped by derivation rather than an effect: deleting the last row on the last page
    // shrinks totalPages, and this corrects in the same render instead of showing a blank page.
    const currentPage = Math.min(page, totalPages);
    const rangeStart = (currentPage - 1) * PAGE_SIZE;
    const visibleItems = items.slice(rangeStart, rangeStart + PAGE_SIZE);

    const resetInput = () => {
        setName("");
        setEditing(null);
    };

    async function handleSave() {
        const trimmed = name.trim();
        if (!trimmed) return;

        try {
            setSaving(true);
            if (editing) {
                await onRename(editing._id, trimmed);
            } else {
                await onCreate(trimmed);
            }
            resetInput();
        } catch (error) {
            setPopup({ kind: "error", title: `Couldn't save ${noun}`, description: getErrorMessage(error) });
        } finally {
            setSaving(false);
        }
    }

    async function handleConfirmDelete(item: NamedItem) {
        try {
            setDeleting(true);
            await onDelete(item._id);
            if (editing?._id === item._id) resetInput();
            setPopup(null);
        } catch (error) {
            setPopup({ kind: "error", title: `Can't delete "${item.name}"`, description: getErrorMessage(error) });
        } finally {
            setDeleting(false);
        }
    }

    return (
        <div className="flex flex-col gap-3">
            <form
                className="flex items-center gap-2"
                onSubmit={(event) => {
                    event.preventDefault();
                    handleSave();
                }}
            >
                <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={editing ? `Rename ${noun}…` : `Add a ${noun}…`}
                    disabled={disabled}
                    className="flex-1 font-poppins"
                />
                <Button
                    type="submit"
                    className="cursor-pointer font-poppins min-w-19"
                    disabled={disabled || saving || !name.trim()}
                >
                    {saving ? "Saving..." : editing ? "Update" : "Add"}
                </Button>
                {editing && (
                    <Button type="button" variant="outline" onClick={resetInput} className="cursor-pointer font-poppins">
                        Cancel
                    </Button>
                )}
            </form>

            {/* Exactly five row slots tall, always — the empty state fills the same box. */}
            <div className="h-65 rounded-xl border border-border/70 bg-muted/20 p-2">
                {items.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
                        <Icon className="w-7 h-7 opacity-60" />
                        {emptyLabel}
                    </div>
                ) : (
                    <ul className="flex flex-col gap-1.5">
                        {visibleItems.map((item) => {
                            const selected = selectedId === item._id;
                            return (
                                <li
                                    key={item._id}
                                    className={cn(
                                        "flex h-11 items-center justify-between gap-2 rounded-lg border bg-card pl-3 pr-1 shadow-xs transition-colors",
                                        onSelect && "cursor-pointer hover:border-primary/50",
                                        selected ? "border-primary bg-primary/5" : "border-border",
                                        editing?._id === item._id && "ring-2 ring-primary/30"
                                    )}
                                    onClick={() => onSelect?.(item._id)}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <Icon className={cn("w-4 h-4 shrink-0", selected ? "text-primary" : "text-muted-foreground")} />
                                        <span className="font-medium text-sm truncate font-poppins">{item.name}</span>
                                    </div>
                                    <div className="flex items-center shrink-0">
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            aria-label={`Rename ${item.name}`}
                                            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                setEditing(item);
                                                setName(item.name);
                                            }}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            aria-label={`Delete ${item.name}`}
                                            className="h-8 w-8 text-muted-foreground hover:text-rose-600 cursor-pointer"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                setPopup({ kind: "confirm", item });
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* Always rendered, even with nothing to page through, so the two panes line up and
                the dialog keeps its height. */}
            <nav
                className="flex h-8 items-center justify-between gap-2"
                aria-label={`${noun} pages`}
            >
                <p className="text-xs text-muted-foreground font-poppins">
                    {items.length === 0
                        ? `No ${noun}s yet`
                        : `Showing ${rangeStart + 1}–${rangeStart + visibleItems.length} of ${items.length}`}
                </p>

                <div className="flex items-center gap-1">
                    <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        aria-label={`Previous page of ${noun}s`}
                        className="cursor-pointer"
                        disabled={currentPage === 1}
                        onClick={() => setPage(currentPage - 1)}
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>

                    <span className="min-w-12 text-center text-xs text-muted-foreground font-poppins">
                        {currentPage} / {totalPages}
                    </span>

                    <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        aria-label={`Next page of ${noun}s`}
                        className="cursor-pointer"
                        disabled={currentPage === totalPages}
                        onClick={() => setPage(currentPage + 1)}
                    >
                        <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </nav>

            {popup?.kind === "confirm" && (
                <AlertPopup
                    isOpen
                    type="warning"
                    title={`Delete "${popup.item.name}"?`}
                    description={`This ${noun} will be removed permanently.`}
                    actionLabel="Delete"
                    onAction={() => handleConfirmDelete(popup.item)}
                    isActionPending={deleting}
                    onClose={() => !deleting && setPopup(null)}
                />
            )}
            {popup?.kind === "error" && (
                <AlertPopup
                    isOpen
                    type="error"
                    title={popup.title}
                    description={popup.description}
                    onClose={() => setPopup(null)}
                />
            )}
        </div>
    );
};

export default NameListEditor;
