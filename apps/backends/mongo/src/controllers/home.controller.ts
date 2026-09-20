import { OK } from "../constants/https";
import { getHomeFeedService } from "../services/home.service";
import { catchError, ok } from "../utils";

export const getHomeHandler = catchError(
    async (req, res) => {
        const feed = await getHomeFeedService();
        return res.status(OK).json(ok(feed));
    }
);
