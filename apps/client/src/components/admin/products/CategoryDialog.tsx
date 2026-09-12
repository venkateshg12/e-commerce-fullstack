import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useCreateCategory } from "@/hooks/product/useCreateCategory";
import { useUpdateCategory } from "@/hooks/product/useUpdateCategory";
import type { Category } from "@/types/product.types";
import { ChevronLeft, ChevronRight, Pencil, Tag } from "lucide-react";
import { useEffect, useState } from "react";

type CategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onSaved: () => Promise<void>;
};

const CategoryDialog = ({ open, onOpenChange, categories, onSaved }: CategoryDialogProps) => {
  const [name, setName] = useState("");
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setItemsPerPage(5);
      } else {
        setItemsPerPage(10);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const totalPages = Math.max(1, Math.ceil(categories.length / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [categories.length, itemsPerPage, totalPages, currentPage]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCategories = categories.slice(startIndex, startIndex + itemsPerPage);

  async function handleSave() {
    if (!name.trim()) return;

    try {
      setSaving(true);

      if (editCategory) {
        await updateCategoryMutation.mutateAsync({
          categoryId: editCategory._id,
          data: { name: name.trim() },
        });
      } else {
        await createCategoryMutation.mutateAsync({
          name: name.trim(),
        });
      }

      setName("");
      setEditCategory(null);
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  const handleEdit = (getCurrentCategory: Category) => {
    setEditCategory(getCurrentCategory);
    setName(getCurrentCategory.name);
  };

  const handleCancelEdit = () => {
    setEditCategory(null);
    setName("");
  };

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setName("");
      setEditCategory(null);
      setCurrentPage(1);
    }

    onOpenChange(nextOpen);
  }

  const isSaving = saving || createCategoryMutation.isPending || updateCategoryMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-xl md:max-w-2xl font-poppins">
        <DialogHeader>
          <DialogTitle className="font-poppins text-lg">Manage Categories</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={editCategory ? "Edit category name..." : "Enter category name you want to add !!"}
              className="flex-1 font-poppins w-full"
            />
            <Button
              onClick={handleSave}
              className="cursor-pointer font-poppins min-w-19"
              disabled={isSaving || !name.trim()}
            >
              {isSaving ? "Saving..." : editCategory ? "Update" : "Add"}
            </Button>
            {editCategory && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEdit}
                className="cursor-pointer font-poppins"
              >
                Cancel
              </Button>
            )}
          </div>

          <Separator  />

          <div className="min-h-50">
            {categories.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm">
                <Tag className="w-8 h-8 mb-2 opacity-60" />
                No categories found.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {paginatedCategories.map((cat) => (
                  <div
                    key={cat._id}
                    className="flex items-center justify-between px-2 py-1 rounded-lg border border-slate-400  bg-card text-card-foreground shadow-xs hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 truncate pr-2">
                      <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm truncate font-poppins">{cat.name}</span>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                      onClick={() => handleEdit(cat)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {categories.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-sm text-muted-foreground">
              <span className="text-xs sm:text-sm font-poppins">
                Showing <span className="font-medium text-foreground">{startIndex + 1}</span>-
                <span className="font-medium text-foreground">
                  {Math.min(startIndex + itemsPerPage, categories.length)}
                </span>{" "}
                of <span className="font-medium text-foreground">{categories.length}</span> categories
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  className="h-8 px-2.5 cursor-pointer font-poppins text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Prev
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      type="button"
                      variant={currentPage === page ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="h-8 w-8 p-0 cursor-pointer font-poppins text-xs"
                    >
                      {page}
                    </Button>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  className="h-8 px-2.5 cursor-pointer font-poppins text-xs"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryDialog;
