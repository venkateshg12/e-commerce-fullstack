import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import useAdminSettings from "@/hooks/settings/useAdminSettings";
import { ImagePlus, RefreshCw, X } from "lucide-react";
import BannerTable from "@/components/admin/settings/BannerTable";

function SelectedFileItem({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string>("");

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const sizeLabel =
    file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${(file.size / 1024).toFixed(1)} KB`;

  return (
    <div className="selected-file-item-class">
      <div className="selected-file-info-class">
        <div className="selected-file-preview-class">
          {previewUrl ? (
            <img src={previewUrl} alt={file.name} className="image-class" />
          ) : null}
        </div>
        <span className="selected-file-name-class" title={file.name}>
          {file.name}
        </span>
        <span className="selected-file-size-class">({sizeLabel})</span>
      </div>

      <button
        type="button"
        title={`Remove ${file.name}`}
        aria-label={`Remove ${file.name}`}
        onClick={onRemove}
        className="file-remove-button-class"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

const AdminSettings = () => {
  const {
    items,
    files,
    addFiles,
    removeFile,
    fileInputRef,
    fileCountLabel,
    loading,
    isBannersError,
    refreshBanners,
    isRefreshing,
    handleUpload,
    uploading,
    isUploadError,
    uploadError,
    isUploadSuccess,
  } = useAdminSettings();

  return (
    <div className="page-wrap-class">
      <div className="content-container-class">
        <div className="upload-panel-class">
          <Card className="card-class">
            <CardHeader>
              <CardTitle className="card-title-class">
                Banner Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="card-content-class">
              <div className="upload-box-class">
                <div className="upload-icon-wrap-class">
                  <ImagePlus className="upload-icon-class" />
                </div>

                <div className="upload-text-wrap-class">
                  <p className="upload-heading-class">Upload HomePage Banner</p>
                  <p className="upload-subtext-class">PNG, JPG, WEBP up to 10MB</p>
                </div>

                <Input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="file-input-class"
                  onChange={(event) => {
                    addFiles(Array.from(event.target.files || []));
                    event.target.value = "";
                  }}
                />

                <p className="file-count-class">{fileCountLabel}</p>

                {files.length > 0 && (
                  <div className="selected-files-list-class">
                    {files.map((file, index) => (
                      <SelectedFileItem
                        key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                        file={file}
                        onRemove={() => removeFile(index)}
                      />
                    ))}
                  </div>
                )}

                {isUploadError && (
                  <div className="error-box-class">
                    {uploadError?.message || "Failed to upload banner. Please try again."}
                  </div>
                )}

                {isUploadSuccess && !files.length && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    Banner uploaded successfully! Processing in background...
                  </p>
                )}

                <Button
                  className="full-button-class cursor-pointer"
                  disabled={uploading}
                  onClick={() => handleUpload()}
                >
                  {uploading
                    ? "Uploading...."
                    : files.length === 0
                      ? "Choose & Upload Banners"
                      : `Upload ${files.length} Banner${files.length > 1 ? "s" : ""}`}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="card-class">
            <CardHeader className="flex flex-row items-center justify-between gap-3 table-header-class">
              <CardTitle className="card-title-class">
                Current HomePage Banners
              </CardTitle>
              <Button
                className="button-class cursor-pointer flex items-center gap-1.5"
                disabled={isRefreshing}
                onClick={() => refreshBanners()}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </Button>
            </CardHeader>

            <CardContent>
              {isBannersError ? (
                <div className="error-box-class">Failed to load banners.</div>
              ) : loading ? null : !items.length ? (
                <div className="empty-state-class">No banner upload yet!</div>
              ) : (
                <BannerTable items={items} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;