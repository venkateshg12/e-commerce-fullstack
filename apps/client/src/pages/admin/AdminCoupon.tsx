import PromoDialogue from "@/components/admin/promo/PromoDialogue";
import PromoTable from "@/components/admin/promo/PromoTable";
import PromoToolbar from "@/components/admin/promo/PromoToolbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminPromo } from "@/hooks/promo/useAdminPromo";

const AdminCoupon = () => {
  const {
    search,
    setSearch,
    promos,
    loading,
    promoDialogOpen,
    setPromoDialogOpen,
    editingPromo,
    openCreateDialog,
    openEditDialog,
    closePromoDialog,
    savePromo,
    removePromo,
    saving,
    deletingPromoId,
  } = useAdminPromo();

  return (
    <div className="page-wrap">
      <Card className="card-class">
        <CardHeader className="card-header-class">
          <CardTitle className="card-title-class">
            Promotions & Coupons
          </CardTitle>
          <PromoToolbar
            search={search}
            onSearchChange={setSearch}
            onAddPromo={openCreateDialog}
          />
        </CardHeader>
        <CardContent className="card-content-class">
          <PromoTable
            promos={promos}
            loading={loading}
            onEdit={openEditDialog}
            onDelete={removePromo}
            deletingId={deletingPromoId}
          />
        </CardContent>
      </Card>

      <PromoDialogue
        open={promoDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closePromoDialog();
          } else {
            setPromoDialogOpen(true);
          }
        }}
        promo={editingPromo}
        saving={saving}
        onSave={savePromo}
      />
    </div>
  );
};

export default AdminCoupon;