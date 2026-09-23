import { useMemo, useRef, useState } from "react";
import { deleteBanner, getBanners, uploadBanners } from "@/api/settings";
import queryClient from "@/lib/queryClient";
import type { ApiError, FailureResponse, SuccessResponse, VerifiedResponse } from "@/types";
import type { AdminBannerResponse } from "@/types/settings.types";
import { useMutation, useQuery } from "@tanstack/react-query";

export function useAdminBanners() {
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const {
        data: bannersResponse,
        isLoading: loading,
        isError: isBannersError,
        isFetching,
        refetch,
    } = useQuery<SuccessResponse<AdminBannerResponse>, FailureResponse>({
        queryKey: ["admin-banners"],
        queryFn: getBanners,
        staleTime: 60 * 1000,
    });

    const uploadMutation = useMutation<SuccessResponse<VerifiedResponse>, ApiError, FormData>({
        mutationFn: uploadBanners,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
            // The storefront's hero slider reads banners from the home feed.
            queryClient.invalidateQueries({ queryKey: ["home"] });
            // Since banner processing happens asynchronously in BullMQ, trigger a delayed refetch
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
                queryClient.invalidateQueries({ queryKey: ["home"] });
            }, 3000);
            setFiles([]);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        },
    });

    const deleteMutation = useMutation<SuccessResponse<VerifiedResponse>, ApiError, string>({
        mutationFn: deleteBanner,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
            // The storefront's hero slider reads banners from the home feed.
            queryClient.invalidateQueries({ queryKey: ["home"] });
        },
    });

    const items = bannersResponse?.data?.items ?? [];
    const uploading = uploadMutation.isPending;

    const fileCountLabel = useMemo(() => {
        if (!files.length) return "No files selected";
        if (files.length === 1) return files[0].name;

        return `${files.length} files selected`;
    }, [files]);

    function refreshBanners() {
        return refetch();
    }

    function removeFile(index: number) {
        setFiles((prev) => {
            const next = prev.filter((_, idx) => idx !== index);
            if (next.length === 0 && fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            return next;
        });
    }

    function addFiles(newFiles: File[]) {
        if (!newFiles.length) return;
        setFiles((prev) => {
            const existingKeys = new Set(
                prev.map((f) => `${f.name}-${f.size}-${f.lastModified}`)
            );
            const filteredNew = newFiles.filter(
                (f) => !existingKeys.has(`${f.name}-${f.size}-${f.lastModified}`)
            );
            return [...prev, ...filteredNew];
        });
    }

    function handleUpload() {
        if (!files.length) {
            fileInputRef.current?.click();
            return;
        }

        const formData = new FormData();
        files.forEach((file) => formData.append("images", file));

        uploadMutation.mutate(formData);
    }

    return {
        items,
        files,
        setFiles,
        addFiles,
        removeFile,
        fileInputRef,
        fileCountLabel,
        loading,
        isBannersError,
        refreshBanners,
        isRefreshing: isFetching,
        handleUpload,
        uploading,
        isUploadError: uploadMutation.isError,
        uploadError: uploadMutation.error as ApiError | null,
        deleteBanner: (bannerId: string) => deleteMutation.mutate(bannerId),
        deletingBannerId: deleteMutation.isPending ? deleteMutation.variables : null,
        deleteError: deleteMutation.error as ApiError | null,
        isUploadSuccess: uploadMutation.isSuccess,
    };
}

export default useAdminBanners;
