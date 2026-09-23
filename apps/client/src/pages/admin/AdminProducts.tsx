import BrandDialog from "@/components/admin/products/BrandDialog";
import CategoryDialog from "@/components/admin/products/CategoryDialog";
import ProductDialog from "@/components/admin/products/ProductDialog";
import ProductTable from "@/components/admin/products/ProductTable";
import ProductToolbar from "@/components/admin/products/ProductToolbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AdminPager from "@/components/admin/AdminPager";
import useAdminProduct from "@/hooks/product/useAdminProduct";
import { ADMIN_PRODUCTS_PAGE_SIZE } from "@/hooks/product/useGetProducts";

const AdminProducts = () => {
    const {
        search,
        setSearch,
        products,
        categories,
        brands,
        refreshAll,
        categoryDialogOpen,
        setCategoryDialogOpen,
        brandDialogOpen,
        setBrandDialogOpen,
        productDialogOpen,
        setProductDialogOpen,
        openCreateDialog,
        openEditDialog,
        closeProductDialog,
        editingProduct,
        openCategoryDialog,
        page,
        totalProducts,
        hasNextPage,
        hasPreviousPage,
        goToNextPage,
        goToPreviousPage,
    }
        = useAdminProduct();
    return (
        <div className="page-wrap">
            <Card className="card-class">
                <CardHeader className="card-header-class">
                    <CardTitle className="card-title-class">
                        Products
                    </CardTitle>
                    <ProductToolbar
                        search={search}
                        onSearchChange={setSearch}
                        onManageCategories={openCategoryDialog}
                        onManageBrands={() => setBrandDialogOpen(true)}
                        onAddProduct={openCreateDialog}
                    />
                </CardHeader>
                <CardContent className="card-content-class">
                    <ProductTable 
                        products={products}
                        onEdit={openEditDialog}
                    />
                    <AdminPager
                        page={page}
                        pageSize={ADMIN_PRODUCTS_PAGE_SIZE}
                        total={totalProducts}
                        hasNextPage={hasNextPage}
                        hasPreviousPage={hasPreviousPage}
                        onNext={goToNextPage}
                        onPrevious={goToPreviousPage}
                    />
                    </CardContent>
            </Card>
            <CategoryDialog
                open={categoryDialogOpen}
                onOpenChange={setCategoryDialogOpen}
                categories={categories}
            />
            <BrandDialog
                open={brandDialogOpen}
                onOpenChange={setBrandDialogOpen}
                brands={brands}
            />
            <ProductDialog
                open={productDialogOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        closeProductDialog();
                    } else {
                        setProductDialogOpen(true);
                    }
                }}
                product={editingProduct}
                categories={categories}
                brands={brands}
                onSaved={refreshAll}
            />

        </div>
    )
}

export default AdminProducts;
