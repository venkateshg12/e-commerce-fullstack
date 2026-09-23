import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreateCategory } from "@/hooks/product/useCreateCategory";
import { useCreateSubCategory } from "@/hooks/product/useCreateSubCategory";
import { useDeleteCategory } from "@/hooks/product/useDeleteCategory";
import { useDeleteSubCategory } from "@/hooks/product/useDeleteSubCategory";
import { useUpdateCategory } from "@/hooks/product/useUpdateCategory";
import { useUpdateSubCategory } from "@/hooks/product/useUpdateSubCategory";
import type { Category } from "@/types/product.types";
import { Shapes, Tag } from "lucide-react";
import { useState } from "react";
import NameListEditor from "./NameListEditor";

type CategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
};

const CategoryDialog = ({ open, onOpenChange, categories }: CategoryDialogProps) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const createSubCategory = useCreateSubCategory();
  const updateSubCategory = useUpdateSubCategory();
  const deleteSubCategory = useDeleteSubCategory();

  // Fall back to the first category so the types pane is never blank when categories exist
  // (also covers the selected one being deleted).
  const selectedCategory =
    categories.find((category) => category._id === selectedCategoryId) ?? categories[0] ?? null;

  // Plain, non-optional locals instead of `selectedCategory?.x` inline in JSX: the React
  // Compiler's auto-memoization hoists the dependency check on an optional chain to a bare
  // (non-guarded) property read, which throws when `selectedCategory` is null. An `if` guards
  // the read itself instead of relying on `?.` surviving compilation.
  const selectedCategoryValueId = selectedCategory ? selectedCategory._id : undefined;
  const selectedCategoryName = selectedCategory ? selectedCategory.name : "";
  const selectedCategoryTypes = selectedCategory ? selectedCategory.subCategories ?? [] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-2xl md:max-w-3xl max-h-[90vh] overflow-y-auto font-poppins">
        <DialogHeader className="space-y-1">
          <DialogTitle className="font-poppins text-lg">Manage Categories</DialogTitle>
          <DialogDescription className="font-poppins">
            Pick a category to manage its types. Anything still used by a product can't be deleted.
          </DialogDescription>
        </DialogHeader>

        {/* Both panes are built the same way — a title row of fixed height, the add form, a
            five-row list box and its pager — so the two columns line up line for line. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <section className="flex flex-col gap-3 min-w-0">
            <div className="flex h-6 items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">Categories</h3>
              <span className="text-xs text-muted-foreground">{categories.length}</span>
            </div>
            <NameListEditor
              key={String(open)}
              items={categories}
              noun="category"
              icon={Tag}
              emptyLabel="No categories yet. Add one, e.g. Men or Women."
              selectedId={selectedCategoryValueId}
              onSelect={setSelectedCategoryId}
              onCreate={async (name) => {
                const response = await createCategory.mutateAsync({ name });
                setSelectedCategoryId(response.data._id);
              }}
              onRename={(categoryId, name) => updateCategory.mutateAsync({ categoryId, data: { name } })}
              onDelete={(categoryId) => deleteCategory.mutateAsync(categoryId)}
            />
          </section>

          <section className="flex flex-col gap-3 min-w-0 border-t pt-4 md:border-t-0 md:border-l md:pl-6 md:pt-0">
            <div className="flex h-6 items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {selectedCategory ? `Types in ${selectedCategoryName}` : "Types"}
              </h3>
              <span className="text-xs text-muted-foreground">{selectedCategoryTypes.length}</span>
            </div>
            {/* Keyed on the category so a half-typed name doesn't carry over to another one. */}
            <NameListEditor
              key={`${open}:${selectedCategoryValueId ?? "none"}`}
              items={selectedCategoryTypes}
              noun="type"
              icon={Shapes}
              disabled={!selectedCategory}
              emptyLabel={
                selectedCategory
                  ? `No types in ${selectedCategoryName} yet, e.g. Shirt, Jeans.`
                  : "Add a category first."
              }
              onCreate={(name) =>
                selectedCategoryValueId
                  ? createSubCategory.mutateAsync({ name, category: selectedCategoryValueId })
                  : Promise.resolve()
              }
              onRename={(subCategoryId, name) => updateSubCategory.mutateAsync({ subCategoryId, data: { name } })}
              onDelete={(subCategoryId) => deleteSubCategory.mutateAsync(subCategoryId)}
            />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryDialog;
