import { OK } from "../constants/https";
import { createBannersService, deleteBannerService, getBannersService } from "../services/setting.service";
import { catchError, ok } from "../utils";

export const getBannersHandler = catchError(
    async (req, res) => {
        const banners = await getBannersService();
        return res.status(OK).json(ok({ items: banners }));
    }
);

export const deleteBannerHandler = catchError(
    async (req, res) => {
        const result = await deleteBannerService(req.params.id as string);
        return res.status(OK).json(ok(result));
    }
);

export const createBannersHandler = catchError(
    async (req, res) => {
        const files = (req.files || []) as Express.Multer.File[];
        const result = await createBannersService(req.userId!, files);
        return res.status(OK).json(ok(result));
    }
);

